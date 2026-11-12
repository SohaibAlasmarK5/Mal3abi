import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./safe-return";

const origin = "http://localhost:3000";
const go = (value: string | null) => safeReturnTo(value, origin, "/ar");

describe("safeReturnTo", () => {
  it("keeps same-site paths with their query", () => {
    expect(go("/ar/owner")).toBe("/ar/owner");
    expect(go("/en/courts?q=khalda")).toBe("/en/courts?q=khalda");
  });

  it("rejects links to other websites", () => {
    expect(go("https://evil.example")).toBe("/ar");
    expect(go("//evil.example")).toBe("/ar");
    expect(go("/\\evil.example")).toBe("/ar");
    expect(go("javascript:alert(1)")).toBe("/ar");
  });

  it("falls back when there is no value", () => {
    expect(go(null)).toBe("/ar");
    expect(go("")).toBe("/ar");
  });
});
