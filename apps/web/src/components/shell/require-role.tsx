"use client";

import type { Role } from "@mal3abi/shared/api";
import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { hasRole, useSession, useSignIn } from "@/lib/session";
import { NotAuthorized } from "./not-authorized";

type Props = {
  /** Roles that may open the page. Empty: any signed-in user. Admins can always open it. */
  roles?: Role[];
  children: ReactNode;
};

/**
 * Protects a page in the browser. Signed out: go to sign-in and come back to this page.
 * Wrong role: "not authorized". The backend still checks every request on its side.
 */
export function RequireRole({ roles = [], children }: Props) {
  const t = useTranslations("shell");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const session = useSession();
  const signIn = useSignIn();

  useEffect(() => {
    if (session.status === "signedOut") signIn();
  }, [session.status, signIn]);

  if (session.status === "loading") return <LoadingState className="m-4 border-0" />;
  if (session.status === "signedOut")
    return <LoadingState label={t("redirecting")} className="m-4 border-0" />;
  if (session.status === "error") {
    // The backend is unreachable: say so instead of sending the user to sign in.
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        <ErrorState
          description={tErrors("network")}
          action={
            <Button variant="secondary" onClick={session.retry}>
              {tCommon("retry")}
            </Button>
          }
        />
      </div>
    );
  }
  if (roles.length > 0 && !hasRole(session.account, ...roles)) return <NotAuthorized />;
  return children;
}
