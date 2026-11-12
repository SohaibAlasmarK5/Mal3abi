/**
 * Mock data in the browser (MSW) instead of the real backend. Safe to import anywhere.
 * Never in a production build: mock mode includes a fake sign-in that accepts any role.
 */
export const apiMocking =
  process.env.NEXT_PUBLIC_API_MOCKING === "enabled" && process.env.NODE_ENV !== "production";
