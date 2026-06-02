import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost',     port: '3000', pathname: '/uploads/**' },
      { protocol: 'http',  hostname: '192.168.1.73',  port: '3000', pathname: '/uploads/**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      {
        source:      '/api/:path*',
        destination: 'https://amusing-charisma-production-50fc.up.railway.app/api/:path*',
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org:     'daraliraq',
  project: 'daraliraq-web',
  silent:  true,          // suppress build output noise
  telemetry: false,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
