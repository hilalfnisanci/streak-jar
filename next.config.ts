import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/streak-jar",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
