import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  globalIgnores([".next/**", "next-env.d.ts", "coverage/**"]),
  {
    rules: {
      // No raw UI text in JSX: every string comes from the ar/en message files.
      "react/jsx-no-literals": [
        "error",
        { noStrings: true, ignoreProps: true, allowedStrings: [], noAttributeStrings: false },
      ],
      "no-restricted-syntax": [
        "error",
        {
          // Logical CSS only: both directions (RTL and LTR) must work.
          selector:
            "Literal[value=/(^|\\s)(ml|mr|pl|pr|left|right|text-left|text-right|rounded-l|rounded-r|border-l|border-r)-/]",
          message:
            "Use logical classes (ms-, me-, ps-, pe-, start-, end-, text-start, text-end) so RTL and LTR both work.",
        },
        {
          // Text that users read or hear, written directly in an attribute.
          selector:
            "JSXAttribute[name.name=/^(aria-label|aria-description|title|alt|placeholder)$/] > Literal",
          message: "Put this text in the ar/en message files and read it with useTranslations.",
        },
      ],
    },
  },
]);
