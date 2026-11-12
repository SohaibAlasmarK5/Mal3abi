"use client";

import { isApiError } from "@mal3abi/shared/api";
import { useTranslations } from "next-intl";

const keys = {
  network_error: "network",
  unauthorized: "unauthorized",
  email_not_verified: "emailNotVerified",
  forbidden: "forbidden",
  csrf_invalid: "csrf",
  not_found: "notFound",
  validation_failed: "validation",
  slot_taken: "slotTaken",
  booking_limit_reached: "bookingLimit",
  account_suspended: "accountSuspended",
  server_error: "server",
  unknown: "unknown",
} as const;

export type ErrorMessageKey = (typeof keys)[keyof typeof keys];

/** The message key for any thrown value. Backend text is never shown as-is. */
export function errorMessageKey(error: unknown): ErrorMessageKey {
  if (!isApiError(error)) return "unknown";
  return keys[error.code] ?? "unknown";
}

/** A function that turns any error into a message in the active language. */
export function useErrorMessage() {
  const t = useTranslations("errors");
  return (error: unknown) => t(errorMessageKey(error));
}
