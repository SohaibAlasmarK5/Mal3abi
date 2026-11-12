import { defineConfig } from "orval";

/**
 * Generates the typed API client and TanStack Query hooks from the
 * OpenAPI contract (mock data lives in src/api/mocks). Run `pnpm gen:api` after the contract changes; CI fails if the
 * generated files are out of date.
 */
export default defineConfig({
  mal3abi: {
    input: { target: "./openapi/mal3abi.yaml" },
    output: {
      mode: "tags-split",
      target: "./src/api/generated/endpoints.ts",
      schemas: "./src/api/generated/model",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      prettier: true,
      override: {
        mutator: { path: "./src/api/fetcher.ts", name: "apiFetch" },
        fetch: { includeHttpResponseReturnType: false },
        query: { signal: true },
      },
    },
  },
});
