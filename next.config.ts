import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/streak-jar",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;