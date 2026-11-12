"use client";

import { isApiError, logout, useGetMe, type Account } from "@mal3abi/shared/api";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { signInUrl } from "./api";

export type Session =
  | { status: "loading"; account: null }
  | { status: "signedOut"; account: null }
  /** The backend could not be reached or failed; we do not know who is signed in. */
  | { status: "error"; account: null; retry: () => void }
  | { status: "signedIn"; account: Account };

/**
 * The current session. The backend keeps it in an HttpOnly cookie; the website stores no tokens
 * and only asks /api/auth/me who is signed in.
 */
export function useSession(): Session {
  const me = useGetMe({ query: { retry: false, staleTime: 5 * 60_000 } });
  if (me.isPending) return { status: "loading", account: null };
  if (me.data) return { status: "signedIn", account: me.data };
  if (isApiError(me.error) && me.error.status === 401)
    return { status: "signedOut", account: null };
  return { status: "error", account: null, retry: () => void me.refetch() };
}

export { hasRole } from "./roles";

export function useSignIn() {
  return useCallback((returnTo?: string) => window.location.assign(signInUrl(returnTo)), []);
}

/**
 * Ends the session, forgets every cached response, and returns to the home page. The site
 * forgets the session even if the logout call fails, so nobody stays shown as signed in.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    try {
      await logout();
    } finally {
      queryClient.clear();
      router.replace("/");
    }
  }, [queryClient, router]);
}
