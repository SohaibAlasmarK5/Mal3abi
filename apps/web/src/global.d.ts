import type { Locale } from "@mal3abi/shared/i18n";
import type { Messages } from "./i18n/messages";

// Type-safe translation keys: a missing or misspelled key is a type error.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
