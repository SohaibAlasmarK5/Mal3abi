// Front-end settings. Loaded before app.js.
// This file is public, so never put secrets in it.
window.APP_SETTINGS = {
  // Base URL of your backend API, without a trailing slash.
  apiBase: 'http://localhost:5000/api',

  // How many days ahead a player can book.
  maxBookingDays: 30,

  // Shown when someone taps "Add your court".
  // Example: { labelAr: 'إدارة الملاعب', labelEn: 'Court management', phone: '+962 7X XXX XXXX' }
  ownerContacts: []
};
