import { useLocale } from "next-intl";
import {
  formatClock,
  formatDate,
  formatNumber,
  formatPrice,
  formatShortDate,
  formatTime,
  type Locale,
} from "@mal3abi/shared/i18n";

/** Formatting bound to a locale. Use this rather than toLocaleString or Intl directly. */
export function formatterFor(locale: Locale) {
  return {
    number: (value: number) => formatNumber(value, locale),
    price: (amount: number) => formatPrice(amount, locale),
    date: (date: Date) => formatDate(date, locale),
    shortDate: (date: Date) => formatShortDate(date, locale),
    time: (date: Date) => formatTime(date, locale),
    clock: (value: string) => formatClock(value, locale),
  };
}

/** Formatting in the active language. Works in server and client components. */
export function useFormat() {
  return formatterFor(useLocale());
}
