import type { NextConfig } from "next";

const BACKEND = process.env.UPLOADS_PROXY_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${BACKEND}/uploads/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
  },
};

export default nextConfig;
