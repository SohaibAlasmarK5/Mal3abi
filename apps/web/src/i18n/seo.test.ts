import { describe, expect, it } from "vitest";
import { localeAlternates } from "./seo";

describe("localeAlternates", () => {
  it("links both languages and defaults to Arabic", () => {
    expect(localeAlternates("en", "/courts/12")).toEqual({
      canonical: "/en/courts/12",
      languages: { ar: "/ar/courts/12", en: "/en/courts/12", "x-default": "/ar/courts/12" },
    });
  });
});
