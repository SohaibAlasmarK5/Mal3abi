/**
 * Realistic sample data for development, typed with the generated contract types, so a
 * renamed or removed field breaks the build here too. Sports and cities stand in for the
 * admin-managed lists in the database.
 */
import type {
  Account,
  AvailabilitySlot,
  Booking,
  City,
  CourtDetail,
  Role,
  SlotStatus,
  Sport,
} from "../generated/model";

export const sports: Sport[] = [
  {
    id: "football",
    name: { ar: "كرة القدم", en: "Football" },
    icon: "football",
    sortOrder: 1,
    defaultPlayers: 10,
    defaultDurationMinutes: 60,
  },
  {
    id: "padel",
    name: { ar: "البادل", en: "Padel" },
    icon: "padel",
    sortOrder: 2,
    defaultPlayers: 4,
    defaultDurationMinutes: 90,
  },
];

export const cities: City[] = [
  {
    id: "amman",
    name: { ar: "عمّان", en: "Amman" },
    areas: [
      { id: "khalda", name: { ar: "خلدا", en: "Khalda" } },
      { id: "abdoun", name: { ar: "عبدون", en: "Abdoun" } },
      { id: "tlaa-al-ali", name: { ar: "تلاع العلي", en: "Tla' Al-Ali" } },
      { id: "marj-al-hamam", name: { ar: "مرج الحمام", en: "Marj Al-Hamam" } },
    ],
  },
  {
    id: "irbid",
    name: { ar: "إربد", en: "Irbid" },
    areas: [{ id: "university-street", name: { ar: "شارع الجامعة", en: "University Street" } }],
  },
  {
    id: "zarqa",
    name: { ar: "الزرقاء", en: "Zarqa" },
    areas: [{ id: "new-zarqa", name: { ar: "الزرقاء الجديدة", en: "New Zarqa" } }],
  },
  {
    id: "aqaba",
    name: { ar: "العقبة", en: "Aqaba" },
    areas: [{ id: "al-shallaleh", name: { ar: "الشلالة", en: "Al-Shallaleh" } }],
  },
];

const commonPolicy = {
  ar: "يمكن الإلغاء مجاناً قبل الموعد بست ساعات. بعد ذلك يُرجى التواصل مع الملعب.",
  en: "Free cancellation up to six hours before. After that, please contact the court.",
};

export const courts: CourtDetail[] = [
  {
    id: "elite-khalda",
    name: { ar: "ملعب النخبة", en: "Elite Court" },
    cityId: "amman",
    areaId: "khalda",
    location: { lat: 31.9946, lng: 35.8402 },
    coverPhotoUrl: null,
    sportIds: ["football"],
    pitchCount: 3,
    priceFrom: 20,
    rating: { average: 4.6, count: 128 },
    isFeatured: true,
    needsApproval: false,
    phone: "0791234567",
    address: { ar: "خلدا، شارع وصفي التل", en: "Khalda, Wasfi Al-Tal Street" },
    photos: [],
    paymentMethods: ["cliq", "cash"],
    requiresPrepayment: false,
    cancellationPolicy: commonPolicy,
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/elitecourt.jo" },
      { platform: "whatsapp", url: "https://wa.me/962791234567" },
    ],
    pitches: [
      {
        id: "elite-1",
        name: { ar: "الأرضية 1", en: "Pitch 1" },
        sportId: "football",
        surface: "artificial grass",
        size: "5v5",
        minDurationMinutes: 60,
        maxDurationMinutes: 120,
      },
      {
        id: "elite-2",
        name: { ar: "الأرضية 2", en: "Pitch 2" },
        sportId: "football",
        surface: "artificial grass",
        size: "6v6",
        minDurationMinutes: 60,
        maxDurationMinutes: 120,
      },
      {
        id: "elite-3",
        name: { ar: "الأرضية 3", en: "Pitch 3" },
        sportId: "football",
        surface: "artificial grass",
        size: "7v7",
        minDurationMinutes: 60,
        maxDurationMinutes: 180,
      },
    ],
  },
  {
    id: "padel-abdoun",
    name: { ar: "بادل عبدون", en: "Abdoun Padel" },
    cityId: "amman",
    areaId: "abdoun",
    location: { lat: 31.9498, lng: 35.8795 },
    coverPhotoUrl: null,
    sportIds: ["padel"],
    pitchCount: 2,
    priceFrom: 24,
    rating: { average: 4.8, count: 64 },
    isFeatured: false,
    needsApproval: true,
    phone: "0789876543",
    address: { ar: "عبدون، شارع القاهرة", en: "Abdoun, Cairo Street" },
    photos: [],
    paymentMethods: ["cliq", "cash", "visa"],
    requiresPrepayment: true,
    cancellationPolicy: commonPolicy,
    socialLinks: [{ platform: "instagram", url: "https://instagram.com/abdounpadel" }],
    pitches: [
      {
        id: "abdoun-p1",
        name: { ar: "الملعب الزجاجي", en: "Glass Court" },
        sportId: "padel",
        surface: null,
        size: null,
        minDurationMinutes: 60,
        maxDurationMinutes: 120,
      },
      {
        id: "abdoun-p2",
        name: { ar: "الملعب الخارجي", en: "Outdoor Court" },
        sportId: "padel",
        surface: null,
        size: null,
        minDurationMinutes: 60,
        maxDurationMinutes: 120,
      },
    ],
  },
  {
    id: "north-irbid",
    name: { ar: "ملعب الشمال", en: null },
    cityId: "irbid",
    areaId: "university-street",
    location: { lat: 32.5364, lng: 35.8558 },
    coverPhotoUrl: null,
    sportIds: ["football", "padel"],
    pitchCount: 2,
    priceFrom: 15,
    rating: { average: 4.2, count: 37 },
    isFeatured: false,
    needsApproval: false,
    phone: "0771112233",
    address: { ar: "إربد، شارع الجامعة", en: null },
    photos: [],
    paymentMethods: ["cash"],
    requiresPrepayment: false,
    cancellationPolicy: { ar: "الإلغاء قبل الموعد بثلاث ساعات على الأقل.", en: null },
    socialLinks: [],
    pitches: [
      {
        id: "north-1",
        name: { ar: "ملعب كرة القدم", en: "Football pitch" },
        sportId: "football",
        surface: "artificial grass",
        size: "5v5",
        minDurationMinutes: 60,
        maxDurationMinutes: 120,
      },
      {
        id: "north-2",
        name: { ar: "ملعب البادل", en: "Padel court" },
        sportId: "padel",
        surface: null,
        size: null,
        minDurationMinutes: 60,
        maxDurationMinutes: 120,
      },
    ],
  },
  {
    id: "sea-aqaba",
    name: { ar: "ملاعب البحر", en: "Sea Courts" },
    cityId: "aqaba",
    areaId: "al-shallaleh",
    location: { lat: 29.5321, lng: 35.0063 },
    coverPhotoUrl: null,
    sportIds: ["football"],
    pitchCount: 1,
    priceFrom: 18,
    rating: { average: 4.0, count: 12 },
    isFeatured: false,
    needsApproval: false,
    phone: "0795554444",
    address: { ar: "العقبة، الشلالة", en: "Aqaba, Al-Shallaleh" },
    photos: [],
    paymentMethods: ["cash", "cliq"],
    requiresPrepayment: false,
    cancellationPolicy: commonPolicy,
    socialLinks: [],
    pitches: [
      {
        id: "sea-1",
        name: { ar: "الأرضية الرئيسية", en: "Main pitch" },
        sportId: "football",
        surface: "artificial grass",
        size: "7v7",
        minDurationMinutes: 60,
        maxDurationMinutes: 180,
      },
    ],
  },
];

/** Sample accounts for the mock session switcher. */
export type MockRole = "anonymous" | "player" | "playerUnverified" | "owner" | "admin";
export const mockRoles: MockRole[] = ["anonymous", "player", "playerUnverified", "owner", "admin"];

const accountRole: Record<Exclude<MockRole, "anonymous">, Role> = {
  player: "player",
  playerUnverified: "player",
  owner: "owner",
  admin: "admin",
};

export function mockAccount(role: Exclude<MockRole, "anonymous">): Account {
  return {
    id: `mock-${role}`,
    name: {
      player: "أحمد خالد",
      playerUnverified: "ليلى حسن",
      owner: "سامر عودة",
      admin: "مدير ملعبي",
    }[role],
    username: role,
    email: `${role.toLowerCase()}@example.com`,
    phone: "0790000000",
    photoUrl: null,
    role: accountRole[role],
    emailConfirmed: role !== "playerUnverified",
    twoFactorEnabled: role === "admin" || role === "owner",
  };
}

/** Amman is UTC+3 all year. */
function ammanIso(date: string, minutes: number): string {
  const h = String(Math.floor(minutes / 60) % 24).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${date}T${h}:${m}:00+03:00`;
}

/** Half-hour slots from 08:00 to 24:00, with a fixed pattern of taken and requested slots. */
export function availabilityFor(
  court: CourtDetail,
  date: string,
  pitchId?: string,
): AvailabilitySlot[] {
  const pitches = court.pitches.filter((pitch) => !pitchId || pitch.id === pitchId);
  return pitches.flatMap((pitch, pitchIndex) =>
    Array.from({ length: 32 }, (_, i) => {
      const start = 8 * 60 + i * 30;
      const pattern = (i + pitchIndex * 3) % 7;
      const status: SlotStatus =
        pattern === 2 || pattern === 3 ? "booked" : pattern === 5 ? "requested" : "available";
      return {
        pitchId: pitch.id,
        start: ammanIso(date, start),
        end: ammanIso(date, start + 30),
        status: start >= 23 * 60 ? "closed" : status,
        pricePerHour: start >= 18 * 60 ? court.priceFrom + 6 : court.priceFrom,
      };
    }),
  );
}

const courtName = (id: string) => courts.find((court) => court.id === id)?.name ?? {};

export const myBookings: Booking[] = [
  {
    id: "b-1001",
    courtId: "elite-khalda",
    courtName: courtName("elite-khalda"),
    pitchId: "elite-2",
    pitchName: { ar: "الأرضية 2", en: "Pitch 2" },
    start: "2026-11-14T18:00:00+03:00",
    end: "2026-11-14T19:30:00+03:00",
    status: "confirmed",
    totalPrice: 33,
    priceBreakdown: [
      { start: "2026-11-14T18:00:00+03:00", end: "2026-11-14T19:30:00+03:00", amount: 33 },
    ],
    isOpenMatch: true,
    missingPlayers: 2,
  },
  {
    id: "b-1002",
    courtId: "padel-abdoun",
    courtName: courtName("padel-abdoun"),
    pitchId: "abdoun-p1",
    pitchName: { ar: "الملعب الزجاجي", en: "Glass Court" },
    start: "2026-11-16T20:00:00+03:00",
    end: "2026-11-16T21:30:00+03:00",
    status: "pending",
    totalPrice: 45,
    priceBreakdown: [
      { start: "2026-11-16T20:00:00+03:00", end: "2026-11-16T21:30:00+03:00", amount: 45 },
    ],
    isOpenMatch: false,
    missingPlayers: null,
  },
  {
    id: "b-0990",
    courtId: "north-irbid",
    courtName: courtName("north-irbid"),
    pitchId: "north-1",
    pitchName: { ar: "ملعب كرة القدم", en: "Football pitch" },
    start: "2026-11-05T17:00:00+03:00",
    end: "2026-11-05T18:00:00+03:00",
    status: "completed",
    totalPrice: 15,
    priceBreakdown: [
      { start: "2026-11-05T17:00:00+03:00", end: "2026-11-05T18:00:00+03:00", amount: 15 },
    ],
    isOpenMatch: false,
    missingPlayers: null,
  },
];
