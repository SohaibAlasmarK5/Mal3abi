"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "./account-menu";
import { DashboardLink } from "./dashboard-link";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { QuickSearch } from "./quick-search";

/** The phone menu: a panel from the start side with the same links, search and toggles. */
export function MobileMenu() {
  const t = useTranslations("shell");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="secondary" size="icon" aria-label={t("menu.open")}>
          <Menu aria-hidden />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-ink/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50" />
        <DialogPrimitive.Content className="border-line bg-surface text-ink data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-y-0 start-0 z-50 flex w-[min(20rem,85vw)] flex-col gap-5 overflow-y-auto border-e p-4">
          <div className="flex items-center justify-between gap-2">
            <Logo onNavigate={close} />
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label={tCommon("close")}>
                <X aria-hidden />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Title className="sr-only">{t("menu.title")}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {t("mainNav")}
          </DialogPrimitive.Description>

          <QuickSearch onSubmitted={close} />
          <NavLinks orientation="vertical" onNavigate={close} />
          <DashboardLink onNavigate={close} className="justify-start" />

          <div className="border-line mt-auto flex flex-col gap-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LocaleSwitcher className="flex-1 justify-center" />
            </div>
            <AccountMenu className="w-full justify-start" />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
