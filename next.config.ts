import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "quickchart.io",
      },
    ],
  },
};

export default nextConfig;
