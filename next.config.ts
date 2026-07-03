import type { NextConfig } from "next";

// GitHub Pages serves this project at dotsledger.github.io/English/, so the
// production static export needs a matching basePath. Local dev keeps root paths.
const isGithubPagesBuild = process.env.GITHUB_PAGES === "true";
const repoBasePath = "/English";

const nextConfig: NextConfig = {
  // Lets the dev server serve JS/HMR to phones on the same LAN (see README).
  allowedDevOrigins: ["192.168.1.35"],
  ...(isGithubPagesBuild && {
    output: "export",
    basePath: repoBasePath,
    assetPrefix: repoBasePath,
    images: { unoptimized: true },
  }),
};

export default nextConfig;
