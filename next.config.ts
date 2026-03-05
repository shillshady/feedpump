import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "ipfs.io" },
      { hostname: "cf-ipfs.com" },
      { hostname: "gateway.pinata.cloud" },
      { hostname: "pump.mypinata.cloud" },
    ],
  },
};

export default nextConfig;
