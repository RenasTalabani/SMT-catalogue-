import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      // Local dev / local network
      { protocol: 'http',  hostname: 'localhost',     port: '3000', pathname: '/uploads/**' },
      { protocol: 'http',  hostname: '192.168.1.73',  port: '3000', pathname: '/uploads/**' },
      // Production — any HTTPS host (Railway, custom domain)
      { protocol: 'https', hostname: '**',            pathname: '/uploads/**' },
      // Cloudinary
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async rewrites() {
    return [
      {
        source:      '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
