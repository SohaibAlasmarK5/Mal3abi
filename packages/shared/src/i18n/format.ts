import type { Locale } from "./index";

/**
 * Locale formatting shared by the website and the app.
 * Jordan time zone everywhere. Western digits in both languages (0-9), as used on
 * Jordanian booking sites, phones and receipts.
 */
export const timeZone = "Asia/Amman";
export const currency = "JOD";

const intlLocales: Record<Locale, string> = {
  ar: "ar-JO-u-nu-latn",
  en: "en-GB",
};

export function intlLocale(locale: Locale): string {
  return intlLocales[locale];
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}

/** Price in Jordanian dinars. Whole amounts have no decimals: "10 JOD", "7.5 JOD". */
export function formatPrice(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    currencyDisplay: locale === "ar" ? "symbol" : "code",
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(amount);
}

/** Full date, for example "الخميس، 12 تشرين الثاني 2026" or "Thursday, 12 November 2026". */
export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Short date, for example "12/11/2026". */
export function formatShortDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Clock time on a 12-hour clock, for example "5:30 م" or "5:30 pm". */
export function formatTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
