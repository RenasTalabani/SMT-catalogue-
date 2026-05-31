import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      // Local dev / local network
      { protocol: 'http',  hostname: 'localhost',     port: '3000', pathname: '/uploads/**' },
      { protocol: 'http',  hostname: '192.168.1.73',  port: '3000', pathname: '/uploads/**' },
      // Production — any HTTPS host (Railway, custom domain, Supabase Storage)
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_API_URL
      ?? process.env.API_URL
      ?? 'http://localhost:3000';
    return [
      {
        source:      '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
