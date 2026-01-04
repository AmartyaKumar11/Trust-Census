import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Electron packaging
  output: 'standalone',

  // Skip type checking and linting during build (for packaging)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Image optimization
  images: {
    unoptimized: true // For Electron, disable Next.js image optimization
  }
};

export default nextConfig;
