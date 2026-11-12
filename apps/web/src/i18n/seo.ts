import type { Metadata } from "next";
import type { Locale } from "@mal3abi/shared/i18n";
import { routing } from "./routing";

/**
 * Canonical URL and hreflang links for a page.
 * `path` is the page path without the locale, for example "" or "/courts/123".
 */
export function localeAlternates(locale: Locale, path = ""): Metadata["alternates"] {
  const languages = Object.fromEntries(
    routing.locales.map((code) => [code, `/${code}${path}`]),
  ) as Record<Locale, string>;

  return {
    canonical: `/${locale}${path}`,
    languages: { ...languages, "x-default": `/${routing.defaultLocale}${path}` },
  };
}
