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
    // BACKEND_URL is a server-side-only build var (no NEXT_PUBLIC_ prefix).
    // Set it in Railway's web service env to override; otherwise falls back to
    // the production backend. For local dev set BACKEND_URL in .env.local.
    const backendUrl = process.env['BACKEND_URL'] ?? 'https://amusing-charisma-production-50fc.up.railway.app';
    return [
      {
        source:      '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
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
