import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["src/api/generated/**"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      // Only src/api/fetcher.ts talks to the network.
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Backend calls go through src/api/fetcher.ts (apiFetch)." },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/api/fetcher.ts", "**/*.test.ts"],
    rules: { "no-restricted-globals": "off" },
  },
);
