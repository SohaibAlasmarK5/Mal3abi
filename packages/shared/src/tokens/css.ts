import { colorNames, controlHeight, radius, themes, type Palette } from "./tokens.ts";

function colorVars(palette: Palette, indent: string): string {
  return colorNames.map((name) => `${indent}--${name}: ${palette[name].toLowerCase()};`).join("\n");
}

/** The theme stylesheet generated from tokens.ts. */
export function themeCss(): string {
  return `/* Generated from tokens.ts by \`pnpm --filter @mal3abi/shared gen:tokens\`. Do not edit. */

:root,
[data-theme="light"] {
${colorVars(themes.light, "  ")}

  --radius-control: ${radius.control}px;
  --radius-card: ${radius.card}px;
  --control-height: ${controlHeight}px;

  color-scheme: light;
}

[data-theme="dark"] {
${colorVars(themes.dark, "  ")}

  color-scheme: dark;
}
`;
}
