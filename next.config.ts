import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Convex storage serves images from this host (galeria, obozy itp.).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.convex.cloud" },
    ],
  },
};

export default nextConfig;
