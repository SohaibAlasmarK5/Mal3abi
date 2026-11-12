import { describe, expect, it } from "vitest";
import { formatDate, formatNumber, formatPrice, formatShortDate, formatTime } from "./format";

// 12 Nov 2026, 17:30 in Amman (UTC+3).
const sample = new Date("2026-11-12T14:30:00Z");

describe("formatting", () => {
  it("uses Western digits in both languages", () => {
    expect(formatNumber(1234.5, "ar")).toMatch(/^[0-9.,\s\u066b\u066c]+$/);
    expect(formatNumber(1234.5, "ar")).not.toMatch(/[\u0660-\u0669]/);
    expect(formatNumber(1234.5, "en")).toBe("1,234.5");
  });

  it("formats prices in Jordanian dinars", () => {
    expect(formatPrice(10, "en")).toMatch(/^JOD\s10$/);
    expect(formatPrice(7.5, "en")).toMatch(/^JOD\s7\.5$/);
    expect(formatPrice(21, "ar")).toContain("21");
    expect(formatTime(sample, "ar")).toContain("م");
    expect(formatPrice(21, "ar")).toContain("د.أ");
  });

  it("formats dates and times in Amman time", () => {
    expect(formatShortDate(sample, "en")).toBe("12/11/2026");
    expect(formatDate(sample, "en")).toBe("Thursday, 12 November 2026");
    expect(formatTime(sample, "en")).toBe("5:30 pm");
    expect(formatTime(sample, "ar")).toContain("5:30");
    expect(formatDate(sample, "ar")).toContain("2026");
  });
});
