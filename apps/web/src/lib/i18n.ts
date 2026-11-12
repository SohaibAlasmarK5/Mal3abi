import type { Locale } from "@mal3abi/shared/i18n";
import ar from "@mal3abi/shared/messages/ar.json";
import en from "@mal3abi/shared/messages/en.json";

export type Messages = typeof ar;

const messages: Record<Locale, Messages> = { ar, en };

/** Temporary loader. KAN-41 replaces it with next-intl. */
export function getMessages(locale: Locale): Messages {
  return messages[locale];
}
