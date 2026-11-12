import type { Account, Role } from "@mal3abi/shared/api";
import { describe, expect, it } from "vitest";
import { hasRole } from "@/lib/roles";
import { dashboardFor, isActive, mainNav } from "./nav-items";

const account = (role: Role): Account => ({
  id: role,
  name: role,
  username: role,
  email: `${role}@example.com`,
  phone: "0790000000",
  role,
  emailConfirmed: true,
  twoFactorEnabled: false,
});

describe("navigation by role", () => {
  it("shows 'for court owners' to visitors and players only", () => {
    expect(mainNav(null).map((i) => i.key)).toContain("owners");
    expect(mainNav(account("player")).map((i) => i.key)).toContain("owners");
    expect(mainNav(account("owner")).map((i) => i.key)).not.toContain("owners");
    expect(mainNav(account("admin")).map((i) => i.key)).not.toContain("owners");
  });

  it("links each role to its dashboard", () => {
    expect(dashboardFor(null)).toBeNull();
    expect(dashboardFor(account("player"))).toBeNull();
    expect(dashboardFor(account("owner"))?.href).toBe("/owner");
    expect(dashboardFor(account("admin"))?.href).toBe("/admin");
  });

  it("lets admins pass every role check", () => {
    expect(hasRole(account("admin"), "owner")).toBe(true);
    expect(hasRole(account("player"), "owner")).toBe(false);
    expect(hasRole(null, "player")).toBe(false);
  });

  it("marks a link active on its page and the pages inside it", () => {
    expect(isActive("/courts", "/courts")).toBe(true);
    expect(isActive("/courts/elite", "/courts")).toBe(true);
    expect(isActive("/courtsx", "/courts")).toBe(false);
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/courts", "/")).toBe(false);
  });
});
