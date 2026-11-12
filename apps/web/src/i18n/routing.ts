import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "@mal3abi/shared/i18n";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Every URL carries its language: /ar/... and /en/...
  localePrefix: "always",
});
