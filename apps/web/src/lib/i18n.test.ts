import { describe, expect, it } from "vitest";
import { getMessages } from "./i18n";

describe("getMessages", () => {
  it("returns Arabic and English text", () => {
    expect(getMessages("ar").home.title).toBe("ملعبي");
    expect(getMessages("en").home.title).toBe("Mal3abi");
  });
});
