"use client";

import { configureApi, getCsrfToken, type ApiError } from "@mal3abi/shared/api";
import { apiMocking } from "./mocking";

let csrfToken: string | null = null;

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

async function csrf({ refresh = false } = {}): Promise<string | null> {
  if (!refresh) {
    csrfToken ??= readCookie("XSRF-TOKEN");
    if (csrfToken) return csrfToken;
  }
  csrfToken = (await getCsrfToken()).token;
  return csrfToken;
}

function currentLocale(): string {
  return document.documentElement.lang || "ar";
}

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

/** Where to send someone who must sign in. Real sign-in is the Auth Center (through Mal3abi.BE). */
export function signInUrl(returnTo = currentPath()): string {
  if (apiMocking) return `/${currentLocale()}/dev/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
  return `/api/auth/login?returnUrl=${encodeURIComponent(returnTo)}`;
}

export function verifyEmailUrl(returnTo = currentPath()): string {
  return `/${currentLocale()}/verify-email?returnTo=${encodeURIComponent(returnTo)}`;
}

function handleError(error: ApiError, request: { url: string }) {
  // Asking "who is signed in" is allowed to answer 401: that just means signed out.
  if (error.code === "unauthorized" && !request.url.startsWith("/api/auth/me")) {
    window.location.assign(signInUrl());
  } else if (error.code === "email_not_verified") {
    window.location.assign(verifyEmailUrl());
  }
}

let configured = false;

/** Points the shared API client at this website. Called once by the providers. */
export function setUpApi() {
  if (configured) return;
  configured = true;
  configureApi({
    baseUrl: "",
    getLocale: currentLocale,
    getCsrfToken: csrf,
    onError: handleError,
    // With mocks on, requests are answered in the browser by the shared mock handlers.
    fetch: apiMocking
      ? (request) => import("@mal3abi/shared/api/mocks").then(({ mockFetch }) => mockFetch(request))
      : undefined,
  });
}
