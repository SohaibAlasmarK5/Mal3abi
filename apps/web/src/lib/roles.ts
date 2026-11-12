import type { Account, Role } from "@mal3abi/shared/api";

/** Admins can see everything; other roles see only their own areas. */
export function hasRole(account: Account | null, ...roles: Role[]): boolean {
  if (!account) return false;
  return account.role === "admin" || roles.includes(account.role);
}
