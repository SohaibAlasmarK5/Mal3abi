import { describe, expect, it } from "vitest";
import { localized } from "./localized";

describe("localized", () => {
  it("returns the requested language", () => {
    expect(localized({ ar: "ملعب النخبة", en: "Elite Court" }, "en")).toBe("Elite Court");
    expect(localized({ ar: "ملعب النخبة", en: "Elite Court" }, "ar")).toBe("ملعب النخبة");
  });

  it("falls back to the other language when one is missing", () => {
    expect(localized({ ar: "ملعب النخبة", en: "" }, "en")).toBe("ملعب النخبة");
    expect(localized({ en: "Elite Court" }, "ar")).toBe("Elite Court");
  });

  it("returns an empty string when there is no text", () => {
    expect(localized(null, "ar")).toBe("");
    expect(localized({ ar: " ", en: null }, "ar")).toBe("");
  });
});
