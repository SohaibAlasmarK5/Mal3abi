"use client";

import { logout, useGetMe, type Account, type Role } from "@mal3abi/shared/api";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { signInUrl } from "./api";

export type Session =
  | { status: "loading"; account: null }
  | { status: "signedOut"; account: null }
  | { status: "signedIn"; account: Account };

/**
 * The current session. The backend keeps it in an HttpOnly cookie; the website stores no tokens
 * and only asks /api/auth/me who is signed in.
 */
export function useSession(): Session {
  const me = useGetMe({ query: { retry: false, staleTime: 5 * 60_000 } });
  if (me.isPending) return { status: "loading", account: null };
  if (me.data) return { status: "signedIn", account: me.data };
  // 401 means signed out. Any other error (backend unreachable) is also treated as signed out;
  // the page that needs data shows its own error state.
  return { status: "signedOut", account: null };
}

/** Admins can see everything; other roles see only their own areas. */
export function hasRole(account: Account | null, ...roles: Role[]): boolean {
  if (!account) return false;
  return account.role === "admin" || roles.includes(account.role);
}

export function useSignIn() {
  return useCallback((returnTo?: string) => window.location.assign(signInUrl(returnTo)), []);
}

/** Ends the session, forgets every cached response, and returns to the home page. */
export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    await logout();
    queryClient.clear();
    router.replace("/");
  }, [queryClient, router]);
}
