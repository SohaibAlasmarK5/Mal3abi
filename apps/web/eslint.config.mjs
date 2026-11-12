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
      // Logical CSS only: both directions (RTL and LTR) must work.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/(^|\s)(ml|mr|pl|pr|left|right|text-left|text-right|rounded-l|rounded-r|border-l|border-r)-/]",
          message:
            "Use logical classes (ms-, me-, ps-, pe-, start-, end-, text-start, text-end) so RTL and LTR both work.",
        },
      ],
    },
  },
]);
