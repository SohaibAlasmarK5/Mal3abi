/**
 * A return path that stays on this site, so a link cannot send people to another website.
 * Parsed as a URL because browsers read "/\evil.com" as "//evil.com".
 */
export function safeReturnTo(value: string | null, origin: string, fallback: string): string {
  if (!value || !value.startsWith("/")) return fallback;
  try {
    const url = new URL(value, origin);
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
