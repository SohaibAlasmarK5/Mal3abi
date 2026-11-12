import type { Locale } from "@mal3abi/shared/i18n";
import ar from "@mal3abi/shared/messages/ar.json";
import en from "@mal3abi/shared/messages/en.json";

export type Messages = typeof ar;

export const messages: Record<Locale, Messages> = { ar, en };
