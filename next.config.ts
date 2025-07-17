import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mostra solo errori ESLint, non warning, durante la build
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ucarecdn.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
