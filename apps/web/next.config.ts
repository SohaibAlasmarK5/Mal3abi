import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@mal3abi/shared"],
  async redirects() {
    // Arabic is the default language until the i18n middleware lands (KAN-41).
    return [{ source: "/", destination: "/ar", permanent: false }];
  },
};

export default nextConfig;
