import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const configuredApiBaseUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
if (!configuredApiBaseUrl && process.env.NODE_ENV === "production") {
  // Fail the build instead of silently proxying /api to localhost in production.
  throw new Error("Set API_BASE_URL to the Mal3abi.BE origin for production builds.");
}
const apiBaseUrl = configuredApiBaseUrl ?? "https://localhost:7082";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@mal3abi/shared"],
  async rewrites() {
    // The browser calls /api on this site. Next forwards it to Mal3abi.BE, so the session
    // cookie stays first-party and no CORS is needed.
    return [{ source: "/api/:path*", destination: `${apiBaseUrl}/api/:path*` }];
  },
};

export default withNextIntl(nextConfig);
