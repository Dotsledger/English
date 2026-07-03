import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server serve JS/HMR to phones on the same LAN (see README).
  allowedDevOrigins: ["192.168.1.35"],
};

export default nextConfig;
