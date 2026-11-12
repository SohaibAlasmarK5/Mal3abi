import type { Account } from "@mal3abi/shared/api";
import { hasRole } from "@/lib/roles";

export type NavKey = "courts" | "matches" | "bookings" | "owners";
export type NavItem = { key: NavKey; href: string };

/** Main navigation. Court owners and admins have their dashboard instead of "For court owners". */
export function mainNav(account: Account | null): NavItem[] {
  const items: NavItem[] = [
    { key: "courts", href: "/courts" },
    { key: "matches", href: "/matches" },
    { key: "bookings", href: "/bookings" },
  ];
  if (!hasRole(account, "owner")) items.push({ key: "owners", href: "/owners" });
  return items;
}

/** The dashboard a role can open, if any. Admins see the admin dashboard. */
export function dashboardFor(account: Account | null) {
  if (!account) return null;
  if (account.role === "admin") return { key: "adminDashboard", href: "/admin" } as const;
  if (account.role === "owner") return { key: "ownerDashboard", href: "/owner" } as const;
  return null;
}

/** True when `pathname` is `href` or a page inside it. */
export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
