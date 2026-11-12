import { describe, expect, it } from "vitest";
import ar from "./messages/ar.json";
import en from "./messages/en.json";
import { defaultLocale, directionOf, isLocale } from "./index";

describe("locales", () => {
  it("defaults to Arabic", () => {
    expect(defaultLocale).toBe("ar");
  });

  it("uses RTL for Arabic and LTR for English", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
  });

  it("recognises only supported locales", () => {
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
});

function keysOf(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keysOf(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("messages", () => {
  it("has the same keys in Arabic and English", () => {
    expect(keysOf(ar).sort()).toEqual(keysOf(en).sort());
  });
});
