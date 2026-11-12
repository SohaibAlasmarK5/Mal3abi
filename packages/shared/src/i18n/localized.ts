import { locales, type Locale } from "./index";

/** Text stored in both languages, as the backend returns it for courts, sports, cities and areas. */
export type LocalizedText = Partial<Record<Locale, string | null>>;

/** The text in the requested language, or the other language when that one is missing. */
export function localized(text: LocalizedText | null | undefined, locale: Locale): string {
  if (!text) return "";
  const preferred = text[locale]?.trim();
  if (preferred) return preferred;
  for (const other of locales) {
    const fallback = text[other]?.trim();
    if (fallback) return fallback;
  }
  return "";
}
