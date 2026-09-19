/* ============================================================================
   Mal3abi front end (vanilla JS, no build step)

   Everything comes from the backend. Nothing is hard-coded.
   Settings live in appsettings/appsettings.js (window.APP_SETTINGS).

   API CONTRACT (JSON, camelCase, base = APP_SETTINGS.apiBase)
   - Lists can be a plain array or a paged object { items: [...] }.
   - Errors: any non-2xx. ProblemDetails ({ title, detail, errors }) or
     { message } is shown to the user. The app sends Accept-Language: ar|en,
     so you can localize error messages on the server.
   - Auth: same-origin HttpOnly session cookie; /auth/login starts the Auth Center
     redirect, /auth/me returns the signed-in profile, and POST /auth/logout ends it.
     Unsafe API requests include an anti-forgery token.

   PUBLIC
   GET  /courts?date=YYYY-MM-DD             -> [Court]  (active courts only)
   GET  /courts/{id}?date=YYYY-MM-DD        -> Court
   GET  /courts/{id}/slots?date=&duration=  -> [{ time:"18:00", status:"available|booked|blocked" }]
   POST /bookings { courtId, date, time, durationMinutes }
                                            -> { id, reference, status:"pending|confirmed" }
                                               409 when the slot was just taken
   GET  /matches                            -> [{ id, courtId, date, time, spotsLeft }]
   POST /matches/{id}/join
   GET  /auth/login?returnUrl=<local path>              -> Auth Center redirect
   POST /auth/logout                                    -> end API and Auth Center session
   GET  /auth/me                                        -> user (session cookie)
   GET  /locations   -> [{ id, nameAr, nameEn, areas:[{ id, nameAr, nameEn }] }]
                         Public and anonymous. Seed with Jordan's governorates
                         (Amman, Irbid, Zarqa, Balqa, Madaba, Karak, Tafilah,
                         Ma'an, Aqaba, Mafraq, Jerash, Ajloun) and their areas,
                         independently of which cities already have courts, so
                         the player filter can offer every city up front.

   OWNER (user.role = "owner")
   GET    /owner/stats                   -> { todayBookings, upcomingBookings, pendingBookings,
                                             weekRevenue, monthBookings }
   GET    /owner/courts                  -> [Court]  (includes hidden courts)
   POST   /owner/courts   <CourtPayload> -> Court
   PUT    /owner/courts/{id} <CourtPayload> -> Court
   DELETE /owner/courts/{id}
   POST   /owner/uploads  (multipart, field "file") -> { url }
   GET    /owner/courts/{id}/slots?date=&excludeBookingId= -> [{ time, status:"available|booked|blocked", customerName? }]
                         excludeBookingId is passed when rescheduling: treat
                         that booking's own current slot as available.
   PUT    /owner/courts/{id}/slots { date, times:["18:00"], blocked:true|false }
   GET    /owner/bookings?courtId=&status=&date=  -> [Booking]
   POST   /owner/bookings/{id}/confirm
   POST   /owner/bookings/{id}/cancel
   PUT    /owner/bookings/{id}  { date, time }  -> reschedules to a new date/time,
                         same court and duration. 409 if the new slot is taken.

   SHAPES
   User  = { id, name, email, phone, role:"player|owner" }
   Court = { id, nameAr, nameEn, descriptionAr, descriptionEn,
             cityId, cityAr, cityEn, areaId, areaAr, areaEn, addressAr, addressEn,
             lat, lng,                          // numbers or null
             type:"indoor|outdoor|hall", format:5|7|11 (players per side) or null,
             phone, whatsapp, images:[url], amenities:[code],
             prices:[{ minutes:60, price:25 }],
             rating, ratingCount,               // rating is null when there are no reviews
             openMatches,                       // number of open matches
             availableSlots:["18:00", ...],     // free start times for the requested ?date=
             isActive, openTime, closeTime, slotStepMinutes }
   CourtPayload = Court without id, the city/area names, rating, ratingCount,
                  openMatches and availableSlots. It keeps cityId and areaId.
   Booking = { id, courtId, courtNameAr, courtNameEn, customerName, customerPhone,
               date, time, durationMinutes, amount, status:"pending|confirmed|cancelled" }
   Amenity codes: parking, lights, showers, lockers, cafe, wifi, ballRental, firstAid, seating
   Court type "hall" is a صالة (an indoor sports hall building), distinct from
   an open-air "outdoor" pitch and a covered-but-open "indoor" pitch.
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Config                                                              */
  /* ------------------------------------------------------------------ */
  const SETTINGS = window.APP_SETTINGS || {};
  const API_BASE = String(SETTINGS.apiBase || 'http://localhost:5000/api').replace(/\/+$/, '');
  const AUTH_BASE = String(SETTINGS.authBase || 'https://localhost:44493').replace(/\/+$/, '');
  const MAX_BOOKING_DAYS = Number(SETTINGS.maxBookingDays) > 0 ? Number(SETTINGS.maxBookingDays) : 30;
  const OWNER_CONTACTS = Array.isArray(SETTINGS.ownerContacts) ? SETTINGS.ownerContacts : [];
  const STORAGE = { lang: 'mal3abi_lang', token: 'mal3abi_token', user: 'mal3abi_user' };
  const AMENITIES = ['parking', 'lights', 'showers', 'lockers', 'cafe', 'wifi', 'ballRental', 'firstAid', 'seating'];
  const COURT_TYPES = ['indoor', 'outdoor', 'hall'];
  const TYPE_BADGE_CLASS = { indoor: 'blue', outdoor: 'green', hall: 'gold' };
  const FORMATS = [5, 6, 7, 8, 11];
  const DURATIONS = [60, 90, 120];
  const TIME_WINDOWS = { morning: [0, 720], afternoon: [720, 1020], evening: [1020, 1440] };
  const DASH_TABS = ['overview', 'courts', 'availability', 'bookings'];

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const app = $('#root');

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  const pad = n => String(n).padStart(2, '0');
  const dateStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function jordanTimeParts() {
    return Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  }
  function todayStr() { const p = jordanTimeParts(); return `${p.year}-${p.month}-${p.day}`; }
  function addDays(str, n) {
    const [y, m, d] = str.split('-').map(Number);
    return dateStr(new Date(y, m - 1, d + n));
  }
  function toMinutes(hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + (m || 0);
  }
  function nowMinutes() { const p = jordanTimeParts(); return Number(p.hour) * 60 + Number(p.minute); }
  function clampDate(str) {
    const today = todayStr();
    const max = addDays(today, MAX_BOOKING_DAYS);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str || '')) return today;
    return str < today ? today : str > max ? max : str;
  }
  function formatDate(str) {
    if (!str) return '';
    const [y, m, d] = str.split('-').map(Number);
    const locale = state.lang === 'ar' ? 'ar-JO-u-nu-latn' : 'en-GB';
    return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d));
  }
  function norm(value) {
    return String(value ?? '').toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ').trim();
  }
  function numOrNull(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function asList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  }
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const num = (v, fallback) => (v === null || v === undefined ? fallback : v);
  const idValue = v => (/^\d+$/.test(String(v)) ? Number(v) : v);
  const telNumber = phone => String(phone || '').replace(/[^\d+]/g, '');
  function waNumber(phone) {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    else if (digits.startsWith('0')) digits = `962${digits.slice(1)}`;
    return digits;
  }
  const validPhone = s => /^\+?\d{8,15}$/.test(String(s).replace(/[\s()-]/g, ''));
  function debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  }

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage is full or blocked */ } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
  };

  /* ------------------------------------------------------------------ */
  /* Translations                                                        */
  /* ------------------------------------------------------------------ */
  const L = {
    ar: {
      title: 'ملعبي | تطبيق الملاعب', brand: 'ملعبي', menu: 'القائمة', matches: 'المباريات',
      addCourt: 'أضف ملعبك', addCourtIntro: 'تواصل مع إدارة الملاعب للبدء بإضافة ملعبك.',
      contactsMissing: 'لم تُضف بيانات التواصل بعد.', callNow: 'اتصل الآن', whatsapp: 'واتساب',
      dashboard: 'لوحة التحكم', login: 'تسجيل الدخول', register: 'إنشاء حساب', logout: 'تسجيل الخروج',
      back: 'رجوع', close: 'إغلاق', save: 'حفظ التغييرات', saving: 'جارٍ الحفظ…', cancel: 'إلغاء',
      edit: 'تعديل', remove: 'إزالة', deleteBtn: 'حذف', retry: 'إعادة المحاولة', loading: 'جارٍ التحميل…',
      currency: 'JOD',
      errorGeneric: 'حدث خطأ غير متوقع. حاول مرة أخرى.', invalidCredentials: 'البريد الإلكتروني أو اسم المستخدم أو كلمة المرور غير صحيحة.', accessDenied: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.', notFound: 'العنصر المطلوب غير موجود.',
      errorNetwork: 'تعذّر الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى.',
      sessionExpired: 'انتهت الجلسة. سجّل الدخول من جديد.', loadError: 'تعذّر تحميل البيانات',
      heroTitle: 'احجز ملعب كرة القدم',
      heroSubtitle: 'ابحث حسب المدينة والمنطقة والتاريخ والوقت، ثم احجز في ثوانٍ.',
      statCourts: 'ملاعب', statAreas: 'مناطق', statMatches: 'مباريات مفتوحة',
      filtersLabel: 'فلاتر البحث', search: 'بحث', searchPlaceholder: 'اسم الملعب أو المدينة أو المنطقة',
      city: 'المدينة', allCities: 'جميع المدن', area: 'المنطقة', allAreas: 'جميع المناطق',
      chooseCityFirst: 'اختر المدينة أولاً', date: 'التاريخ', time: 'الوقت', anyTime: 'أي وقت',
      time_now: 'الآن', time_now_hint: 'مواعيد تبدأ من الآن فصاعداً',
      time_morning: 'صباحاً', time_morning_hint: 'قبل 12:00',
      time_afternoon: 'ظهراً', time_afternoon_hint: '12:00 – 17:00',
      time_evening: 'مساءً', time_evening_hint: 'بعد 17:00',
      onlyAvailable: 'ملاعب فيها مواعيد متاحة', openMatches: 'مباريات مفتوحة',
      moreFilters: 'مزيد من الفلاتر', fewerFilters: 'إخفاء الفلاتر',
      type: 'نوع الملعب', allTypes: 'جميع الأنواع', indoor: 'مغلق', outdoor: 'خارجي', hall: 'صالة',
      format: 'حجم الملعب', anyFormat: 'أي حجم',
      minPrice: 'أقل سعر للساعة', maxPrice: 'أعلى سعر للساعة', rating: 'التقييم', anyRating: 'أي تقييم',
      amenities: 'المرافق', sort: 'ترتيب حسب', sortRating: 'الأعلى تقييماً', sortEarliest: 'أقرب موعد متاح',
      sortLow: 'السعر: من الأقل', sortHigh: 'السعر: من الأعلى', sortName: 'الاسم', reset: 'إعادة الضبط',
      results: n => (n === 1 ? 'ملعب واحد' : n === 2 ? 'ملعبان' : n <= 10 ? `${n} ملاعب` : `${n} ملعباً`),
      am_parking: 'موقف سيارات', am_lights: 'إضاءة', am_showers: 'دشات', am_lockers: 'غرف تبديل',
      am_cafe: 'كافتيريا', am_wifi: 'واي فاي', am_ballRental: 'تأجير كرات', am_firstAid: 'إسعافات أولية',
      am_seating: 'مقاعد للجمهور',
      freeSlots: n => (n === 1 ? 'موعد واحد متاح' : n === 2 ? 'موعدان متاحان' : n <= 10 ? `${n} مواعيد متاحة` : `${n} موعداً متاحاً`),
      nextSlot: 'أقرب موعد {time}', noSlots: 'لا توجد مواعيد متاحة', newBadge: 'جديد',
      details: 'عرض التفاصيل', bookNow: 'احجز الآن',
      openMatchesBadge: n => (n === 1 ? 'مباراة مفتوحة' : n === 2 ? 'مباراتان مفتوحتان' : n <= 10 ? `${n} مباريات مفتوحة` : `${n} مباراة مفتوحة`),
      emptyNoCourtsTitle: 'لا توجد ملاعب بعد', emptyNoCourtsText: 'ستظهر الملاعب هنا عند إضافتها.',
      emptyNoMatchTitle: 'لا توجد ملاعب مطابقة', emptyNoMatchText: 'جرّب تغيير الفلاتر أو التاريخ.',
      loadCourtsError: 'تعذّر تحميل الملاعب',
      courtNotFound: 'الملعب غير موجود', facilities: 'المرافق', prices: 'الأسعار',
      availableTimes: 'المواعيد المتاحة', noSlotsDay: 'لا توجد مواعيد في هذا اليوم.',
      contactBooking: 'للتواصل والحجز', location: 'الموقع على الخريطة', directions: 'فتح الاتجاهات',
      mapNote: 'استخدم الخريطة للوصول إلى الملعب بسهولة.',
      legendAvailable: 'متاح', legendBooked: 'محجوز', legendBlocked: 'مغلق', legendPast: 'انتهى وقته',
      booking: 'حجز', duration: 'المدة', noSlotsFor: 'لا توجد مواعيد متاحة لهذا التاريخ والمدة.',
      total: 'المجموع', confirmBooking: 'تأكيد الحجز', bookingSending: 'جارٍ الحجز…',
      bookingDone: 'تم الحجز. رقم الحجز: {ref}',
      bookingPending: 'وصل طلب الحجز وينتظر تأكيد الملعب. الرقم: {ref}',
      slotTaken: 'هذا الموعد لم يعد متاحاً. اختر موعداً آخر.', noPrices: 'هذا الملعب لا يقبل الحجز حالياً.',
      name: 'الاسم الكامل', username: 'اسم المستخدم', email: 'البريد الإلكتروني', loginIdentifier: 'البريد الإلكتروني أو اسم المستخدم', phone: 'رقم الهاتف', password: 'كلمة المرور', age: 'العمر', photoUrl: 'رابط الصورة (اختياري)',
      passwordHint: '8 أحرف على الأقل', phoneInvalid: 'أدخل رقم هاتف صحيح.',
      noAccount: 'ليس لديك حساب؟', haveAccount: 'لديك حساب؟', welcome: 'أهلاً {name}!',
      matchTitle: 'مباريات متاحة للانضمام ⚡', matchSub: 'انضم إلى مباراة قائمة دون حجز الملعب كاملاً.',
      join: 'انضم إلى المباراة', joined: 'تم الانضمام إلى المباراة!', matchFull: 'مكتملة',
      spotsLeft: n => (n === 1 ? 'مقعد واحد متاح' : n === 2 ? 'مقعدان متاحان' : n <= 10 ? `${n} مقاعد متاحة` : `${n} مقعداً متاحاً`),
      noMatchesTitle: 'لا توجد مباريات مفتوحة حالياً', noMatchesText: 'ارجع لاحقاً أو احجز ملعباً وابدأ مباراتك.',
      needOwner: 'هذه الصفحة لأصحاب الملاعب فقط.',
      adminOverview: 'إدارة المنصة', adminUsers: 'العملاء واللاعبون', adminCourts: 'الملاعب', adminOwners: 'أصحاب الملاعب', adminAddOwners: 'إضافة صاحب ملعب', adminAdmins: 'مديرو المنصة', adminAddSuperAdmin: 'دعوة مدير منصة', adminMenu: 'قائمة الإدارة',
      adminAccounts: 'الحسابات', adminPlayers: 'اللاعبون', adminOwnerCount: 'أصحاب الملاعب', adminCourtCount: 'الملاعب', adminActiveSummary: '{active} من {all} نشط', adminBookings: 'الحجوزات', adminRevenue: 'الإيرادات المؤكدة',
      adminCustomersHeading: 'العملاء واللاعبون', adminCourtsHeading: 'الملاعب', adminAll: 'الكل', adminDetails: 'التفاصيل', adminRole: 'نوع الحساب', adminNoUsers: 'لا توجد حسابات.', adminNoCourts: 'لا توجد ملاعب.',
      adminCreateOwnerHeading: 'دعوة صاحب ملعب', adminCurrentOwners: 'أصحاب الملاعب الحاليون', adminCreateOwnerAction: 'إرسال دعوة لصاحب الملعب', adminOwnerCreated: 'تم إرسال الدعوة إلى البريد الإلكتروني.', adminCreateSuperAdminHeading: 'دعوة مدير منصة', adminCreateSuperAdminAction: 'إرسال دعوة المدير', adminSuperAdminCreated: 'تم إرسال دعوة مدير المنصة.', adminLoadError: 'تعذّر تحميل بيانات الإدارة',
      adminReference: 'رقم الحجز', adminDate: 'التاريخ', adminAmount: 'المبلغ', adminStatus: 'الحالة', adminActive: 'نشط', adminInactive: 'غير نشط', adminBackUsers: 'العودة إلى الحسابات', adminAccessRequired: 'هذه الصفحة مخصصة لمدير المنصة.',
      role_superadmin: 'مدير المنصة', role_owner: 'صاحب ملعب', role_player: 'لاعب',
      tab_overview: 'نظرة عامة', tab_courts: 'ملاعبي', tab_availability: 'المواعيد', tab_bookings: 'الحجوزات',
      greeting: 'مرحباً {name} 👋',
      statToday: 'حجوزات اليوم', statUpcoming: 'حجوزات قادمة', statPending: 'بانتظار التأكيد',
      statWeek: 'إيرادات الأسبوع', statMonth: 'حجوزات الشهر',
      pendingRequests: 'طلبات بانتظار التأكيد', noPending: 'لا توجد طلبات معلّقة.',
      myCourts: 'ملاعبي', addNewCourt: 'إضافة ملعب',
      noOwnerCourtsTitle: 'لم تضف أي ملعب بعد', noOwnerCourtsText: 'أضف ملعبك الأول ليظهر للاعبين.',
      active: 'ظاهر للاعبين', hidden: 'مخفي', hide: 'إخفاء', show: 'إظهار',
      deleteCourt: 'حذف الملعب', deleteCourtText: 'سيتم حذف «{name}» نهائياً. لا يمكن التراجع عن هذا الإجراء.',
      yesDelete: 'نعم، احذف', courtSaved: 'تم حفظ الملعب.', courtDeleted: 'تم حذف الملعب.',
      courtVisible: 'الملعب ظاهر للاعبين الآن.', courtHidden: 'تم إخفاء الملعب عن اللاعبين.',
      editCourt: 'تعديل الملعب', newCourt: 'ملعب جديد',
      secBasics: 'المعلومات الأساسية', secLocation: 'الموقع', secContact: 'التواصل', secPricing: 'الأسعار',
      secHours: 'ساعات العمل والمواعيد', secPhotos: 'الصور', secFacilities: 'المرافق', secVisibility: 'الظهور',
      nameAr: 'اسم الملعب (عربي)', nameEn: 'اسم الملعب (إنجليزي)', descAr: 'الوصف (عربي)', descEn: 'الوصف (إنجليزي)',
      addressAr: 'العنوان (عربي)', addressEn: 'العنوان (إنجليزي)', lat: 'خط العرض', lng: 'خط الطول',
      coordsHint: 'اختياري. تُستخدم لعرض الخريطة والاتجاهات.',
      whatsappHint: 'اتركه فارغاً لاستخدام رقم الهاتف نفسه.',
      priceMinutes: 'المدة', priceValue: 'السعر (JOD)', addPrice: 'إضافة سعر',
      pricesHint: 'أضف سعراً لكل مدة حجز تقبلها.',
      openTime: 'يفتح الساعة', closeTime: 'يغلق الساعة', slotStep: 'بداية المواعيد كل', minutes: '{n} دقيقة',
      mainImage: 'الرئيسية', makeMain: 'اجعلها رئيسية', addImageUrl: 'إضافة بالرابط', uploadImage: 'رفع صورة',
      uploading: 'جارٍ رفع الصور…', imageInvalid: 'أدخل رابط صورة صحيح يبدأ بـ https://',
      uploadFailed: 'تعذّر رفع الصورة.', isActive: 'إظهار الملعب للاعبين',
      isActiveHint: 'أوقف هذا الخيار لإخفاء الملعب مؤقتاً دون حذفه.',
      locationsMissing: 'تعذّر تحميل المدن والمناطق',
      locationsMissingText: 'تحتاج المدن والمناطق لإضافة ملعب. اطلب من إدارة المنصة إضافتها.',
      selectCity: 'اختر المدينة', selectArea: 'اختر المنطقة', selectType: 'اختر النوع', notSpecified: 'غير محدد',
      errName: 'أدخل اسم الملعب بالعربية أو الإنجليزية.', errCity: 'اختر المدينة.', errArea: 'اختر المنطقة.',
      errType: 'اختر نوع الملعب.', errPhone: 'أدخل رقم هاتف صحيح للتواصل.',
      errPrices: 'أضف سعراً واحداً على الأقل، ولا تكرر المدة.', errHours: 'حدد ساعة الفتح وساعة الإغلاق.',
      errCoords: 'أدخل خط العرض وخط الطول معاً بقيم صحيحة، أو اتركهما فارغين.',
      pickCourt: 'الملعب', availabilityHint: 'اضغط على موعد متاح لإغلاقه، أو على موعد مغلق لإعادة فتحه.',
      closeAll: 'إغلاق كل المواعيد المتاحة', openAll: 'إعادة فتح المواعيد المغلقة',
      slotsUpdated: 'تم تحديث المواعيد.',
      col_customer: 'العميل', col_court: 'الملعب', col_when: 'الموعد', col_duration: 'المدة',
      col_amount: 'المبلغ', col_status: 'الحالة',
      st_pending: 'قيد المراجعة', st_confirmed: 'مؤكد', st_cancelled: 'ملغي',
      confirmAction: 'تأكيد', cancelBooking: 'إلغاء الحجز',
      cancelBookingText: 'هل أنت متأكد من إلغاء هذا الحجز؟ لا يمكن التراجع عن هذا الإجراء.',
      yesCancel: 'نعم، ألغِ الحجز', bookingConfirmed: 'تم تأكيد الحجز.', bookingCancelled: 'تم إلغاء الحجز.',
      allCourts: 'كل الملاعب', allStatuses: 'كل الحالات', noBookings: 'لا توجد حجوزات.', anyDate: 'كل التواريخ',
      reschedule: 'تعديل الموعد', rescheduleFor: 'تعديل موعد – {court}',
      confirmReschedule: 'حفظ الموعد الجديد', reschedulePending: 'جارٍ الحفظ…',
      rescheduleDone: 'تم تعديل موعد الحجز.', rescheduleTaken: 'هذا الموعد محجوز. اختر موعداً آخر.',
    },
    en: {
      title: 'Mal3abi | Courts App', brand: 'Mal3abi', menu: 'Menu', matches: 'Matches',
      addCourt: 'Add your court', addCourtIntro: 'Contact court management to start adding your court.',
      contactsMissing: 'Contact details have not been added yet.', callNow: 'Call now', whatsapp: 'WhatsApp',
      dashboard: 'Dashboard', login: 'Sign in', register: 'Create account', logout: 'Sign out',
      back: 'Back', close: 'Close', save: 'Save changes', saving: 'Saving…', cancel: 'Cancel',
      edit: 'Edit', remove: 'Remove', deleteBtn: 'Delete', retry: 'Try again', loading: 'Loading…',
      currency: 'JOD',
      errorGeneric: 'Something went wrong. Try again.', invalidCredentials: 'The email, username, or password is incorrect.', accessDenied: 'You do not have permission to do this.', notFound: 'The requested item was not found.',
      errorNetwork: 'Could not reach the server. Check your connection and try again.',
      sessionExpired: 'Your session expired. Sign in again.', loadError: 'Could not load the data',
      heroTitle: 'Book a football court',
      heroSubtitle: 'Search by city, area, date and time, then book in seconds.',
      statCourts: 'Courts', statAreas: 'Areas', statMatches: 'Open matches',
      filtersLabel: 'Search filters', search: 'Search', searchPlaceholder: 'Court name, city or area',
      city: 'City', allCities: 'All cities', area: 'Area', allAreas: 'All areas',
      chooseCityFirst: 'Choose a city first', date: 'Date', time: 'Time', anyTime: 'Any time',
      time_now: 'Now', time_now_hint: 'Slots starting from now',
      time_morning: 'Morning', time_morning_hint: 'Before 12:00',
      time_afternoon: 'Afternoon', time_afternoon_hint: '12:00 – 17:00',
      time_evening: 'Evening', time_evening_hint: 'After 17:00',
      onlyAvailable: 'Courts with free slots', openMatches: 'Open matches',
      moreFilters: 'More filters', fewerFilters: 'Fewer filters',
      type: 'Court type', allTypes: 'All types', indoor: 'Indoor', outdoor: 'Outdoor', hall: 'Hall',
      format: 'Pitch size', anyFormat: 'Any size',
      minPrice: 'Min price per hour', maxPrice: 'Max price per hour', rating: 'Rating', anyRating: 'Any rating',
      amenities: 'Facilities', sort: 'Sort by', sortRating: 'Highest rated', sortEarliest: 'Earliest free slot',
      sortLow: 'Price: low to high', sortHigh: 'Price: high to low', sortName: 'Name', reset: 'Reset filters',
      results: n => `${n} ${n === 1 ? 'court' : 'courts'}`,
      am_parking: 'Parking', am_lights: 'Floodlights', am_showers: 'Showers', am_lockers: 'Changing rooms',
      am_cafe: 'Cafe', am_wifi: 'Wi-Fi', am_ballRental: 'Ball rental', am_firstAid: 'First aid',
      am_seating: 'Spectator seating',
      freeSlots: n => `${n} free ${n === 1 ? 'slot' : 'slots'}`,
      nextSlot: 'Next {time}', noSlots: 'No free slots', newBadge: 'New',
      details: 'View details', bookNow: 'Book now',
      openMatchesBadge: n => `${n} open ${n === 1 ? 'match' : 'matches'}`,
      emptyNoCourtsTitle: 'No courts yet', emptyNoCourtsText: 'Courts will show up here once they are added.',
      emptyNoMatchTitle: 'No courts match your filters', emptyNoMatchText: 'Try changing the filters or the date.',
      loadCourtsError: 'Could not load courts',
      courtNotFound: 'Court not found', facilities: 'Facilities', prices: 'Prices',
      availableTimes: 'Available times', noSlotsDay: 'No slots on this day.',
      contactBooking: 'Contact and booking', location: 'Location on map', directions: 'Open directions',
      mapNote: 'Use the map to find the court easily.',
      legendAvailable: 'Available', legendBooked: 'Booked', legendBlocked: 'Closed', legendPast: 'Time passed',
      booking: 'Booking', duration: 'Duration', noSlotsFor: 'No free times for this date and duration.',
      total: 'Total', confirmBooking: 'Confirm booking', bookingSending: 'Booking…',
      bookingDone: 'Booking confirmed. Reference: {ref}',
      bookingPending: 'Booking request sent. Waiting for the court to confirm. Reference: {ref}',
      slotTaken: 'That time was just taken. Pick another one.', noPrices: 'This court is not taking bookings right now.',
      name: 'Full name', username: 'Username', email: 'Email address', loginIdentifier: 'Email or username', phone: 'Phone number', password: 'Password', age: 'Age', photoUrl: 'Photo URL (optional)',
      passwordHint: 'At least 8 characters', phoneInvalid: 'Enter a valid phone number.',
      noAccount: 'New here?', haveAccount: 'Already have an account?', welcome: 'Welcome, {name}!',
      matchTitle: 'Matches open to join ⚡', matchSub: 'Join an existing game without booking a whole court.',
      join: 'Join match', joined: 'You joined the match!', matchFull: 'Full',
      spotsLeft: n => `${n} ${n === 1 ? 'spot' : 'spots'} left`,
      noMatchesTitle: 'No open matches right now', noMatchesText: 'Check back later, or book a court and start your own.',
      needOwner: 'This page is for court owners only.',
      emailVerificationRequired: 'Confirm your email address before booking or joining a match.',
      adminOverview: 'Platform admin', adminUsers: 'Customers and players', adminCourts: 'Courts', adminOwners: 'Court owners', adminAddOwners: 'Add owners', adminAdmins: 'Platform admins', adminAddSuperAdmin: 'Invite admin', adminMenu: 'Admin menu',
      adminAccounts: 'Accounts', adminPlayers: 'Players', adminOwnerCount: 'Court owners', adminCourtCount: 'Courts', adminActiveSummary: '{active} of {all} active', adminBookings: 'Bookings', adminRevenue: 'Confirmed revenue',
      adminCustomersHeading: 'Customers and players', adminCourtsHeading: 'Courts', adminAll: 'All', adminDetails: 'Details', adminRole: 'Account type', adminNoUsers: 'No accounts found.', adminNoCourts: 'No courts found.',
      adminCreateOwnerHeading: 'Invite a court owner', adminCurrentOwners: 'Current court owners', adminCreateOwnerAction: 'Send owner invitation', adminOwnerCreated: 'Invitation email sent.', adminCreateSuperAdminHeading: 'Invite a platform admin', adminCreateSuperAdminAction: 'Send admin invitation', adminSuperAdminCreated: 'Platform admin invitation sent.', adminLoadError: 'Could not load admin data',
      adminReference: 'Booking reference', adminDate: 'Date', adminAmount: 'Amount', adminStatus: 'Status', adminActive: 'Active', adminInactive: 'Inactive', adminBackUsers: 'Back to accounts', adminAccessRequired: 'This page is for the platform administrator.',
      role_superadmin: 'Super admin', role_owner: 'Court owner', role_player: 'Player',
      tab_overview: 'Overview', tab_courts: 'My courts', tab_availability: 'Availability', tab_bookings: 'Bookings',
      greeting: 'Hello, {name} 👋',
      statToday: 'Bookings today', statUpcoming: 'Upcoming bookings', statPending: 'Waiting for confirmation',
      statWeek: 'Weekly revenue', statMonth: 'Bookings this month',
      pendingRequests: 'Pending requests', noPending: 'No pending requests.',
      myCourts: 'My courts', addNewCourt: 'Add a court',
      noOwnerCourtsTitle: "You haven't added a court yet", noOwnerCourtsText: 'Add your first court so players can find it.',
      active: 'Visible to players', hidden: 'Hidden', hide: 'Hide', show: 'Show',
      deleteCourt: 'Delete court', deleteCourtText: '"{name}" will be deleted permanently. This cannot be undone.',
      yesDelete: 'Yes, delete', courtSaved: 'Court saved.', courtDeleted: 'Court deleted.',
      courtVisible: 'The court is now visible to players.', courtHidden: 'The court is now hidden from players.',
      editCourt: 'Edit court', newCourt: 'New court',
      secBasics: 'Basic info', secLocation: 'Location', secContact: 'Contact', secPricing: 'Pricing',
      secHours: 'Working hours and slots', secPhotos: 'Photos', secFacilities: 'Facilities', secVisibility: 'Visibility',
      nameAr: 'Court name (Arabic)', nameEn: 'Court name (English)', descAr: 'Description (Arabic)', descEn: 'Description (English)',
      addressAr: 'Address (Arabic)', addressEn: 'Address (English)', lat: 'Latitude', lng: 'Longitude',
      coordsHint: 'Optional. Used for the map and directions.',
      whatsappHint: 'Leave empty to use the phone number.',
      priceMinutes: 'Duration', priceValue: 'Price (JOD)', addPrice: 'Add a price',
      pricesHint: 'Add one price for each booking length you offer.',
      openTime: 'Opens at', closeTime: 'Closes at', slotStep: 'Slots start every', minutes: '{n} minutes',
      mainImage: 'Main', makeMain: 'Make main', addImageUrl: 'Add by URL', uploadImage: 'Upload photo',
      uploading: 'Uploading photos…', imageInvalid: 'Enter a valid image URL starting with https://',
      uploadFailed: 'Could not upload the photo.', isActive: 'Show this court to players',
      isActiveHint: 'Turn this off to hide the court for now without deleting it.',
      locationsMissing: 'Could not load cities and areas',
      locationsMissingText: 'Cities and areas are needed to add a court. Ask the platform admin to add them.',
      selectCity: 'Select a city', selectArea: 'Select an area', selectType: 'Select a type', notSpecified: 'Not specified',
      errName: 'Enter the court name in Arabic or English.', errCity: 'Select a city.', errArea: 'Select an area.',
      errType: 'Select the court type.', errPhone: 'Enter a valid contact phone number.',
      errPrices: 'Add at least one price, and do not repeat a duration.', errHours: 'Set the opening and closing time.',
      errCoords: 'Enter latitude and longitude together with valid values, or leave both empty.',
      pickCourt: 'Court', availabilityHint: 'Tap a free time to close it, or a closed time to reopen it.',
      closeAll: 'Close all free slots', openAll: 'Reopen closed slots',
      slotsUpdated: 'Slots updated.',
      col_customer: 'Customer', col_court: 'Court', col_when: 'When', col_duration: 'Duration',
      col_amount: 'Amount', col_status: 'Status',
      st_pending: 'Pending', st_confirmed: 'Confirmed', st_cancelled: 'Cancelled',
      confirmAction: 'Confirm', cancelBooking: 'Cancel booking',
      cancelBookingText: 'Are you sure you want to cancel this booking? This cannot be undone.',
      yesCancel: 'Yes, cancel booking', bookingConfirmed: 'Booking confirmed.', bookingCancelled: 'Booking cancelled.',
      allCourts: 'All courts', allStatuses: 'All statuses', noBookings: 'No bookings found.', anyDate: 'Any date',
      reschedule: 'Reschedule', rescheduleFor: 'Reschedule – {court}',
      confirmReschedule: 'Save new time', reschedulePending: 'Saving…',
      rescheduleDone: 'Booking rescheduled.', rescheduleTaken: 'That time is taken. Pick another one.',
    },
  };

  function t(key, arg) {
    const entry = L[state.lang][key] ?? L.en[key];
    if (entry === undefined) return key;
    if (typeof entry === 'function') return entry(arg);
    if (arg && typeof arg === 'object') return entry.replace(/\{(\w+)\}/g, (m, k) => (k in arg ? arg[k] : m));
    return entry;
  }
  const pick = (ar, en) => (state.lang === 'ar' ? ar || en || '' : en || ar || '');
  const money = n => `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${t('currency')}`;
  function durationLabel(m) {
    if (state.lang === 'ar') {
      if (m === 60) return 'ساعة واحدة';
      if (m === 90) return 'ساعة ونصف';
      if (m === 120) return 'ساعتان';
      return `${m} دقيقة`;
    }
    if (m === 60) return '1 hour';
    if (m === 90) return '90 minutes';
    if (m === 120) return '2 hours';
    return `${m} min`;
  }
  const amenityLabel = code => (L[state.lang][`am_${code}`] ?? L.en[`am_${code}`] ?? code);

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */
  function defaultFilters() {
    return {
      q: '', cityId: '', areaId: '', date: todayStr(), time: '', availableOnly: false, openMatches: false,
      type: '', format: '', min: '', max: '', rating: '', amenities: [], sort: 'rating',
    };
  }
  function readUser() {
    try { return JSON.parse(store.get(STORAGE.user) || 'null'); } catch { return null; }
  }

  const state = {
    lang: store.get(STORAGE.lang) === 'en' ? 'en' : 'ar',
    token: store.get(STORAGE.token) || '',
    csrfToken: '',
    user: readUser(),
    route: 'home',
    courts: [], courtsStatus: 'idle', courtsError: '', resultCount: 0,
    filters: defaultFilters(), filtersExpanded: false,
    detail: { court: null, date: todayStr(), slots: [], req: 0 },
    booking: null,
    matches: [], matchesStatus: 'idle', matchesError: '',
    locations: [],
    owner: {
      tab: 'overview', parts: [], courts: [], courtsLoaded: false, draft: null,
      slotsCourtId: '', slotsDate: todayStr(), slots: [], slotsReq: 0,
      bookingFilters: { courtId: '', status: '', date: '' }, bookings: [], bookingsReq: 0,
      overviewBookings: [], reschedule: null,
    },
  };
  let routeToken = 0;
  let courtsReq = 0;
  const stale = token => token !== routeToken;
  const isOwner = () => state.user?.role === 'owner';
  const isSuperAdmin = () => state.user?.role === 'superadmin';

  /* ------------------------------------------------------------------ */
  /* API                                                                 */
  /* ------------------------------------------------------------------ */
  class ApiError extends Error {
    constructor(status, message, details, handled = false) {
      super(message);
      this.status = status;
      this.details = details;
      this.handled = handled;
    }
  }

  function buildUrl(path, query) {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, v);
    });
    const qs = params.toString();
    return `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
  }

  function errorMessage(data, status) {
    if (!data) return t('errorGeneric');
    let message = '';
    if (data.errors && typeof data.errors === 'object') {
      const first = Object.values(data.errors).flat()[0];
      if (first) message = String(first);
    }
    message ||= String(data.detail || data.message || data.title || t('errorGeneric'));
    if (data.code === 'email_not_verified') return t('emailVerificationRequired');
    if (status === 401) return t('invalidCredentials');
    if (status === 403) return t('accessDenied');
    if (status === 404) return t('notFound');
    if (state.lang === 'ar') {
      const translations = {
        'an account with this email already exists.': 'هذا البريد الإلكتروني مستخدم بالفعل.',
        'an account with this username already exists.': 'اسم المستخدم مستخدم بالفعل.',
        'bookings must start in the future.': 'يجب أن يكون موعد الحجز في المستقبل.',
        'duration must be positive.': 'يجب أن تكون مدة الحجز أكبر من صفر.',
        'this duration is not offered by the court.': 'مدة الحجز المختارة غير متاحة لهذا الملعب.',
        'the selected slot is no longer available.': t('slotTaken'),
        'this match is full.': 'اكتملت هذه المباراة.',
      };
      return translations[message.trim().toLowerCase()] || message;
    }
    return message;
  }

  async function api(path, { method = 'GET', body, query, formData } = {}) {
    const headers = { 'Accept-Language': state.lang };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const methodName = String(method).toUpperCase();
    if (state.csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(methodName)) headers['X-CSRF-TOKEN'] = state.csrfToken;
    let payload;
    if (formData) {
      payload = formData;
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    let response;
    try {
      response = await fetch(buildUrl(path, query), { method, headers, body: payload, credentials: 'include' });
    } catch {
      throw new ApiError(0, t('errorNetwork'));
    }
    if (response.status === 204) return null;
    let data = null;
    const text = await response.text();
    if (text) { try { data = JSON.parse(text); } catch { data = null; } }
    if (!response.ok) {
      if (response.status === 401 && state.token) {
        sessionExpired();
        throw new ApiError(401, t('sessionExpired'), data, true);
      }
      throw new ApiError(response.status, errorMessage(data, response.status), data);
    }
    return data;
  }

  /* ------------------------------------------------------------------ */
  /* Session                                                             */
  /* ------------------------------------------------------------------ */
  function normalizeUser(u) {
    return {
      id: u?.id ?? '', name: u?.name || u?.fullName || '', username: u?.username || '', email: u?.email || '',
      phone: u?.phone || '', age: u?.age ?? null, photoUrl: u?.photoUrl || '', role: String(u?.role || 'player').toLowerCase(),
    };
  }
  function setSession(data) {
    const token = data?.token || data?.accessToken || '';
    if (!token) throw new ApiError(0, t('errorGeneric'));
    state.token = token;
    state.user = normalizeUser(data.user || data);
    store.set(STORAGE.token, token);
    store.set(STORAGE.user, JSON.stringify(state.user));
  }
  function clearSession() {
    state.token = '';
    state.user = null;
    store.remove(STORAGE.token);
    store.remove(STORAGE.user);
    state.owner.courts = [];
    state.owner.courtsLoaded = false;
  }
  function sessionExpired() {
    clearSession();
    setTimeout(() => {
      toast(t('sessionExpired'), 'error');
      if (state.route === 'dashboard' || state.route === 'admin') redirectHome(); else route(true);
    }, 0);
  }
  const onHomeHash = () => ['', '#', '#/'].includes(location.hash);
  async function refreshUser() {
    try {
      state.user = normalizeUser(await api('/auth/me'));
      store.set(STORAGE.user, JSON.stringify(state.user));
      /* The cached role (if any) may be stale or absent; once the server
         confirms this is an owner, send them to the dashboard if they're
         still sitting on the home page. */
      if (isOwner() && onHomeHash()) location.hash = '#/dashboard';
      else if (isSuperAdmin() && onHomeHash()) location.hash = '#/admin';
    } catch { /* offline or expired: api() already handled the expired case */ }
  }

  /* ------------------------------------------------------------------ */
  /* Normalizers                                                         */
  /* ------------------------------------------------------------------ */
  const hhmm = v => String(v ?? '').slice(0, 5);

  function normalizeCourt(raw) {
    const prices = (Array.isArray(raw.prices) ? raw.prices : [])
      .map(p => ({ minutes: Number(p.minutes), price: Number(p.price) }))
      .filter(p => p.minutes > 0 && Number.isFinite(p.price))
      .sort((a, b) => a.minutes - b.minutes);
    const slots = (Array.isArray(raw.availableSlots) ? raw.availableSlots : [])
      .map(s => hhmm(typeof s === 'string' ? s : s?.time)).filter(Boolean)
      .sort((a, b) => toMinutes(a) - toMinutes(b));
    return {
      id: raw.id,
      nameAr: raw.nameAr || '', nameEn: raw.nameEn || '',
      descriptionAr: raw.descriptionAr || '', descriptionEn: raw.descriptionEn || '',
      cityId: raw.cityId ?? '', cityAr: raw.cityAr || '', cityEn: raw.cityEn || '',
      areaId: raw.areaId ?? '', areaAr: raw.areaAr || '', areaEn: raw.areaEn || '',
      addressAr: raw.addressAr || '', addressEn: raw.addressEn || '',
      lat: numOrNull(raw.lat), lng: numOrNull(raw.lng),
      type: raw.type || '', format: numOrNull(raw.format),
      phone: raw.phone || '', whatsapp: raw.whatsapp || '',
      images: (Array.isArray(raw.images) ? raw.images : []).filter(Boolean),
      amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
      prices,
      rating: numOrNull(raw.rating), ratingCount: Number(raw.ratingCount) || 0,
      openMatches: Number(raw.openMatches) || 0,
      availableSlots: slots,
      isActive: raw.isActive !== false,
      openTime: hhmm(raw.openTime), closeTime: hhmm(raw.closeTime),
      slotStepMinutes: Number(raw.slotStepMinutes) || 60,
    };
  }

  function normalizeSlots(list, date) {
    const isToday = date === todayStr();
    const now = nowMinutes();
    return asList(list).map(s => {
      const time = hhmm(typeof s === 'string' ? s : s?.time);
      let status = typeof s === 'string' ? 'available' : String(s?.status || 'available').toLowerCase();
      if (status === 'available' && isToday && toMinutes(time) < now) status = 'past';
      return { time, status, customerName: (typeof s === 'object' && s?.customerName) || '' };
    }).filter(s => /^\d{1,2}:\d{2}$/.test(s.time)).sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  }

  function normalizeBooking(b) {
    return {
      id: b.id, courtId: b.courtId, courtNameAr: b.courtNameAr || '', courtNameEn: b.courtNameEn || '',
      customerName: b.customerName || '', customerPhone: b.customerPhone || '',
      date: String(b.date || '').slice(0, 10), time: hhmm(b.time),
      durationMinutes: Number(b.durationMinutes) || 0, amount: numOrNull(b.amount),
      status: String(b.status || 'pending').toLowerCase(),
    };
  }

  function normalizeMatch(raw) {
    const c = state.courts.find(x => String(x.id) === String(raw.courtId));
    return {
      id: raw.id, courtId: raw.courtId,
      nameAr: raw.courtNameAr || c?.nameAr || '', nameEn: raw.courtNameEn || c?.nameEn || '',
      areaAr: raw.areaAr || c?.areaAr || '', areaEn: raw.areaEn || c?.areaEn || '',
      cityAr: raw.cityAr || c?.cityAr || '', cityEn: raw.cityEn || c?.cityEn || '',
      image: raw.courtImage || c?.images?.[0] || '',
      date: String(raw.date || '').slice(0, 10), time: hhmm(raw.time),
      spotsLeft: Number(raw.spotsLeft) || 0,
    };
  }

  const cName = c => pick(c.nameAr, c.nameEn);
  function locationText(c) {
    return [pick(c.areaAr, c.areaEn), pick(c.cityAr, c.cityEn)].filter(Boolean).join(state.lang === 'ar' ? '، ' : ', ');
  }
  function basePrice(c) {
    const p = c.prices.find(x => x.minutes === 60) || c.prices[0];
    return p ? p.price : null;
  }
  const shortestDuration = c => (c.prices.find(p => p.minutes === 60) || c.prices[0] || { minutes: 60 }).minutes;
  function ratingText(c) {
    return c.rating !== null ? `★ ${c.rating.toFixed(1)}${c.ratingCount ? ` (${c.ratingCount})` : ''}` : t('newBadge');
  }
  const findCourt = id => state.courts.find(c => String(c.id) === String(id))
    || (state.detail.court && String(state.detail.court.id) === String(id) ? state.detail.court : null)
    || state.owner.courts.find(c => String(c.id) === String(id)) || null;

  /* ------------------------------------------------------------------ */
  /* UI primitives                                                       */
  /* ------------------------------------------------------------------ */
  function toast(message, kind = 'info') {
    let box = $('#toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toasts';
      box.className = 'toasts';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.append(box);
    }
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = message;
    box.append(el);
    setTimeout(() => el.remove(), kind === 'error' ? 5000 : 3200);
  }

  let lastFocus = null;
  const modalHead = title => `<div class="modal-head"><h2 id="modal-title">${esc(title)}</h2><button type="button" class="close" data-action="close-modal" aria-label="${esc(t('close'))}">×</button></div>`;
  function openModal(html) {
    const existing = $('#modal');
    if (existing) existing.remove(); else lastFocus = document.activeElement;
    document.body.insertAdjacentHTML('beforeend', `<div id="modal" class="modal-backdrop" data-action="backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">${html}</div></div>`);
    document.body.classList.add('modal-open');
    focusFirstInModal();
  }
  function setModalHtml(html) {
    const box = $('#modal .modal');
    if (box) { box.innerHTML = html; focusFirstInModal(); }
  }
  function focusFirstInModal() {
    const first = $('#modal input:not([type="hidden"]), #modal select, #modal textarea, #modal button:not(.close)');
    if (first) first.focus();
  }
  function closeModal() {
    const modal = $('#modal');
    if (!modal) return;
    modal.remove();
    document.body.classList.remove('modal-open');
    state.booking = null;
    state.owner.reschedule = null;
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    lastFocus = null;
  }

  const stateBox = (title, text = '', extra = '') => `<div class="state-box"><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${extra}</div>`;
  const retryButton = action => `<button type="button" class="btn" data-action="${action}">${t('retry')}</button>`;

  function showFormError(id, messages) {
    const box = $(`#${id}`);
    if (!box) return;
    const list = Array.isArray(messages) ? messages : [messages];
    box.hidden = !list.length;
    box.innerHTML = list.length > 1 ? `<ul>${list.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : esc(list[0] || '');
    if (list.length) box.scrollIntoView({ block: 'nearest' });
  }

  /* ------------------------------------------------------------------ */
  /* Navigation                                                          */
  /* ------------------------------------------------------------------ */
  function navHtml(active) {
    const u = state.user;
    return `<nav class="nav" id="nav">
      <a class="brand" href="#/">${t('brand')}<small>COURTS APP</small></a>
      <button type="button" class="nav-toggle" data-action="toggle-menu" aria-label="${esc(t('menu'))}" aria-expanded="false" aria-controls="nav-links">☰</button>
      <div class="nav-links" id="nav-links">
        <a class="nav-link${active === 'matches' ? ' active' : ''}" href="#/matches">${t('matches')}</a>
        ${isSuperAdmin()
    ? `<a class="nav-link${active === 'admin' ? ' active' : ''}" href="#/admin">${state.lang === 'ar' ? 'إدارة المنصة' : 'Platform admin'}</a>`
    : isOwner()
      ? `<a class="nav-link${active === 'dashboard' ? ' active' : ''}" href="#/dashboard">${t('dashboard')}</a>`
      : `<button type="button" class="nav-link" data-action="show-owner-contacts">${t('addCourt')}</button>`}
        <button type="button" class="language" data-action="toggle-lang">${state.lang === 'ar' ? 'EN' : 'عربي'}</button>
        ${u
    ? `<button type="button" class="btn" data-action="logout">${esc(u.name)} – ${t('logout')}</button>`
    : `<button type="button" class="btn primary" data-action="open-login">${t('login')}</button>`}
      </div>
    </nav>`;
  }

  function showOwnerContacts() {
    const list = OWNER_CONTACTS.length
      ? OWNER_CONTACTS.map(c => `<div class="contact-card"><div><strong>${esc(pick(c.labelAr, c.labelEn))}</strong><span dir="ltr">${esc(c.phone)}</span></div><div class="contact-actions"><a class="btn primary" href="tel:${esc(telNumber(c.phone))}">☎ ${t('callNow')}</a><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${waNumber(c.phone)}">${t('whatsapp')}</a></div></div>`).join('')
      : `<p class="muted">${t('contactsMissing')}</p>`;
    openModal(`${modalHead(t('addCourt'))}<p class="muted">${t('addCourtIntro')}</p><div class="contact-list">${list}</div>`);
  }

  /* ------------------------------------------------------------------ */
  /* Home: filters and court list                                        */
  /* ------------------------------------------------------------------ */
  function sortByName(list) {
    const collator = new Intl.Collator(state.lang);
    return list.sort((a, b) => collator.compare(a.name, b.name));
  }
  /* Cities/areas normally come from GET /locations (the full list of Jordan's
     cities, independent of which ones already have courts). If that call
     hasn't succeeded yet, fall back to the city/area names already attached
     to loaded courts, so the filter still works from day one. */
  function citiesFromCourts() {
    const map = new Map();
    state.courts.forEach(c => {
      const id = String(c.cityId);
      if (c.cityId !== '' && !map.has(id)) map.set(id, { id, name: pick(c.cityAr, c.cityEn) });
    });
    return sortByName([...map.values()]);
  }
  function areasFromCourts(cityId) {
    if (!cityId) return [];
    const map = new Map();
    state.courts.forEach(c => {
      const id = String(c.areaId);
      if (String(c.cityId) === cityId && c.areaId !== '' && !map.has(id)) map.set(id, { id, name: pick(c.areaAr, c.areaEn) });
    });
    return sortByName([...map.values()]);
  }
  function filterCities() {
    if (state.locations.length) {
      return sortByName(state.locations.map(c => ({ id: String(c.id), name: pick(c.nameAr, c.nameEn) })));
    }
    return citiesFromCourts();
  }
  function filterAreas(cityId) {
    if (!cityId) return [];
    if (state.locations.length) {
      const city = state.locations.find(c => String(c.id) === cityId);
      return city ? sortByName(city.areas.map(a => ({ id: String(a.id), name: pick(a.nameAr, a.nameEn) }))) : [];
    }
    return areasFromCourts(cityId);
  }
  const availableFormats = () => [...new Set(state.courts.map(c => c.format).filter(Boolean))].sort((a, b) => a - b);
  const availableAmenities = () => AMENITIES.filter(code => state.courts.some(c => c.amenities.includes(code)));

  function sanitizeLocationFilters() {
    const f = state.filters;
    if (f.cityId && !filterCities().some(c => c.id === f.cityId)) { f.cityId = ''; f.areaId = ''; }
    if (f.areaId && !filterAreas(f.cityId).some(a => a.id === f.areaId)) f.areaId = '';
  }
  function cityOptionsHtml() {
    const f = state.filters;
    return `<option value="">${t('allCities')}</option>${filterCities().map(c => `<option value="${esc(c.id)}"${c.id === f.cityId ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}`;
  }
  function areaOptionsHtml() {
    const f = state.filters;
    if (!f.cityId) return `<option value="">${t('chooseCityFirst')}</option>`;
    return `<option value="">${t('allAreas')}</option>${filterAreas(f.cityId).map(a => `<option value="${esc(a.id)}"${a.id === f.areaId ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}`;
  }
  const advancedCount = () => {
    const f = state.filters;
    return [f.type, f.format, f.min, f.max, f.rating].filter(v => v !== '').length + f.amenities.length;
  };
  const moreLabel = () => `${t(state.filtersExpanded ? 'fewerFilters' : 'moreFilters')}${advancedCount() ? ` (${advancedCount()})` : ''}`;

  function filtersHtml() {
    const f = state.filters;
    const today = todayStr();
    const isToday = f.date === today;
    const times = ['', 'now', 'morning', 'afternoon', 'evening'];
    const formats = availableFormats();
    const amenityCodes = availableAmenities();
    const sorts = [['rating', 'sortRating'], ['earliest', 'sortEarliest'], ['low', 'sortLow'], ['high', 'sortHigh'], ['name', 'sortName']];
    const more = state.filtersExpanded ? `
      <div class="filters-more">
        <label class="field"><span>${t('type')}</span>
          <select data-change="type">
            <option value="">${t('allTypes')}</option>
            ${COURT_TYPES.map(type => `<option value="${type}"${f.type === type ? ' selected' : ''}>${t(type)}</option>`).join('')}
          </select></label>
        ${formats.length ? `<label class="field"><span>${t('format')}</span>
          <select data-change="format"><option value="">${t('anyFormat')}</option>${formats.map(n => `<option value="${n}"${String(n) === f.format ? ' selected' : ''}>${n}v${n}</option>`).join('')}</select></label>` : ''}
        <label class="field"><span>${t('minPrice')}</span><input type="number" min="0" step="any" inputmode="decimal" value="${esc(f.min)}" data-input="min"></label>
        <label class="field"><span>${t('maxPrice')}</span><input type="number" min="0" step="any" inputmode="decimal" value="${esc(f.max)}" data-input="max"></label>
        <label class="field"><span>${t('rating')}</span>
          <select data-change="rating"><option value="">${t('anyRating')}</option>${['3', '4', '4.5'].map(r => `<option value="${r}"${f.rating === r ? ' selected' : ''}>${r}★+</option>`).join('')}</select></label>
        ${amenityCodes.length ? `<div class="field wide"><span>${t('amenities')}</span><div class="chip-group">${amenityCodes.map(code => `<button type="button" class="chip${f.amenities.includes(code) ? ' active' : ''}" data-action="toggle-amenity" data-value="${code}" aria-pressed="${f.amenities.includes(code)}">${esc(amenityLabel(code))}</button>`).join('')}</div></div>` : ''}
      </div>` : '';
    return `
      <div class="filters-main">
        <label class="field field-search"><span>${t('search')}</span>
          <input type="search" id="f-q" value="${esc(f.q)}" placeholder="${esc(t('searchPlaceholder'))}" data-input="q" autocomplete="off"></label>
        <label class="field"><span>${t('city')}</span><select id="f-city" data-change="cityId">${cityOptionsHtml()}</select></label>
        <label class="field"><span>${t('area')}</span><select id="f-area" data-change="areaId"${f.cityId ? '' : ' disabled'}>${areaOptionsHtml()}</select></label>
        <label class="field"><span>${t('date')}</span>
          <input type="date" id="f-date" value="${esc(f.date)}" min="${today}" max="${addDays(today, MAX_BOOKING_DAYS)}" data-change="date"></label>
      </div>
      <div class="filters-row">
        <div class="segmented" role="group" aria-label="${esc(t('time'))}">
          ${times.map(v => `<button type="button" class="seg${f.time === v ? ' active' : ''}" data-action="set-time" data-value="${v}" aria-pressed="${f.time === v}" title="${esc(v ? t(`time_${v}_hint`) : t('anyTime'))}"${v === 'now' && !isToday ? ' disabled' : ''}>${esc(v ? t(`time_${v}`) : t('anyTime'))}</button>`).join('')}
        </div>
        <button type="button" class="chip${f.availableOnly ? ' active' : ''}" data-action="toggle-filter" data-key="availableOnly" aria-pressed="${f.availableOnly}">${t('onlyAvailable')}</button>
        <button type="button" class="chip${f.openMatches ? ' active' : ''}" data-action="toggle-filter" data-key="openMatches" aria-pressed="${f.openMatches}">⚡ ${t('openMatches')}</button>
        <button type="button" class="chip more" id="more-btn" data-action="toggle-more" aria-expanded="${state.filtersExpanded}">${moreLabel()}</button>
      </div>
      ${more}
      <div class="results-bar">
        <span id="results-count" class="muted" role="status"></span>
        <div class="results-actions">
          <label class="inline-field"><span>${t('sort')}</span>
            <select data-change="sort">${sorts.map(([v, k]) => `<option value="${v}"${f.sort === v ? ' selected' : ''}>${t(k)}</option>`).join('')}</select></label>
          <button type="button" class="btn small" data-action="reset-filters">${t('reset')}</button>
        </div>
      </div>`;
  }

  function renderFilters() {
    const box = $('#filters');
    if (!box) return;
    sanitizeLocationFilters();
    box.innerHTML = filtersHtml();
    renderCount();
  }
  function selectorFor(el) {
    const d = el.dataset;
    let s = '';
    if (d.action) s += `[data-action="${d.action}"]`;
    if (d.change) s += `[data-change="${d.change}"]`;
    if (d.value !== undefined) s += `[data-value="${d.value}"]`;
    if (d.key) s += `[data-key="${d.key}"]`;
    return s;
  }
  function rerenderFilters(focusEl) {
    const selector = focusEl ? selectorFor(focusEl) : '';
    renderFilters();
    if (selector) { const el = $(`#filters ${selector}`); if (el) el.focus(); }
  }
  function refreshLocationSelects() {
    sanitizeLocationFilters();
    const city = $('#f-city');
    const area = $('#f-area');
    if (city) city.innerHTML = cityOptionsHtml();
    if (area) { area.innerHTML = areaOptionsHtml(); area.disabled = !state.filters.cityId; }
  }
  function renderCount() {
    const el = $('#results-count');
    if (!el) return;
    el.textContent = state.courts.length && state.courtsStatus !== 'error' ? t('results', state.resultCount) : '';
  }

  /* Slots that pass the date and time filters for one court. */
  function courtSlots(c) {
    const f = state.filters;
    let slots = c.availableSlots;
    if (f.date === todayStr()) {
      const now = nowMinutes();
      slots = slots.filter(s => toMinutes(s) >= now);
    }
    const win = TIME_WINDOWS[f.time];
    if (win) slots = slots.filter(s => { const m = toMinutes(s); return m >= win[0] && m < win[1]; });
    return slots;
  }

  function computeResults() {
    const f = state.filters;
    const words = norm(f.q).split(' ').filter(Boolean);
    const min = numOrNull(f.min);
    const max = numOrNull(f.max);
    const minRating = numOrNull(f.rating);
    const items = [];
    state.courts.forEach(c => {
      const slots = courtSlots(c);
      if (words.length) {
        const hay = norm([c.nameAr, c.nameEn, c.cityAr, c.cityEn, c.areaAr, c.areaEn, c.addressAr, c.addressEn].join(' '));
        if (!words.every(w => hay.includes(w))) return;
      }
      if (f.cityId && String(c.cityId) !== f.cityId) return;
      if (f.areaId && String(c.areaId) !== f.areaId) return;
      if (f.type && c.type !== f.type) return;
      if (f.format && String(c.format) !== f.format) return;
      const price = basePrice(c);
      if ((min !== null || max !== null) && price === null) return;
      if (min !== null && price < min) return;
      if (max !== null && price > max) return;
      if (minRating !== null && (c.rating === null || c.rating < minRating)) return;
      if (f.amenities.length && !f.amenities.every(a => c.amenities.includes(a))) return;
      if (f.openMatches && c.openMatches < 1) return;
      if ((f.availableOnly || f.time) && !slots.length) return;
      items.push({ c, slots });
    });
    const collator = new Intl.Collator(state.lang);
    const first = i => (i.slots.length ? toMinutes(i.slots[0]) : Infinity);
    items.sort((a, b) => {
      switch (f.sort) {
        case 'low': return cmp(num(basePrice(a.c), Infinity), num(basePrice(b.c), Infinity));
        case 'high': return cmp(num(basePrice(b.c), -Infinity), num(basePrice(a.c), -Infinity));
        case 'earliest': return cmp(first(a), first(b)) || collator.compare(cName(a.c), cName(b.c));
        case 'name': return collator.compare(cName(a.c), cName(b.c));
        default: return cmp(num(b.c.rating, -1), num(a.c.rating, -1)) || collator.compare(cName(a.c), cName(b.c));
      }
    });
    return items;
  }

  const placeholderHtml = (cls = '') => `<div class="court-image court-placeholder ${cls}" aria-hidden="true">⚽</div>`;

  function cardHtml({ c, slots }) {
    const id = esc(c.id);
    const media = c.images.length
      ? `<img class="court-image" src="${esc(c.images[0])}" alt="${esc(cName(c))}" loading="lazy" decoding="async" data-fallback>`
      : placeholderHtml();
    const priceRows = c.prices.map(p => `<div class="price-row"><span>${esc(durationLabel(p.minutes))}</span><span class="price">${money(p.price)}</span></div>`).join('');
    const free = slots.length
      ? `<p class="availability ok">${t('freeSlots', slots.length)}<span>${t('nextSlot', { time: slots[0] })}</span></p>`
      : `<p class="availability none">${t('noSlots')}</p>`;
    const tags = c.amenities.slice(0, 3).map(a => `<span class="tag">${esc(amenityLabel(a))}</span>`).join('');
    return `<article class="card court-card">
      <a class="court-media" href="#/court/${encodeURIComponent(c.id)}" tabindex="-1" aria-hidden="true">${media}</a>
      <div class="card-body">
        <div>
          ${c.type ? `<span class="badge ${TYPE_BADGE_CLASS[c.type] || 'gray'}">${t(c.type)}</span>` : ''}
          ${c.format ? `<span class="badge gray">${c.format}v${c.format}</span>` : ''}
          ${c.openMatches ? `<span class="badge gold">⚡ ${t('openMatchesBadge', c.openMatches)}</span>` : ''}
        </div>
        <h2 class="court-title"><a href="#/court/${encodeURIComponent(c.id)}">${esc(cName(c))}</a></h2>
        <p class="muted">📍 ${esc(locationText(c))}</p>
        <p class="muted">${esc(ratingText(c))}</p>
        <div>${priceRows}</div>
        ${free}
        ${tags ? `<div class="tags">${tags}</div>` : ''}
        <div class="actions">
          <a class="btn" href="#/court/${encodeURIComponent(c.id)}">${t('details')}</a>
          <button type="button" class="btn primary" data-action="book" data-id="${id}"${c.prices.length ? '' : ' disabled'}>${t('bookNow')}</button>
        </div>
      </div>
    </article>`;
  }

  function renderResults() {
    const box = $('#results');
    if (!box) return;
    box.classList.toggle('is-loading', state.courtsStatus === 'loading' && state.courts.length > 0);
    box.setAttribute('aria-busy', String(state.courtsStatus === 'loading'));
    if (!state.courts.length) {
      state.resultCount = 0;
      if (state.courtsStatus === 'loading' || state.courtsStatus === 'idle') {
        box.innerHTML = Array.from({ length: 6 }, () => '<div class="card skeleton" aria-hidden="true"></div>').join('');
      } else if (state.courtsStatus === 'error') {
        box.innerHTML = stateBox(t('loadCourtsError'), state.courtsError, retryButton('reload-courts'));
      } else {
        box.innerHTML = stateBox(t('emptyNoCourtsTitle'), t('emptyNoCourtsText'));
      }
      renderCount();
      renderStats();
      return;
    }
    const items = computeResults();
    state.resultCount = items.length;
    box.innerHTML = items.length
      ? items.map(cardHtml).join('')
      : stateBox(t('emptyNoMatchTitle'), t('emptyNoMatchText'), `<button type="button" class="btn" data-action="reset-filters">${t('reset')}</button>`);
    renderCount();
    renderStats();
  }

  function renderStats() {
    const box = $('#hero-stats');
    if (!box) return;
    if (!state.courts.length) { box.innerHTML = ''; return; }
    const areas = new Set(state.courts.map(c => `${c.cityId}:${c.areaId}`));
    const open = state.courts.reduce((n, c) => n + c.openMatches, 0);
    const items = [[state.courts.length, t('statCourts')], [areas.size, t('statAreas')]];
    if (open) items.push([open, t('statMatches')]);
    box.innerHTML = items.map(([n, label]) => `<div class="stat"><strong>${n}</strong><span class="muted">${label}</span></div>`).join('');
  }

  async function loadCourts() {
    const req = ++courtsReq;
    const date = state.filters.date;
    state.courtsStatus = 'loading';
    state.courtsError = '';
    if (state.route === 'home') renderResults();
    try {
      const data = asList(await api('/courts', { query: { date } }));
      if (req !== courtsReq) return;
      state.courts = data.map(normalizeCourt).filter(c => c.isActive);
      state.courtsStatus = 'ready';
    } catch (err) {
      if (req !== courtsReq) return;
      state.courtsStatus = 'error';
      state.courtsError = err.message;
    }
    if (state.route !== 'home') return;
    const active = document.activeElement;
    if (active && $('#filters')?.contains(active)) refreshLocationSelects(); else renderFilters();
    renderResults();
  }

  async function loadHomeLocations(token = routeToken) {
    /* Best-effort: if /locations fails or is empty, filterCities()/filterAreas()
       fall back to deriving cities from the courts already loaded, so this
       never blocks the page. */
    if (state.locations.length) return;
    try { await ensureLocations(); } catch { return; }
    if (stale(token) || state.route !== 'home') return;
    const active = document.activeElement;
    if (active && $('#filters')?.contains(active)) refreshLocationSelects(); else renderFilters();
  }

  function renderHome() {
    state.route = 'home';
    const f = state.filters;
    f.date = clampDate(f.date);
    if (f.time === 'now' && f.date !== todayStr()) f.time = '';
    app.innerHTML = `${navHtml('home')}
      <section class="hero">
        <h1>${t('heroTitle')}</h1>
        <p class="muted">${t('heroSubtitle')}</p>
        <div class="stats" id="hero-stats"></div>
      </section>
      <main class="container">
        <section class="filters-panel" id="filters" aria-label="${esc(t('filtersLabel'))}"></section>
        <div class="grid" id="results"></div>
      </main>`;
    renderFilters();
    renderResults();
    renderStats();
    loadCourts();
    loadHomeLocations();
  }

  /* ------------------------------------------------------------------ */
  /* Court details                                                       */
  /* ------------------------------------------------------------------ */
  function slotGridHtml(slots, action, selected = '') {
    return slots.map(s => {
      const clickable = action === 'av-toggle' ? (s.status === 'available' || s.status === 'blocked') : s.status === 'available';
      const cls = ['slot', s.status, s.time === selected ? 'selected' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="${cls}" data-action="${action}" data-value="${esc(s.time)}"${clickable ? '' : ' disabled'}${s.customerName ? ` title="${esc(s.customerName)}"` : ''}${action === 'pick-slot' ? ` aria-pressed="${s.time === selected}"` : ''}>${esc(s.time)}</button>`;
    }).join('');
  }
  const legendHtml = () => `<div class="legend"><span><i class="available"></i>${t('legendAvailable')}</span><span><i class="booked"></i>${t('legendBooked')}</span><span><i class="blocked"></i>${t('legendBlocked')}</span><span><i class="past"></i>${t('legendPast')}</span></div>`;

  function mapHtml(c) {
    if (c.lat === null || c.lng === null) return '';
    const d = 0.012;
    const bbox = [c.lng - d, c.lat - d, c.lng + d, c.lat + d].map(n => n.toFixed(6)).join('%2C');
    return `<section class="map-section"><h2>${t('location')}</h2><p class="muted">${t('mapNote')}</p>
      <iframe title="${esc(t('location'))}" src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${c.lat}%2C${c.lng}" loading="lazy" referrerpolicy="no-referrer"></iframe>
      <a class="btn primary directions" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${c.lat}%2C${c.lng}">🧭 ${t('directions')}</a></section>`;
  }

  function detailHtml(c) {
    const d = state.detail;
    const today = todayStr();
    const hero = c.images.length
      ? `<img id="gallery-main" class="gallery-main" src="${esc(c.images[0])}" alt="${esc(cName(c))}" data-fallback>`
      : placeholderHtml('gallery-main');
    const thumbs = c.images.length > 1
      ? `<div class="thumbs">${c.images.map((u, i) => `<button type="button" class="thumb${i === 0 ? ' active' : ''}" data-action="gallery" data-value="${i}" aria-label="${i + 1}"><img src="${esc(u)}" alt="" loading="lazy" data-fallback></button>`).join('')}</div>`
      : '';
    const desc = pick(c.descriptionAr, c.descriptionEn);
    const address = pick(c.addressAr, c.addressEn);
    const whatsapp = c.whatsapp || c.phone;
    return `<a class="btn" href="#/">${t('back')}</a>
      <div class="card" style="margin-top:18px">
        ${hero}${thumbs}
        <div class="card-body">
          <div>
            ${c.type ? `<span class="badge ${TYPE_BADGE_CLASS[c.type] || 'gray'}">${t(c.type)}</span>` : ''}
            ${c.format ? `<span class="badge gray">${c.format}v${c.format}</span>` : ''}
            ${c.openMatches ? `<span class="badge gold">⚡ ${t('openMatchesBadge', c.openMatches)}</span>` : ''}
          </div>
          <h1 class="detail-title">${esc(cName(c))}</h1>
          <p class="muted">📍 ${esc(locationText(c))}</p>
          ${address ? `<p class="muted">${esc(address)}</p>` : ''}
          <p class="muted">${esc(ratingText(c))}</p>
          ${desc ? `<p>${esc(desc)}</p>` : ''}
          ${c.amenities.length ? `<div class="detail-section"><h3>${t('facilities')}</h3><div class="tags">${c.amenities.map(a => `<span class="tag">${esc(amenityLabel(a))}</span>`).join('')}</div></div>` : ''}
          ${c.prices.length ? `<div class="detail-section"><h3>${t('prices')}</h3><div class="price-list">${c.prices.map(p => `<div class="price-row"><span>${esc(durationLabel(p.minutes))}</span><span class="price">${money(p.price)}</span></div>`).join('')}</div></div>` : ''}
          <div class="detail-section">
            <h3>${t('availableTimes')}</h3>
            <div class="date-row">
              <input type="date" id="detail-date" value="${esc(d.date)}" min="${today}" max="${addDays(today, MAX_BOOKING_DAYS)}" data-change="detail-date" aria-label="${esc(t('date'))}">
              <strong id="detail-date-label">${esc(formatDate(d.date))}</strong>
            </div>
            <div class="slots" id="detail-slots"></div>
            ${legendHtml()}
            ${c.prices.length ? `<button type="button" class="btn primary" data-action="book" data-id="${esc(c.id)}">${t('bookNow')}</button>` : ''}
          </div>
          <div class="contact-card">
            <div><strong>${t('contactBooking')}</strong>${c.phone ? `<span dir="ltr">${esc(c.phone)}</span>` : ''}</div>
            ${c.phone ? `<div class="contact-actions"><a class="btn primary" href="tel:${esc(telNumber(c.phone))}">☎ ${t('callNow')}</a><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${waNumber(whatsapp)}">${t('whatsapp')}</a></div>` : ''}
          </div>
        </div>
      </div>
      ${mapHtml(c)}`;
  }

  async function renderCourtDetail(id) {
    state.route = 'detail';
    const token = routeToken;
    const d = state.detail;
    d.date = clampDate(state.filters.date);
    if (d.court && String(d.court.id) !== String(id)) d.court = null;
    d.slots = [];
    app.innerHTML = `${navHtml('')}<main class="container page" id="detail"><div class="state-box">${t('loading')}</div></main>`;
    let court = null;
    let failure = null;
    try {
      court = normalizeCourt(await api(`/courts/${encodeURIComponent(id)}`, { query: { date: d.date } }));
    } catch (err) {
      failure = err;
      court = state.courts.find(c => String(c.id) === String(id)) || null;
    }
    if (stale(token)) return;
    const main = $('#detail');
    if (!court) {
      const missing = !failure || failure.status === 404;
      main.innerHTML = stateBox(missing ? t('courtNotFound') : t('loadError'), missing ? '' : failure.message, `<a class="btn" href="#/">${t('back')}</a>`);
      return;
    }
    d.court = court;
    main.innerHTML = detailHtml(court);
    await loadDetailSlots(token);
  }

  async function loadDetailSlots(token = routeToken) {
    const d = state.detail;
    const box = $('#detail-slots');
    if (!box || !d.court) return;
    const req = ++d.req;
    box.innerHTML = `<p class="muted">${t('loading')}</p>`;
    try {
      const slots = normalizeSlots(await api(`/courts/${encodeURIComponent(d.court.id)}/slots`, { query: { date: d.date, duration: shortestDuration(d.court) } }), d.date);
      if (stale(token) || req !== d.req) return;
      d.slots = slots;
      box.innerHTML = slots.length ? slotGridHtml(slots, 'detail-slot') : `<p class="muted">${t('noSlotsDay')}</p>`;
    } catch (err) {
      if (stale(token) || req !== d.req) return;
      box.innerHTML = `<p class="muted">${esc(err.message)}</p>`;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Booking                                                             */
  /* ------------------------------------------------------------------ */
  function bookingModalHtml() {
    const b = state.booking;
    const today = todayStr();
    return `${modalHead(`${t('booking')} – ${cName(b.court)}`)}
      <form data-form="booking">
        <div class="form-group"><label for="bk-date">${t('date')}</label>
          <input type="date" id="bk-date" value="${esc(b.date)}" min="${today}" max="${addDays(today, MAX_BOOKING_DAYS)}" data-change="bk-date" required></div>
        <div class="form-group"><label for="bk-duration">${t('duration')}</label>
          <select id="bk-duration" data-change="bk-duration">${b.court.prices.map(p => `<option value="${p.minutes}"${p.minutes === b.duration ? ' selected' : ''}>${esc(durationLabel(p.minutes))} – ${money(p.price)}</option>`).join('')}</select></div>
        <div class="form-group"><label id="bk-time-label">${t('time')}</label>
          <div class="slots" id="bk-slots" role="group" aria-labelledby="bk-time-label"></div></div>
        <div class="booking-total"><span>${t('total')}</span><strong class="price" id="bk-total"></strong></div>
        <p class="form-error" id="bk-error" role="alert" hidden></p>
        <button class="btn primary block" id="bk-submit" disabled>${t('confirmBooking')}</button>
      </form>`;
  }

  function renderBookingSlots() {
    const b = state.booking;
    const box = $('#bk-slots');
    if (!b || !box) return;
    if (b.status === 'loading') box.innerHTML = `<p class="muted">${t('loading')}</p>`;
    else if (b.status === 'error') box.innerHTML = `<p class="muted">${esc(b.error)}</p>`;
    else if (!b.slots.some(s => s.status === 'available')) box.innerHTML = `<p class="muted">${t('noSlotsFor')}</p>`;
    else box.innerHTML = slotGridHtml(b.slots, 'pick-slot', b.time);
    const price = b.court.prices.find(p => p.minutes === b.duration);
    const total = $('#bk-total');
    if (total) total.textContent = price ? money(price.price) : '';
    const submit = $('#bk-submit');
    if (submit) submit.disabled = !b.time || b.busy;
  }

  async function loadBookingSlots() {
    const b = state.booking;
    if (!b) return;
    const req = ++b.req;
    b.status = 'loading';
    renderBookingSlots();
    try {
      const slots = normalizeSlots(await api(`/courts/${encodeURIComponent(b.court.id)}/slots`, { query: { date: b.date, duration: b.duration } }), b.date);
      if (state.booking !== b || req !== b.req) return;
      b.slots = slots;
      b.status = 'ready';
      if (b.time && !slots.some(s => s.time === b.time && s.status === 'available')) b.time = '';
    } catch (err) {
      if (state.booking !== b || req !== b.req) return;
      b.status = 'error';
      b.error = err.message;
      b.time = '';
    }
    renderBookingSlots();
  }

  async function openBooking(courtId, { date, time } = {}) {
    if (!state.user) { openLogin('login'); return; }
    const court = findCourt(courtId);
    if (!court) return;
    if (!court.prices.length) { toast(t('noPrices'), 'error'); return; }
    openModal('');
    state.booking = {
      court, date: clampDate(date || state.filters.date), duration: shortestDuration(court),
      time: time || '', slots: [], status: 'loading', error: '', busy: false, req: 0,
    };
    setModalHtml(bookingModalHtml());
    await loadBookingSlots();
  }

  async function submitBooking() {
    const b = state.booking;
    if (!b || !b.time || b.busy) return;
    b.busy = true;
    const submit = $('#bk-submit');
    if (submit) { submit.disabled = true; submit.textContent = t('bookingSending'); }
    showFormError('bk-error', []);
    try {
      const res = await api('/bookings', { method: 'POST', body: { courtId: idValue(b.court.id), date: b.date, time: b.time, durationMinutes: b.duration } });
      const ref = res?.reference || res?.id || '';
      closeModal();
      toast(t(res?.status === 'pending' ? 'bookingPending' : 'bookingDone', { ref }));
      if (state.route === 'detail') loadDetailSlots(); else if (state.route === 'home') loadCourts();
    } catch (err) {
      b.busy = false;
      if (submit) submit.textContent = t('confirmBooking');
      if (err.handled) return;
      if (err.status === 409) { b.time = ''; showFormError('bk-error', t('slotTaken')); await loadBookingSlots(); }
      else { showFormError('bk-error', err.message); renderBookingSlots(); }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Sign in / register                                                  */
  /* ------------------------------------------------------------------ */
  function openLogin(mode = 'login') {
    clearSession();
    if (mode === 'register') {
      window.location.assign(`${AUTH_BASE}/account/register`);
      return;
    }
    const returnUrl = `${location.pathname}${location.search}${location.hash}`;
    window.location.assign(buildUrl('/auth/login', { returnUrl }));
  }
  function logout() {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = buildUrl('/auth/logout');
    const token = document.createElement('input');
    token.type = 'hidden';
    token.name = '__RequestVerificationToken';
    token.value = state.csrfToken;
    form.append(token);
    document.body.append(form);
    form.submit();
  }

  /* ------------------------------------------------------------------ */
  /* Open matches                                                        */
  /* ------------------------------------------------------------------ */
  async function renderMatches() {
    state.route = 'matches';
    const token = routeToken;
    app.innerHTML = `${navHtml('matches')}<main class="container page">
      <h1 class="detail-title">${t('matchTitle')}</h1><p class="muted">${t('matchSub')}</p>
      <div id="matches-list"><div class="state-box">${t('loading')}</div></div></main>`;
    await loadMatches(token);
  }
  async function loadMatches(token = routeToken) {
    const box = $('#matches-list');
    if (!box) return;
    try {
      if (!state.courts.length) {
        try { state.courts = asList(await api('/courts', { query: { date: todayStr() } })).map(normalizeCourt); } catch { /* names come from the match itself */ }
      }
      const list = asList(await api('/matches')).map(normalizeMatch)
        .sort((a, b) => cmp(`${a.date} ${a.time}`, `${b.date} ${b.time}`));
      if (stale(token)) return;
      state.matches = list;
      box.innerHTML = list.length ? list.map(matchHtml).join('') : stateBox(t('noMatchesTitle'), t('noMatchesText'));
    } catch (err) {
      if (stale(token)) return;
      box.innerHTML = stateBox(t('loadError'), err.message, retryButton('reload-matches'));
    }
  }
  function matchHtml(m) {
    const name = pick(m.nameAr, m.nameEn);
    const place = [pick(m.areaAr, m.areaEn), pick(m.cityAr, m.cityEn)].filter(Boolean).join(state.lang === 'ar' ? '، ' : ', ');
    const media = m.image ? `<img class="court-image" src="${esc(m.image)}" alt="" loading="lazy" data-fallback>` : placeholderHtml();
    return `<article class="card match">
      <div class="court-media">${media}</div>
      <div class="match-info">
        <h2 class="court-title">${esc(name)}</h2>
        ${place ? `<p class="muted">📍 ${esc(place)}</p>` : ''}
        <p class="muted">🕐 ${esc(formatDate(m.date))} ${esc(m.time)}</p>
        <p class="availability ${m.spotsLeft ? 'ok' : 'none'}">${m.spotsLeft ? t('spotsLeft', m.spotsLeft) : t('matchFull')}</p>
      </div>
      <button type="button" class="btn blue" data-action="join" data-id="${esc(m.id)}"${m.spotsLeft ? '' : ' disabled'}>${t('join')}</button>
    </article>`;
  }

  /* ------------------------------------------------------------------ */
  /* Owner dashboard                                                     */
  /* ------------------------------------------------------------------ */
  const dashMain = () => $('#dash-main');
  const dashHead = (title, extra = '') => `<div class="dash-head"><h1>${esc(title)}</h1>${extra}</div>`;

  function redirectHome() {
    history.replaceState(null, '', '#/');
    route();
  }

  function renderDashboard(parts) {
    state.route = 'dashboard';
    if (!state.user) {
      redirectHome();
      openLogin('login');
      return;
    }
    if (!isOwner()) {
      redirectHome();
      toast(t('needOwner'), 'error');
      return;
    }
    const tab = DASH_TABS.includes(parts[1]) ? parts[1] : 'overview';
    state.owner.tab = tab;
    state.owner.parts = parts;
    app.innerHTML = `${navHtml('dashboard')}<div class="dashboard">
      <aside class="side">${DASH_TABS.map(id => `<a class="side-link${tab === id ? ' active' : ''}" href="#/dashboard/${id}">${t(`tab_${id}`)}</a>`).join('')}</aside>
      <main class="dash-main" id="dash-main"><div class="state-box">${t('loading')}</div></main></div>`;
    runDashTab();
  }

  async function renderSuperAdmin(parts) {
    state.route = 'admin';
    if (!state.user) { redirectHome(); openLogin('login'); return; }
    if (!isSuperAdmin()) { redirectHome(); toast(t('adminAccessRequired'), 'error'); return; }
    const section = parts[1] === 'user' && parts[2] ? 'user' : ['overview', 'users', 'courts', 'owners', 'admins'].includes(parts[1]) ? parts[1] : 'overview';
    app.innerHTML = `${navHtml('admin')}<div class="dashboard"><aside class="side" aria-label="${esc(t('adminMenu'))}">
      <a class="side-link ${section === 'overview' ? 'active' : ''}" href="#/admin">${t('adminOverview')}</a>
      <a class="side-link ${section === 'users' ? 'active' : ''}" href="#/admin/users">${t('adminUsers')}</a>
      <a class="side-link ${section === 'courts' ? 'active' : ''}" href="#/admin/courts">${t('adminCourts')}</a>
      <a class="side-link ${section === 'owners' ? 'active' : ''}" href="#/admin/owners">${t('adminAddOwners')}</a>
      <a class="side-link ${section === 'admins' ? 'active' : ''}" href="#/admin/admins">${t('adminAddSuperAdmin')}</a>
      </aside><main class="dash-main" id="admin-main"><div class="state-box">${t('loading')}</div></main></div>`;
    const outlet = $('#admin-main');
    try {
      if (section === 'overview') {
        const [s, users, courts] = await Promise.all([api('/superadmin/stats'), api('/superadmin/users'), api('/superadmin/courts')]);
        if (!outlet) return;
        const cards = [
          ['adminAccounts', s.users], ['adminPlayers', s.players], ['adminOwnerCount', s.owners],
          ['adminCourtCount', t('adminActiveSummary', { active: s.activeCourts, all: s.courts })],
          ['adminBookings', s.bookings], ['adminRevenue', money(s.revenue)],
        ];
        outlet.innerHTML = `<div class="dash-head"><h1>${t('adminOverview')}</h1></div><div class="stat-grid">${cards.map(([key, value]) => `<article class="stat-card"><span>${t(key)}</span><strong>${esc(value)}</strong></article>`).join('')}</div><h2>${t('adminCustomersHeading')}</h2>${adminUsersTable(asList(users).slice(0, 8))}<h2>${t('adminCourtsHeading')}</h2>${adminCourtsTable(asList(courts).slice(0, 8))}`;
      } else if (section === 'users') {
        const roleFilter = ['player', 'owner'].includes(parts[2]) ? parts[2] : '';
        const users = asList(await api('/superadmin/users', { query: { role: roleFilter } }));
        if (outlet) outlet.innerHTML = `<div class="dash-head"><h1>${t('adminUsers')}</h1></div><div class="row-actions"><a class="btn" href="#/admin/users">${t('adminAll')}</a><a class="btn" href="#/admin/users/player">${t('adminPlayers')}</a><a class="btn" href="#/admin/users/owner">${t('adminOwners')}</a></div>${adminUsersTable(users)}`;
      } else if (section === 'owners') {
        const owners = asList(await api('/superadmin/users', { query: { role: 'owner' } }));
        if (outlet) outlet.innerHTML = `<div class="dash-head"><h1 id="admin-create-owner-title">${t('adminCreateOwnerHeading')}</h1></div><form class="admin-owner-form" data-form="owner-create" aria-labelledby="admin-create-owner-title">
          <div class="form-group"><label for="owner-name">${t('name')}</label><input id="owner-name" name="name" required maxlength="120" autocomplete="name"></div>
          <div class="form-group"><label for="owner-username">${t('username')}</label><input id="owner-username" name="username" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_.-]+" autocomplete="username" dir="ltr"></div>
          <div class="form-group"><label for="owner-email">${t('email')}</label><input id="owner-email" name="email" type="email" required maxlength="256" autocomplete="email" dir="ltr"></div>
          <div class="form-group"><label for="owner-phone">${t('phone')}</label><input id="owner-phone" name="phone" type="tel" required autocomplete="tel" inputmode="tel" placeholder="+962 7X XXX XXXX" dir="ltr"></div>
          <div class="form-group"><label for="owner-age">${t('age')}</label><input id="owner-age" name="age" type="number" min="18" max="120" step="1" required inputmode="numeric"></div>
          <div class="form-group"><label for="owner-photo">${t('photoUrl')}</label><input id="owner-photo" name="photoUrl" type="url" maxlength="2048" autocomplete="url" dir="ltr"></div>
          <p class="form-error" id="owner-create-error" role="alert" hidden></p><button class="btn primary" type="submit">${t('adminCreateOwnerAction')}</button>
        </form><h2>${t('adminCurrentOwners')}</h2>${adminUsersTable(owners)}`;
      } else if (section === 'admins') {
        const admins = asList(await api('/superadmin/superadmins'));
        if (outlet) outlet.innerHTML = `<div class="dash-head"><h1 id="admin-create-superadmin-title">${t('adminCreateSuperAdminHeading')}</h1></div><form class="admin-owner-form" data-form="superadmin-create" aria-labelledby="admin-create-superadmin-title">
          <div class="form-group"><label for="superadmin-name">${t('name')}</label><input id="superadmin-name" name="name" required maxlength="120" autocomplete="name"></div>
          <div class="form-group"><label for="superadmin-username">${t('username')}</label><input id="superadmin-username" name="username" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_.-]+" autocomplete="username" dir="ltr"></div>
          <div class="form-group"><label for="superadmin-email">${t('email')}</label><input id="superadmin-email" name="email" type="email" required maxlength="256" autocomplete="email" dir="ltr"></div>
          <div class="form-group"><label for="superadmin-phone">${t('phone')}</label><input id="superadmin-phone" name="phone" type="tel" required autocomplete="tel" inputmode="tel" dir="ltr"></div>
          <div class="form-group"><label for="superadmin-age">${t('age')}</label><input id="superadmin-age" name="age" type="number" min="18" max="120" required inputmode="numeric"></div>
          <div class="form-group"><label for="superadmin-photo">${t('photoUrl')}</label><input id="superadmin-photo" name="photoUrl" type="url" maxlength="2048" autocomplete="url" dir="ltr"></div>
          <p class="form-error" id="superadmin-create-error" role="alert" hidden></p><button class="btn primary" type="submit">${t('adminCreateSuperAdminAction')}</button>
        </form><h2>${t('adminAddSuperAdmin')}</h2>${adminUsersTable(admins)}`;
      } else if (section === 'user' && parts[2]) {
        const u = await api(`/superadmin/users/${encodeURIComponent(parts[2])}`);
        const roleLabel = ({ superadmin: 'superadmin', owner: 'owner', player: 'player' })[u.role] || 'player';
        const ownedCourts = asList(u.courts).map(c => ({ ...c, city: state.lang === 'ar' ? c.cityAr || c.cityEn : c.cityEn || c.cityAr, area: state.lang === 'ar' ? c.areaAr || c.areaEn : c.areaEn || c.areaAr }));
        if (outlet) outlet.innerHTML = `<div class="dash-head"><h1>${esc(u.name || u.username)}</h1></div><p dir="auto">${esc(u.email || '')} · <span dir="ltr">${esc(u.phone || '')}</span> · ${t(`role_${roleLabel}`)} · ${esc(u.age ?? '–')}</p><h2>${t('adminOwners')}</h2>${adminCourtsTable(ownedCourts)}<h2>${t('adminBookings')}</h2><div class="table-wrap"><table><thead><tr><th>${t('adminReference')}</th><th>${t('adminCourts')}</th><th>${t('adminDate')}</th><th>${t('adminAmount')}</th><th>${t('adminStatus')}</th></tr></thead><tbody>${asList(u.bookings).map(b => `<tr><td>${esc(b.reference)}</td><td>${esc(b.courtName)}</td><td>${esc(b.date)}</td><td>${money(b.amount)}</td><td>${esc(L[state.lang][`st_${b.status}`] ?? b.status)}</td></tr>`).join('')}</tbody></table></div><a class="btn" href="#/admin/users">${t('adminBackUsers')}</a>`;
      } else {
        const courts = asList(await api('/superadmin/courts'));
        if (outlet) outlet.innerHTML = `<div class="dash-head"><h1>${t('adminCourts')}</h1></div>${adminCourtsTable(courts)}`;
      }
    } catch (err) { if (outlet && !err.handled) outlet.innerHTML = stateBox(t('adminLoadError'), err.message, retryButton('reload-admin')); }
  }

  async function submitOwnerCreate(form) {
    const fd = new FormData(form);
    const value = key => String(fd.get(key) ?? '').trim();
    const button = form.querySelector('button[type="submit"]');
    const error = $('#owner-create-error');
    if (button) button.disabled = true;
    if (error) { error.hidden = true; error.textContent = ''; }
    try {
      await api('/superadmin/owners', { method: 'POST', body: { name: value('name'), username: value('username'), email: value('email'), phone: value('phone'), age: Number(value('age')), photoUrl: value('photoUrl') || null } });
      toast(t('adminOwnerCreated'));
      route(true);
    } catch (err) {
      if (error && !err.handled) { error.hidden = false; error.textContent = err.message; }
      if (button) button.disabled = false;
    }
  }

  async function submitSuperAdminCreate(form) {
    const fd = new FormData(form);
    const value = key => String(fd.get(key) ?? '').trim();
    const button = form.querySelector('button[type="submit"]');
    const error = $('#superadmin-create-error');
    if (button) button.disabled = true;
    if (error) { error.hidden = true; error.textContent = ''; }
    try {
      await api('/superadmin/superadmins', { method: 'POST', body: { name: value('name'), username: value('username'), email: value('email'), phone: value('phone'), age: Number(value('age')), photoUrl: value('photoUrl') || null } });
      toast(t('adminSuperAdminCreated'));
      route(true);
    } catch (err) {
      if (error && !err.handled) { error.hidden = false; error.textContent = err.message; }
      if (button) button.disabled = false;
    }
  }

  function adminUsersTable(users) {
    if (!users.length) return `<p class="muted">${t('adminNoUsers')}</p>`;
    return `<div class="table-wrap"><table><thead><tr><th>${t('name')}</th><th>${t('username')}</th><th>${t('email')}</th><th>${t('phone')}</th><th>${t('age')}</th><th>${t('adminRole')}</th><th></th></tr></thead><tbody>${users.map(u => `<tr><td>${esc(u.name || '')}</td><td dir="ltr">${esc(u.username || '')}</td><td dir="ltr">${esc(u.email || '')}</td><td dir="ltr">${esc(u.phone || '')}</td><td>${esc(u.age ?? '–')}</td><td>${t(`role_${u.role}`)}</td><td><a class="btn small" href="#/admin/user/${encodeURIComponent(u.id)}">${t('adminDetails')}</a></td></tr>`).join('')}</tbody></table></div>`;
  }

  function adminCourtsTable(courts) {
    if (!courts.length) return `<p class="muted">${t('adminNoCourts')}</p>`;
    return `<div class="table-wrap"><table><thead><tr><th>${t('adminCourts')}</th><th>${t('area')}</th><th>${t('adminOwners')}</th><th>${t('email')}</th><th>${t('adminStatus')}</th></tr></thead><tbody>${courts.map(c => `<tr><td>${esc(state.lang === 'ar' ? c.nameAr || c.nameEn || '' : c.nameEn || c.nameAr || '')}</td><td>${esc([state.lang === 'ar' ? c.areaAr || c.area : c.areaEn || c.area, state.lang === 'ar' ? c.cityAr || c.city : c.cityEn || c.city].filter(Boolean).join(state.lang === 'ar' ? '، ' : ', '))}</td><td>${esc(c.ownerName || '')}</td><td dir="ltr">${esc(c.ownerEmail || '')}</td><td>${t(c.isActive ? 'adminActive' : 'adminInactive')}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function runDashTab() {
    const token = routeToken;
    const o = state.owner;
    const loader = { overview: dashOverview, courts: dashCourts, availability: dashAvailability, bookings: dashBookings }[o.tab];
    loader(token, o.parts).catch(err => {
      if (stale(token) || err.handled) return;
      const main = dashMain();
      if (main) main.innerHTML = stateBox(t('loadError'), err.message, retryButton('reload-dash'));
    });
  }

  async function ensureOwnerCourts(force = false) {
    const o = state.owner;
    if (force || !o.courtsLoaded) {
      o.courts = asList(await api('/owner/courts')).map(normalizeCourt);
      o.courtsLoaded = true;
    }
    return o.courts;
  }
  async function ensureLocations(force = false) {
    if (force || !state.locations.length) {
      state.locations = asList(await api('/locations')).map(c => ({
        id: c.id, nameAr: c.nameAr || '', nameEn: c.nameEn || '',
        areas: asList(c.areas).map(a => ({ id: a.id, nameAr: a.nameAr || '', nameEn: a.nameEn || '' })),
      }));
    }
    return state.locations;
  }

  function bookingsTableHtml(list) {
    if (!list.length) return `<p class="muted">${t('noBookings')}</p>`;
    return `<div class="table-wrap"><table><thead><tr>
      <th>${t('col_customer')}</th><th>${t('col_court')}</th><th>${t('col_when')}</th><th>${t('col_duration')}</th><th>${t('col_amount')}</th><th>${t('col_status')}</th><th></th>
      </tr></thead><tbody>${list.map(b => `<tr>
        <td>${esc(b.customerName)}
          ${b.customerPhone ? `<small><a href="tel:${esc(telNumber(b.customerPhone))}" dir="ltr">${esc(b.customerPhone)}</a></small><small><a href="https://wa.me/${waNumber(b.customerPhone)}" target="_blank" rel="noopener">${t('whatsapp')}</a></small>` : ''}</td>
        <td>${esc(pick(b.courtNameAr, b.courtNameEn))}</td>
        <td>${esc(formatDate(b.date))}<small>${esc(b.time)}</small></td>
        <td>${b.durationMinutes ? esc(durationLabel(b.durationMinutes)) : ''}</td>
        <td class="price">${b.amount !== null ? money(b.amount) : ''}</td>
        <td><span class="status ${esc(b.status)}">${esc(L[state.lang][`st_${b.status}`] ?? b.status)}</span></td>
        <td><div class="row-actions">
          ${b.status === 'pending' ? `<button type="button" class="btn primary small" data-action="bk-confirm" data-id="${esc(b.id)}">${t('confirmAction')}</button>` : ''}
          ${b.status !== 'cancelled' ? `<button type="button" class="btn small" data-action="bk-reschedule" data-id="${esc(b.id)}">${t('reschedule')}</button>` : ''}
          ${b.status !== 'cancelled' ? `<button type="button" class="btn danger small" data-action="bk-cancel" data-id="${esc(b.id)}">${t('cancelBooking')}</button>` : ''}
        </div></td></tr>`).join('')}</tbody></table></div>`;
  }

  /* --- Overview --- */
  async function dashOverview(token) {
    const main = dashMain();
    const [stats, pending] = await Promise.allSettled([
      api('/owner/stats'),
      api('/owner/bookings', { query: { status: 'pending' } }),
    ]);
    if (stale(token)) return;
    if (stats.status === 'rejected' && pending.status === 'rejected') throw stats.reason;
    const s = stats.status === 'fulfilled' ? stats.value || {} : {};
    const show = (v, fmt = x => x) => (v === null || v === undefined ? '–' : fmt(v));
    const cards = [
      ['statToday', show(s.todayBookings)], ['statUpcoming', show(s.upcomingBookings)],
      ['statPending', show(s.pendingBookings)], ['statWeek', show(s.weekRevenue, money)],
      ['statMonth', show(s.monthBookings)],
    ];
    const list = pending.status === 'fulfilled' ? asList(pending.value).map(normalizeBooking) : [];
    state.owner.overviewBookings = list;
    main.innerHTML = `${dashHead(t('tab_overview'))}
      <p class="muted">${esc(t('greeting', { name: state.user.name }))}</p>
      <div class="dash-grid">${cards.map(([k, v]) => `<div class="card stat-card"><strong>${esc(v)}</strong><span class="muted">${t(k)}</span></div>`).join('')}</div>
      <section class="card card-body owner-section"><h2>${t('pendingRequests')}</h2>${list.length ? bookingsTableHtml(list.slice(0, 10)) : `<p class="muted">${t('noPending')}</p>`}</section>`;
  }

  /* --- Courts list and form --- */
  async function dashCourts(token, parts) {
    if (parts[2] === 'new') return dashCourtForm(token, null);
    if (parts[2] === 'edit' && parts[3]) return dashCourtForm(token, decodeURIComponent(parts[3]));
    await ensureOwnerCourts(true);
    if (stale(token)) return;
    const o = state.owner;
    const add = `<a class="btn primary" href="#/dashboard/courts/new">${t('addNewCourt')}</a>`;
    dashMain().innerHTML = `${dashHead(t('myCourts'), add)}${o.courts.length
      ? o.courts.map(ownerCourtRowHtml).join('')
      : stateBox(t('noOwnerCourtsTitle'), t('noOwnerCourtsText'), add)}`;
    return undefined;
  }

  function ownerCourtRowHtml(c) {
    const media = c.images.length ? `<img class="court-image" src="${esc(c.images[0])}" alt="" loading="lazy" data-fallback>` : placeholderHtml();
    return `<article class="card court-row">
      <div class="court-media">${media}</div>
      <div class="court-row-info">
        <h3>${esc(cName(c))}</h3>
        <p class="muted">📍 ${esc(locationText(c))}</p>
        <span class="badge ${c.isActive ? 'green' : 'gray'}">${t(c.isActive ? 'active' : 'hidden')}</span>
      </div>
      <div class="row-actions">
        <button type="button" class="btn small" data-action="toggle-court" data-id="${esc(c.id)}">${t(c.isActive ? 'hide' : 'show')}</button>
        <a class="btn small" href="#/dashboard/courts/edit/${encodeURIComponent(c.id)}">${t('edit')}</a>
        <button type="button" class="btn danger small" data-action="delete-court" data-id="${esc(c.id)}">${t('deleteBtn')}</button>
      </div></article>`;
  }

  const courtToDraft = c => ({
    id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, descriptionAr: c.descriptionAr, descriptionEn: c.descriptionEn,
    cityId: String(c.cityId), areaId: String(c.areaId), addressAr: c.addressAr, addressEn: c.addressEn,
    lat: c.lat, lng: c.lng, type: c.type, format: c.format ? String(c.format) : '',
    phone: c.phone, whatsapp: c.whatsapp, images: [...c.images], amenities: [...c.amenities],
    prices: c.prices.map(p => ({ ...p })), openTime: c.openTime, closeTime: c.closeTime,
    slotStepMinutes: c.slotStepMinutes || 60, isActive: c.isActive,
  });
  const blankDraft = () => ({
    id: null, nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '', cityId: '', areaId: '',
    addressAr: '', addressEn: '', lat: null, lng: null, type: '', format: '', phone: '', whatsapp: '',
    images: [], amenities: [], prices: [{ minutes: 60, price: null }], openTime: '', closeTime: '',
    slotStepMinutes: 60, isActive: true,
  });
  const courtToPayload = c => ({
    nameAr: c.nameAr, nameEn: c.nameEn, descriptionAr: c.descriptionAr, descriptionEn: c.descriptionEn,
    cityId: idValue(c.cityId), areaId: idValue(c.areaId), addressAr: c.addressAr, addressEn: c.addressEn,
    lat: c.lat, lng: c.lng, type: c.type, format: c.format, phone: c.phone, whatsapp: c.whatsapp,
    images: c.images, amenities: c.amenities, prices: c.prices, openTime: c.openTime,
    closeTime: c.closeTime, slotStepMinutes: c.slotStepMinutes, isActive: c.isActive,
  });

  const field = (label, control, hint = '', cls = '') => `<label class="form-field ${cls}"><span>${label}</span>${control}${hint ? `<small>${hint}</small>` : ''}</label>`;
  const cityFormOptions = d => `<option value="">${t('selectCity')}</option>${state.locations.map(c => `<option value="${esc(c.id)}"${String(c.id) === d.cityId ? ' selected' : ''}>${esc(pick(c.nameAr, c.nameEn))}</option>`).join('')}`;
  function areaFormOptions(d) {
    const city = state.locations.find(c => String(c.id) === d.cityId);
    const areas = city ? city.areas : [];
    return `<option value="">${t('selectArea')}</option>${areas.map(a => `<option value="${esc(a.id)}"${String(a.id) === d.areaId ? ' selected' : ''}>${esc(pick(a.nameAr, a.nameEn))}</option>`).join('')}`;
  }
  function pricesSectionHtml(d) {
    return `<div class="price-rows">${d.prices.map((p, i) => {
      const options = [...new Set([...DURATIONS, p.minutes])].sort((a, b) => a - b);
      return `<div class="price-row-edit">
        <label>${t('priceMinutes')}<select name="priceMinutes">${options.map(m => `<option value="${m}"${m === p.minutes ? ' selected' : ''}>${esc(durationLabel(m))}</option>`).join('')}</select></label>
        <label>${t('priceValue')}<input name="priceValue" type="number" min="0" step="any" inputmode="decimal" dir="ltr" value="${p.price ?? ''}"></label>
        <button type="button" class="btn danger" data-action="remove-price" data-value="${i}">${t('remove')}</button></div>`;
    }).join('')}</div>
    <button type="button" class="btn" data-action="add-price">+ ${t('addPrice')}</button>`;
  }
  function imagesSectionHtml(d) {
    return `<div class="image-list">${d.images.map((url, i) => `<figure class="image-item${i === 0 ? ' main' : ''}">
        <img src="${esc(url)}" alt="" loading="lazy" data-fallback>
        <figcaption>${i === 0 ? `<span class="badge green">${t('mainImage')}</span>` : `<button type="button" class="btn small" data-action="image-main" data-value="${i}">${t('makeMain')}</button>`}
        <button type="button" class="btn danger small" data-action="image-remove" data-value="${i}">${t('remove')}</button></figcaption></figure>`).join('')}</div>
      <div class="image-add">
        <input type="url" id="image-url" placeholder="https://" dir="ltr" aria-label="URL">
        <button type="button" class="btn" data-action="image-add-url">${t('addImageUrl')}</button>
        <label class="btn upload-btn">${t('uploadImage')}<input class="sr-only" type="file" accept="image/*" multiple data-change="image-upload"></label>
      </div>
      <p class="muted" id="upload-status" role="status"></p>`;
  }

  function courtFormHtml(d) {
    const sel = (v, cur) => (String(v) === String(cur) ? ' selected' : '');
    return `<form class="owner-form" data-form="court" novalidate>
      <div class="form-head"><a class="btn" href="#/dashboard/courts">${t('back')}</a><h2>${t(d.id ? 'editCourt' : 'newCourt')}</h2></div>
      <div class="form-error" id="form-error" role="alert" hidden></div>
      <section class="card card-body form-section"><h3>${t('secBasics')}</h3><div class="form-grid">
        ${field(t('nameAr'), `<input name="nameAr" maxlength="120" dir="rtl" value="${esc(d.nameAr)}">`)}
        ${field(t('nameEn'), `<input name="nameEn" maxlength="120" dir="ltr" value="${esc(d.nameEn)}">`)}
        ${field(t('descAr'), `<textarea name="descriptionAr" rows="4" dir="rtl">${esc(d.descriptionAr)}</textarea>`)}
        ${field(t('descEn'), `<textarea name="descriptionEn" rows="4" dir="ltr">${esc(d.descriptionEn)}</textarea>`)}
        ${field(t('type'), `<select name="type"><option value="">${t('selectType')}</option>${COURT_TYPES.map(type => `<option value="${type}"${sel(type, d.type)}>${t(type)}</option>`).join('')}</select>`)}
        ${field(t('format'), `<select name="format"><option value="">${t('notSpecified')}</option>${[...new Set([...FORMATS, ...(d.format ? [Number(d.format)] : [])])].sort((a, b) => a - b).map(n => `<option value="${n}"${sel(n, d.format)}>${n}v${n}</option>`).join('')}</select>`)}
      </div></section>
      <section class="card card-body form-section"><h3>${t('secLocation')}</h3><div class="form-grid">
        ${field(t('city'), `<select name="cityId" id="f-city-form" data-change="form-city">${cityFormOptions(d)}</select>`)}
        ${field(t('area'), `<select name="areaId" id="f-area-form"${d.cityId ? '' : ' disabled'}>${areaFormOptions(d)}</select>`)}
        ${field(t('addressAr'), `<input name="addressAr" dir="rtl" value="${esc(d.addressAr)}">`)}
        ${field(t('addressEn'), `<input name="addressEn" dir="ltr" value="${esc(d.addressEn)}">`)}
        ${field(t('lat'), `<input name="lat" type="number" step="any" dir="ltr" value="${d.lat ?? ''}">`, t('coordsHint'))}
        ${field(t('lng'), `<input name="lng" type="number" step="any" dir="ltr" value="${d.lng ?? ''}">`)}
      </div></section>
      <section class="card card-body form-section"><h3>${t('secContact')}</h3><div class="form-grid">
        ${field(t('phone'), `<input name="phone" type="tel" dir="ltr" value="${esc(d.phone)}">`)}
        ${field(t('whatsapp'), `<input name="whatsapp" type="tel" dir="ltr" value="${esc(d.whatsapp)}">`, t('whatsappHint'))}
      </div></section>
      <section class="card card-body form-section"><h3>${t('secPricing')}</h3><p class="muted">${t('pricesHint')}</p>
        <div id="prices-section">${pricesSectionHtml(d)}</div></section>
      <section class="card card-body form-section"><h3>${t('secHours')}</h3><div class="form-grid">
        ${field(t('openTime'), `<input name="openTime" type="time" dir="ltr" value="${esc(d.openTime)}">`)}
        ${field(t('closeTime'), `<input name="closeTime" type="time" dir="ltr" value="${esc(d.closeTime)}">`)}
        ${field(t('slotStep'), `<select name="slotStepMinutes">${[30, 60].map(m => `<option value="${m}"${sel(m, d.slotStepMinutes)}>${t('minutes', { n: m })}</option>`).join('')}</select>`)}
      </div></section>
      <section class="card card-body form-section"><h3>${t('secPhotos')}</h3><div id="images-section">${imagesSectionHtml(d)}</div></section>
      <section class="card card-body form-section"><h3>${t('secFacilities')}</h3>
        <div class="check-grid">${AMENITIES.map(code => `<label class="check"><input type="checkbox" name="amenities" value="${code}"${d.amenities.includes(code) ? ' checked' : ''}>${esc(amenityLabel(code))}</label>`).join('')}</div></section>
      <section class="card card-body form-section"><h3>${t('secVisibility')}</h3>
        <label class="check"><input type="checkbox" name="isActive"${d.isActive ? ' checked' : ''}>${t('isActive')}</label>
        <p class="muted">${t('isActiveHint')}</p></section>
      <div class="form-error" id="form-error-bottom" role="alert" hidden></div>
      <div class="form-actions"><button class="btn primary" id="form-submit">${t('save')}</button><a class="btn" href="#/dashboard/courts">${t('cancel')}</a></div>
    </form>`;
  }

  async function dashCourtForm(token, id) {
    const o = state.owner;
    const main = dashMain();
    await Promise.all([ensureLocations(), ensureOwnerCourts(true)]);
    if (stale(token)) return;
    let court = null;
    if (id) {
      court = o.courts.find(c => String(c.id) === String(id));
      if (!court) {
        main.innerHTML = stateBox(t('courtNotFound'), '', `<a class="btn" href="#/dashboard/courts">${t('back')}</a>`);
        return;
      }
    }
    if (!state.locations.length) {
      main.innerHTML = stateBox(t('locationsMissing'), t('locationsMissingText'), retryButton('reload-locations'));
      return;
    }
    o.draft = court ? courtToDraft(court) : blankDraft();
    main.innerHTML = courtFormHtml(o.draft);
  }

  function readPriceRows() {
    const mins = $$('[name="priceMinutes"]');
    const vals = $$('[name="priceValue"]');
    return mins.map((m, i) => ({ minutes: Number(m.value), price: vals[i].value === '' ? null : Number(vals[i].value) }));
  }

  function readCourtForm(form) {
    const o = state.owner;
    const fd = new FormData(form);
    const get = k => String(fd.get(k) ?? '').trim();
    const errors = [];
    const prices = readPriceRows();
    const seen = new Set();
    let pricesOk = prices.length > 0;
    prices.forEach(p => {
      if (!(p.minutes > 0) || p.price === null || !(p.price >= 0) || seen.has(p.minutes)) pricesOk = false;
      seen.add(p.minutes);
    });
    if (!get('nameAr') && !get('nameEn')) errors.push(t('errName'));
    if (!get('type')) errors.push(t('errType'));
    if (!get('cityId')) errors.push(t('errCity'));
    if (!get('areaId')) errors.push(t('errArea'));
    if (!validPhone(get('phone')) || (get('whatsapp') && !validPhone(get('whatsapp')))) errors.push(t('errPhone'));
    if (!pricesOk) errors.push(t('errPrices'));
    if (!get('openTime') || !get('closeTime') || get('openTime') === get('closeTime')) errors.push(t('errHours'));
    const lat = numOrNull(get('lat'));
    const lng = numOrNull(get('lng'));
    if ((lat === null) !== (lng === null) || (lat !== null && (lat < -90 || lat > 90)) || (lng !== null && (lng < -180 || lng > 180))) errors.push(t('errCoords'));
    const payload = {
      nameAr: get('nameAr'), nameEn: get('nameEn'),
      descriptionAr: get('descriptionAr'), descriptionEn: get('descriptionEn'),
      cityId: idValue(get('cityId')), areaId: idValue(get('areaId')),
      addressAr: get('addressAr'), addressEn: get('addressEn'), lat, lng,
      type: get('type'), format: numOrNull(get('format')),
      phone: get('phone'), whatsapp: get('whatsapp'),
      images: [...o.draft.images], amenities: fd.getAll('amenities').map(String),
      prices, openTime: get('openTime'), closeTime: get('closeTime'),
      slotStepMinutes: Number(get('slotStepMinutes')) || 60, isActive: fd.get('isActive') === 'on',
    };
    return { payload, errors: [...new Set(errors)] };
  }

  async function submitCourtForm(form) {
    const o = state.owner;
    const { payload, errors } = readCourtForm(form);
    if (errors.length) { showFormError('form-error', errors); return; }
    showFormError('form-error', []);
    const btn = $('#form-submit');
    btn.disabled = true;
    btn.textContent = t('saving');
    try {
      if (o.draft.id !== null && o.draft.id !== undefined) {
        await api(`/owner/courts/${encodeURIComponent(o.draft.id)}`, { method: 'PUT', body: payload });
      } else {
        await api('/owner/courts', { method: 'POST', body: payload });
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = t('save');
      if (!err.handled) showFormError('form-error', err.message);
      return;
    }
    o.courtsLoaded = false;
    toast(t('courtSaved'));
    location.hash = '#/dashboard/courts';
  }

  /* --- Availability --- */
  async function dashAvailability(token) {
    const o = state.owner;
    await ensureOwnerCourts(true);
    if (stale(token)) return;
    if (!o.courts.length) {
      dashMain().innerHTML = `${dashHead(t('tab_availability'))}${stateBox(t('noOwnerCourtsTitle'), t('noOwnerCourtsText'), `<a class="btn primary" href="#/dashboard/courts/new">${t('addNewCourt')}</a>`)}`;
      return;
    }
    if (!o.courts.some(c => String(c.id) === String(o.slotsCourtId))) o.slotsCourtId = String(o.courts[0].id);
    const today = todayStr();
    dashMain().innerHTML = `${dashHead(t('tab_availability'))}
      <div class="filter-bar">
        <label class="field"><span>${t('pickCourt')}</span><select data-change="av-court">${o.courts.map(c => `<option value="${esc(c.id)}"${String(c.id) === String(o.slotsCourtId) ? ' selected' : ''}>${esc(cName(c))}</option>`).join('')}</select></label>
        <label class="field"><span>${t('date')}</span><input type="date" data-change="av-date" value="${esc(o.slotsDate)}" min="${today}" max="${addDays(today, MAX_BOOKING_DAYS)}"></label>
      </div>
      <p class="muted">${t('availabilityHint')}</p>
      ${legendHtml()}
      <div class="slots owner" id="av-slots"></div>
      <div class="actions" style="margin-top:16px">
        <button type="button" class="btn danger" data-action="av-bulk" data-value="close">${t('closeAll')}</button>
        <button type="button" class="btn" data-action="av-bulk" data-value="open">${t('openAll')}</button>
      </div>`;
    await loadOwnerSlots(token);
  }
  async function loadOwnerSlots(token = routeToken) {
    const o = state.owner;
    const box = $('#av-slots');
    if (!box) return;
    const req = ++o.slotsReq;
    box.innerHTML = `<p class="muted">${t('loading')}</p>`;
    try {
      const slots = normalizeSlots(await api(`/owner/courts/${encodeURIComponent(o.slotsCourtId)}/slots`, { query: { date: o.slotsDate } }), o.slotsDate);
      if (stale(token) || req !== o.slotsReq) return;
      o.slots = slots;
      renderOwnerSlots();
    } catch (err) {
      if (stale(token) || req !== o.slotsReq) return;
      box.innerHTML = `<p class="muted">${esc(err.message)}</p>`;
    }
  }
  function renderOwnerSlots() {
    const box = $('#av-slots');
    if (box) box.innerHTML = state.owner.slots.length ? slotGridHtml(state.owner.slots, 'av-toggle') : `<p class="muted">${t('noSlotsDay')}</p>`;
  }
  async function setSlotsBlocked(times, blocked) {
    const o = state.owner;
    if (!times.length) return;
    await api(`/owner/courts/${encodeURIComponent(o.slotsCourtId)}/slots`, { method: 'PUT', body: { date: o.slotsDate, times, blocked } });
    o.slots.forEach(s => { if (times.includes(s.time)) s.status = blocked ? 'blocked' : 'available'; });
    renderOwnerSlots();
    toast(t('slotsUpdated'));
  }

  /* --- Bookings --- */
  async function dashBookings(token) {
    const o = state.owner;
    await ensureOwnerCourts(true);
    if (stale(token)) return;
    const f = o.bookingFilters;
    dashMain().innerHTML = `${dashHead(t('tab_bookings'))}
      <div class="filter-bar">
        <label class="field"><span>${t('pickCourt')}</span><select data-change="bkf-courtId"><option value="">${t('allCourts')}</option>${o.courts.map(c => `<option value="${esc(c.id)}"${String(c.id) === f.courtId ? ' selected' : ''}>${esc(cName(c))}</option>`).join('')}</select></label>
        <label class="field"><span>${t('col_status')}</span><select data-change="bkf-status"><option value="">${t('allStatuses')}</option>${['pending', 'confirmed', 'cancelled'].map(s => `<option value="${s}"${f.status === s ? ' selected' : ''}>${t(`st_${s}`)}</option>`).join('')}</select></label>
        <label class="field"><span>${t('date')}</span><input type="date" data-change="bkf-date" value="${esc(f.date)}" aria-label="${esc(t('anyDate'))}"></label>
      </div>
      <section class="card card-body" id="bk-list"></section>`;
    await loadOwnerBookings(token);
  }
  async function loadOwnerBookings(token = routeToken) {
    const o = state.owner;
    const box = $('#bk-list');
    if (!box) return;
    const req = ++o.bookingsReq;
    box.innerHTML = `<p class="muted">${t('loading')}</p>`;
    try {
      const list = asList(await api('/owner/bookings', { query: o.bookingFilters })).map(normalizeBooking);
      if (stale(token) || req !== o.bookingsReq) return;
      o.bookings = list;
      box.innerHTML = bookingsTableHtml(list);
    } catch (err) {
      if (stale(token) || req !== o.bookingsReq) return;
      box.innerHTML = `<p class="muted">${esc(err.message)}</p>`;
    }
  }
  function reloadBookingViews() {
    if (state.owner.tab === 'bookings') loadOwnerBookings(); else runDashTab();
  }
  const findOwnerBooking = id => state.owner.bookings.find(b => String(b.id) === String(id))
    || state.owner.overviewBookings.find(b => String(b.id) === String(id)) || null;

  /* --- Reschedule a booking to a new date/time on the same court --- */
  function rescheduleModalHtml() {
    const r = state.owner.reschedule;
    const today = todayStr();
    const court = findCourt(r.booking.courtId);
    const courtName = court ? cName(court) : pick(r.booking.courtNameAr, r.booking.courtNameEn);
    return `${modalHead(t('rescheduleFor', { court: courtName }))}
      <form data-form="reschedule">
        <div class="form-group"><label for="rs-date">${t('date')}</label>
          <input type="date" id="rs-date" value="${esc(r.date)}" min="${today}" max="${addDays(today, MAX_BOOKING_DAYS)}" data-change="rs-date" required></div>
        <div class="form-group"><label id="rs-time-label">${t('time')} – ${esc(durationLabel(r.booking.durationMinutes))}</label>
          <div class="slots" id="rs-slots" role="group" aria-labelledby="rs-time-label"></div></div>
        <p class="form-error" id="rs-error" role="alert" hidden></p>
        <button class="btn primary block" id="rs-submit" disabled>${t('confirmReschedule')}</button>
      </form>`;
  }
  function renderRescheduleSlots() {
    const r = state.owner.reschedule;
    const box = $('#rs-slots');
    if (!r || !box) return;
    if (r.status === 'loading') box.innerHTML = `<p class="muted">${t('loading')}</p>`;
    else if (r.status === 'error') box.innerHTML = `<p class="muted">${esc(r.error)}</p>`;
    else if (!r.slots.some(s => s.status === 'available')) box.innerHTML = `<p class="muted">${t('noSlotsFor')}</p>`;
    else box.innerHTML = slotGridHtml(r.slots, 'rs-pick-slot', r.time);
    const submit = $('#rs-submit');
    if (submit) submit.disabled = !r.time || r.busy;
  }
  async function loadRescheduleSlots() {
    const r = state.owner.reschedule;
    if (!r) return;
    const req = ++r.req;
    r.status = 'loading';
    renderRescheduleSlots();
    try {
      const slots = normalizeSlots(await api(`/owner/courts/${encodeURIComponent(r.booking.courtId)}/slots`, {
        query: { date: r.date, excludeBookingId: idValue(r.booking.id) },
      }), r.date);
      if (state.owner.reschedule !== r || req !== r.req) return;
      r.slots = slots;
      r.status = 'ready';
      if (r.time && !slots.some(s => s.time === r.time && s.status === 'available')) r.time = '';
    } catch (err) {
      if (state.owner.reschedule !== r || req !== r.req) return;
      r.status = 'error';
      r.error = err.message;
      r.time = '';
    }
    renderRescheduleSlots();
  }
  function openReschedule(bookingId) {
    const booking = findOwnerBooking(bookingId);
    if (!booking) return;
    openModal('');
    state.owner.reschedule = { booking, date: clampDate(booking.date), time: '', slots: [], status: 'loading', error: '', busy: false, req: 0 };
    setModalHtml(rescheduleModalHtml());
    loadRescheduleSlots();
  }
  async function submitReschedule() {
    const r = state.owner.reschedule;
    if (!r || !r.time || r.busy) return;
    r.busy = true;
    const submit = $('#rs-submit');
    if (submit) { submit.disabled = true; submit.textContent = t('reschedulePending'); }
    showFormError('rs-error', []);
    try {
      await api(`/owner/bookings/${encodeURIComponent(r.booking.id)}`, { method: 'PUT', body: { date: r.date, time: r.time } });
      closeModal();
      toast(t('rescheduleDone'));
      reloadBookingViews();
    } catch (err) {
      r.busy = false;
      if (submit) submit.textContent = t('confirmReschedule');
      if (err.handled) return;
      if (err.status === 409) { r.time = ''; showFormError('rs-error', t('rescheduleTaken')); await loadRescheduleSlots(); }
      else { showFormError('rs-error', err.message); renderRescheduleSlots(); }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */
  function reportError(err) {
    if (err?.handled) return;
    if (!(err instanceof ApiError)) console.error(err);
    toast(err?.message || t('errorGeneric'), 'error');
  }
  function invoke(fn) {
    try {
      const result = fn();
      if (result && typeof result.catch === 'function') result.catch(reportError);
    } catch (err) { reportError(err); }
  }

  function setDraftFromForm() {
    const o = state.owner;
    if (o.draft) o.draft.prices = readPriceRows();
  }
  function renderPricesSection() { const box = $('#prices-section'); if (box) box.innerHTML = pricesSectionHtml(state.owner.draft); }
  function renderImagesSection() { const box = $('#images-section'); if (box) box.innerHTML = imagesSectionHtml(state.owner.draft); }
  function addImageUrl(url) {
    if (!/^(https?:\/\/|\/)/i.test(url)) throw new ApiError(0, t('imageInvalid'));
    const d = state.owner.draft;
    if (!d.images.includes(url)) d.images.push(url);
    renderImagesSection();
  }

  const actions = {
    'toggle-menu'(el) {
      const open = $('#nav').classList.toggle('open');
      el.setAttribute('aria-expanded', String(open));
    },
    'toggle-lang'() {
      state.lang = state.lang === 'ar' ? 'en' : 'ar';
      store.set(STORAGE.lang, state.lang);
      route(true);
    },
    'open-login'() { openLogin('login'); },
    logout() { logout(); },
    'show-owner-contacts'() { showOwnerContacts(); },
    'close-modal'() { closeModal(); },
    backdrop(el, event) { if (event.target === el) closeModal(); },

    'set-time'(el) { state.filters.time = el.dataset.value; rerenderFilters(el); renderResults(); },
    'toggle-filter'(el) { const k = el.dataset.key; state.filters[k] = !state.filters[k]; rerenderFilters(el); renderResults(); },
    'toggle-amenity'(el) {
      const list = state.filters.amenities;
      const code = el.dataset.value;
      state.filters.amenities = list.includes(code) ? list.filter(a => a !== code) : [...list, code];
      rerenderFilters(el);
      renderResults();
    },
    'toggle-more'(el) { state.filtersExpanded = !state.filtersExpanded; rerenderFilters(el); },
    'reset-filters'() {
      const dateChanged = state.filters.date !== todayStr();
      state.filters = defaultFilters();
      renderFilters();
      renderResults();
      if (dateChanged) loadCourts();
    },
    'reload-courts'() { loadCourts(); },
    book(el) {
      const id = el.dataset.id;
      if (state.route === 'detail') { openBooking(id, { date: state.detail.date }); return; }
      const item = computeResults().find(i => String(i.c.id) === id);
      openBooking(id, { date: state.filters.date, time: item?.slots[0] || '' });
    },
    gallery(el) {
      const i = Number(el.dataset.value);
      const url = state.detail.court?.images[i];
      const main = $('#gallery-main');
      if (main && url) main.src = url;
      $$('.thumb').forEach((b, j) => b.classList.toggle('active', j === i));
    },
    'detail-slot'(el) { openBooking(state.detail.court.id, { date: state.detail.date, time: el.dataset.value }); },
    'pick-slot'(el) {
      const b = state.booking;
      if (!b) return;
      b.time = el.dataset.value;
      renderBookingSlots();
      const again = $(`#bk-slots [data-value="${b.time}"]`);
      if (again) again.focus();
    },
    join(el) {
      if (!state.user) { openLogin('login'); return undefined; }
      return api(`/matches/${encodeURIComponent(el.dataset.id)}/join`, { method: 'POST' }).then(() => {
        toast(t('joined'));
        return loadMatches();
      });
    },
    'reload-matches'() { loadMatches(); },
    'reload-dash'() { runDashTab(); },
    'reload-locations'() {
      return ensureLocations(true).then(() => runDashTab());
    },

    'toggle-court'(el) {
      const c = state.owner.courts.find(x => String(x.id) === el.dataset.id);
      if (!c) return undefined;
      const payload = { ...courtToPayload(c), isActive: !c.isActive };
      return api(`/owner/courts/${encodeURIComponent(c.id)}`, { method: 'PUT', body: payload }).then(() => {
        toast(t(payload.isActive ? 'courtVisible' : 'courtHidden'));
        return runDashTab();
      });
    },
    'delete-court'(el) {
      const c = state.owner.courts.find(x => String(x.id) === el.dataset.id);
      if (!c) return;
      openModal(`${modalHead(t('deleteCourt'))}<p>${esc(t('deleteCourtText', { name: cName(c) }))}</p>
        <div class="actions"><button type="button" class="btn" data-action="close-modal">${t('back')}</button>
        <button type="button" class="btn danger" data-action="confirm-delete-court" data-id="${esc(c.id)}">${t('yesDelete')}</button></div>`);
    },
    'confirm-delete-court'(el) {
      const id = el.dataset.id;
      el.disabled = true;
      return api(`/owner/courts/${encodeURIComponent(id)}`, { method: 'DELETE' }).then(() => {
        closeModal();
        state.owner.courtsLoaded = false;
        toast(t('courtDeleted'));
        return runDashTab();
      }).catch(err => { el.disabled = false; throw err; });
    },
    'add-price'() {
      const d = state.owner.draft;
      setDraftFromForm();
      const used = new Set(d.prices.map(p => p.minutes));
      d.prices.push({ minutes: DURATIONS.find(m => !used.has(m)) || 60, price: null });
      renderPricesSection();
      const inputs = $$('[name="priceValue"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    },
    'remove-price'(el) {
      const d = state.owner.draft;
      setDraftFromForm();
      d.prices.splice(Number(el.dataset.value), 1);
      renderPricesSection();
    },
    'image-add-url'() {
      const input = $('#image-url');
      addImageUrl(input.value.trim());
    },
    'image-remove'(el) { state.owner.draft.images.splice(Number(el.dataset.value), 1); renderImagesSection(); },
    'image-main'(el) {
      const imgs = state.owner.draft.images;
      const [picked] = imgs.splice(Number(el.dataset.value), 1);
      imgs.unshift(picked);
      renderImagesSection();
    },
    'av-toggle'(el) {
      const s = state.owner.slots.find(x => x.time === el.dataset.value);
      if (!s) return undefined;
      return setSlotsBlocked([s.time], s.status === 'available');
    },
    'av-bulk'(el) {
      const closing = el.dataset.value === 'close';
      const times = state.owner.slots.filter(s => s.status === (closing ? 'available' : 'blocked')).map(s => s.time);
      return setSlotsBlocked(times, closing);
    },
    'bk-reschedule'(el) { openReschedule(el.dataset.id); },
    'rs-pick-slot'(el) {
      const r = state.owner.reschedule;
      if (!r) return;
      r.time = el.dataset.value;
      renderRescheduleSlots();
      const again = $(`#rs-slots [data-value="${r.time}"]`);
      if (again) again.focus();
    },
    'bk-confirm'(el) {
      return api(`/owner/bookings/${encodeURIComponent(el.dataset.id)}/confirm`, { method: 'POST' }).then(() => {
        toast(t('bookingConfirmed'));
        reloadBookingViews();
      });
    },
    'bk-cancel'(el) {
      openModal(`${modalHead(t('cancelBooking'))}<p>${t('cancelBookingText')}</p>
        <div class="actions"><button type="button" class="btn" data-action="close-modal">${t('back')}</button>
        <button type="button" class="btn danger" data-action="confirm-cancel-booking" data-id="${esc(el.dataset.id)}">${t('yesCancel')}</button></div>`);
    },
    'confirm-cancel-booking'(el) {
      el.disabled = true;
      return api(`/owner/bookings/${encodeURIComponent(el.dataset.id)}/cancel`, { method: 'POST' }).then(() => {
        closeModal();
        toast(t('bookingCancelled'));
        reloadBookingViews();
      }).catch(err => { el.disabled = false; throw err; });
    },
  };

  const scheduleResults = debounce(() => {
    renderResults();
    const btn = $('#more-btn');
    if (btn) btn.textContent = moreLabel();
  }, 150);

  const inputs = {
    q(el) { state.filters.q = el.value; scheduleResults(); },
    min(el) { state.filters.min = el.value; scheduleResults(); },
    max(el) { state.filters.max = el.value; scheduleResults(); },
  };

  const changes = {
    cityId(el) { state.filters.cityId = el.value; state.filters.areaId = ''; rerenderFilters(el); renderResults(); },
    areaId(el) { state.filters.areaId = el.value; renderResults(); },
    date(el) {
      const f = state.filters;
      const next = clampDate(el.value);
      if (next === f.date) { el.value = next; return; }
      f.date = next;
      if (f.time === 'now' && next !== todayStr()) f.time = '';
      rerenderFilters(el);
      loadCourts();
    },
    type(el) { state.filters.type = el.value; renderResults(); const b = $('#more-btn'); if (b) b.textContent = moreLabel(); },
    format(el) { state.filters.format = el.value; renderResults(); const b = $('#more-btn'); if (b) b.textContent = moreLabel(); },
    rating(el) { state.filters.rating = el.value; renderResults(); const b = $('#more-btn'); if (b) b.textContent = moreLabel(); },
    sort(el) { state.filters.sort = el.value; renderResults(); },
    'detail-date'(el) {
      state.detail.date = clampDate(el.value);
      el.value = state.detail.date;
      const label = $('#detail-date-label');
      if (label) label.textContent = formatDate(state.detail.date);
      return loadDetailSlots();
    },
    'rs-date'(el) {
      const r = state.owner.reschedule;
      if (!r) return undefined;
      r.date = clampDate(el.value);
      el.value = r.date;
      r.time = '';
      return loadRescheduleSlots();
    },
    'bk-date'(el) {
      const b = state.booking;
      if (!b) return undefined;
      b.date = clampDate(el.value);
      el.value = b.date;
      b.time = '';
      return loadBookingSlots();
    },
    'bk-duration'(el) {
      const b = state.booking;
      if (!b) return undefined;
      b.duration = Number(el.value);
      b.time = '';
      return loadBookingSlots();
    },
    'form-city'(el) {
      const d = state.owner.draft;
      d.cityId = el.value;
      d.areaId = '';
      const area = $('#f-area-form');
      area.innerHTML = areaFormOptions(d);
      area.disabled = !d.cityId;
    },
    async 'image-upload'(el) {
      const files = Array.from(el.files || []);
      if (!files.length) return;
      const status = $('#upload-status');
      if (status) status.textContent = t('uploading');
      try {
        for (const file of files) {
          const fd = new FormData();
          fd.append('file', file);
          const res = await api('/owner/uploads', { method: 'POST', formData: fd });
          if (!res?.url) throw new ApiError(0, t('uploadFailed'));
          const d = state.owner.draft;
          if (!d.images.includes(res.url)) d.images.push(res.url);
        }
      } finally {
        renderImagesSection();
      }
    },
    'av-court'(el) { state.owner.slotsCourtId = el.value; return loadOwnerSlots(); },
    'av-date'(el) {
      state.owner.slotsDate = clampDate(el.value);
      el.value = state.owner.slotsDate;
      return loadOwnerSlots();
    },
    'bkf-courtId'(el) { state.owner.bookingFilters.courtId = el.value; return loadOwnerBookings(); },
    'bkf-status'(el) { state.owner.bookingFilters.status = el.value; return loadOwnerBookings(); },
    'bkf-date'(el) { state.owner.bookingFilters.date = el.value; return loadOwnerBookings(); },
  };

  const forms = {
    booking: submitBooking,
    court: submitCourtForm,
    reschedule: submitReschedule,
    'owner-create': submitOwnerCreate,
    'superadmin-create': submitSuperAdminCreate,
    'reload-admin'() { route(true); },
  };

  document.addEventListener('click', event => {
    const el = event.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const handler = actions[el.dataset.action];
    if (handler) invoke(() => handler(el, event));
  });
  document.addEventListener('change', event => {
    const el = event.target.closest('[data-change]');
    const handler = el && changes[el.dataset.change];
    if (handler) invoke(() => handler(el, event));
  });
  document.addEventListener('input', event => {
    const el = event.target.closest('[data-input]');
    const handler = el && inputs[el.dataset.input];
    if (handler) invoke(() => handler(el, event));
  });
  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-form]');
    const handler = form && forms[form.dataset.form];
    if (!handler) return;
    event.preventDefault();
    invoke(() => handler(form));
  });
  document.addEventListener('keydown', event => {
    const modal = $('#modal');
    if (!modal) return;
    if (event.key === 'Escape') { closeModal(); return; }
    if (event.key !== 'Tab') return;
    const focusable = $$('a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled)', modal);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  /* Broken images fall back to the ball placeholder (error events do not bubble, so use capture). */
  document.addEventListener('error', event => {
    const img = event.target;
    if (img instanceof HTMLImageElement && img.hasAttribute('data-fallback')) {
      const wrap = document.createElement('div');
      wrap.innerHTML = placeholderHtml(img.classList.contains('gallery-main') ? 'gallery-main' : '');
      img.replaceWith(wrap.firstElementChild);
    }
  }, true);

  /* ------------------------------------------------------------------ */
  /* Router                                                              */
  /* ------------------------------------------------------------------ */
  function route(keepScroll = false) {
    routeToken += 1;
    closeModal();
    const parts = (location.hash.slice(1) || '/').split('?')[0].split('/').filter(Boolean);
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t('title');
    if (!keepScroll) window.scrollTo(0, 0);
    if (parts[0] === 'matches') renderMatches();
    else if (parts[0] === 'admin') renderSuperAdmin(parts);
    else if (parts[0] === 'dashboard') renderDashboard(parts);
    else if (parts[0] === 'court' && parts[1]) renderCourtDetail(decodeURIComponent(parts[1]));
    else renderHome();
  }

  window.addEventListener('hashchange', () => route());
  async function bootstrapSession() {
    clearSession();
    try {
      const response = await fetch(buildUrl('/auth/csrf'), { credentials: 'include' });
      if (response.ok) state.csrfToken = (await response.json()).token || '';
    } catch { /* The public court browser remains usable when the API is offline. */ }
    await refreshUser();
    if (isOwner() && onHomeHash()) location.hash = '#/dashboard';
    else if (isSuperAdmin() && onHomeHash()) location.hash = '#/admin';
    else route();
  }
  bootstrapSession();
})();
