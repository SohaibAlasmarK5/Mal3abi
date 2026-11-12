import { z } from "zod";

const schema = z.object({
  /** Mal3abi.BE origin. Server-only: the browser calls /api on this site, which proxies here. */
  API_BASE_URL: z.url().default("https://localhost:7082"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

/** Server environment, validated. Import only from server code (layouts, next.config). */
export const env = schema.parse({
  API_BASE_URL: process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
