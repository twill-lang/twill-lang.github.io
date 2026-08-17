import type { NextConfig } from "next";

// Pages serves files, not a Node server, so the whole site is exported as
// static HTML at build time. Same constraints as the sibling site: no route
// handlers, no ISR, no image optimizer.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
