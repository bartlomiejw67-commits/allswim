import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bez kółka „N" w rogu podglądu lokalnego (wskaźnik trybu deweloperskiego) — mylił przy oglądaniu strony.
  devIndicators: false,
  // Convex storage serves images from this host (galeria, obozy itp.).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.convex.cloud" },
    ],
  },
};

export default nextConfig;
