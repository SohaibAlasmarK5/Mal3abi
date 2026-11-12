import { describe, expect, it } from "vitest";
import { timeSlots } from "./time-picker";

describe("timeSlots", () => {
  it("lists half-hour steps up to, not including, the end", () => {
    expect(timeSlots("17:00", "19:00")).toEqual(["17:00", "17:30", "18:00", "18:30"]);
  });

  it("covers the default day from 6 am to midnight", () => {
    const slots = timeSlots();
    expect(slots[0]).toBe("06:00");
    expect(slots.at(-1)).toBe("23:30");
    expect(slots).toHaveLength(36);
  });
});
