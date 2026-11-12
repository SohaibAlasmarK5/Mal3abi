import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const apiBaseUrl =
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7082";

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
