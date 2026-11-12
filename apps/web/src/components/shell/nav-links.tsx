"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { isActive, mainNav } from "./nav-items";

type Props = {
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
  className?: string;
};

export function NavLinks({ orientation = "horizontal", onNavigate, className }: Props) {
  const t = useTranslations("shell");
  const pathname = usePathname();
  const session = useSession();

  return (
    <nav aria-label={t("mainNav")} className={className}>
      <ul
        className={cn(
          "flex",
          orientation === "horizontal" ? "items-center gap-1" : "flex-col gap-1",
        )}
      >
        {mainNav(session.account).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "h-control rounded-control text-muted hover:bg-accent-soft hover:text-ink flex items-center px-3 font-medium",
                  active && "bg-accent-soft text-ink font-semibold",
                )}
              >
                {t(`nav.${item.key}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
