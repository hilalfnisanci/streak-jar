import type { NextConfig } from "next";

const basePath = "/streak-jar";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
