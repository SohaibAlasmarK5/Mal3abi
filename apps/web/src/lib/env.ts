import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url(),
});

/** Public, validated environment. Fails the build early when a value is missing. */
export const env = schema.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
});
