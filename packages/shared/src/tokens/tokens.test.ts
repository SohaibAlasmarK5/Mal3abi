import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast.ts";
import { themeCss } from "./css.ts";
import { contrastPairs, themes, type ThemeName } from "./tokens.ts";

describe("theme.css", () => {
  it("is generated from tokens.ts (run gen:tokens after changing a token)", () => {
    const onDisk = readFileSync(new URL("./theme.css", import.meta.url), "utf8").replace(
      /\r\n/g,
      "\n",
    );
    expect(onDisk).toBe(themeCss());
  });
});

describe("contrast", () => {
  for (const mode of Object.keys(themes) as ThemeName[]) {
    for (const [text, background] of contrastPairs) {
      it(`${mode}: ${text} on ${background} reaches 4.5:1`, () => {
        const palette = themes[mode];
        expect(contrastRatio(palette[text], palette[background])).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("computes known ratios", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });
});
