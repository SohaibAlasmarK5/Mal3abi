"use client";

import { mockRoles, setMockRole, type MockRole } from "@mal3abi/shared/api/mocks";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Only same-site paths, so the return link cannot send people to another website. */
function safeReturnTo(fallback: string): string {
  const value = new URLSearchParams(window.location.search).get("returnTo");
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function MockSignIn() {
  const t = useTranslations("devSignIn");
  const locale = useLocale();

  function choose(role: MockRole) {
    setMockRole(role);
    window.location.assign(safeReturnTo(`/${locale}`));
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("intro")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {mockRoles.map((role) => (
            <Button
              key={role}
              variant={role === "player" ? "primary" : "secondary"}
              block
              onClick={() => choose(role)}
            >
              {t(`roles.${role}`)}
            </Button>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
