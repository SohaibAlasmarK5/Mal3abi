export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

/** Arabic is the default language of the platform. */
export const defaultLocale: Locale = "ar";

export type Direction = "rtl" | "ltr";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function directionOf(locale: Locale): Direction {
  return locale === "ar" ? "rtl" : "ltr";
}

export * from "./format";
export * from "./localized";
