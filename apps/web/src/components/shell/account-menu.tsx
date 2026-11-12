"use client";

import {
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";
import { hasRole, useSession, useSignIn, useSignOut } from "@/lib/session";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

/** Sign-in button when signed out; the account menu when signed in. */
export function AccountMenu({ className }: { className?: string }) {
  const t = useTranslations("shell.account");
  const tSession = useTranslations("session");
  const session = useSession();
  const signIn = useSignIn();
  const signOut = useSignOut();

  if (session.status === "loading") return <Skeleton className={cn("h-control w-28", className)} />;

  if (session.status === "signedOut") {
    return (
      <Button className={className} onClick={() => signIn()}>
        {tSession("signIn")}
      </Button>
    );
  }

  const { account } = session;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("menu")}
          className={cn(
            "h-control rounded-control border-line bg-surface hover:bg-accent-soft inline-flex items-center gap-2 border pe-3 ps-1.5",
            className,
          )}
        >
          <span
            aria-hidden
            className="bg-accent-soft flex size-8 items-center justify-center rounded-full text-sm font-semibold"
          >
            {initials(account.name)}
          </span>
          <span className="max-w-32 truncate font-medium">{account.name}</span>
          <ChevronDown className="text-muted size-4" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block font-semibold">{account.name}</span>
          <span className="text-muted block text-sm">{tSession(`role.${account.role}`)}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserRound aria-hidden />
            {t("myAccount")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/bookings">
            <CalendarDays aria-hidden />
            {t("myBookings")}
          </Link>
        </DropdownMenuItem>
        {hasRole(account, "owner") ? (
          <DropdownMenuItem asChild>
            <Link href="/owner">
              <LayoutDashboard aria-hidden />
              {t("ownerDashboard")}
            </Link>
          </DropdownMenuItem>
        ) : null}
        {hasRole(account, "admin") ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheck aria-hidden />
              {t("adminDashboard")}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut aria-hidden className="rtl:-scale-x-100" />
          {tSession("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
