import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Curated auction-item photography is served from Unsplash's CDN.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
