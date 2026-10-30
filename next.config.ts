import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increase body size limit for file uploads
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://*.google.com https://*.googletagmanager.com https://*.google-analytics.com https://googleads.g.doubleclick.net",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://www.google-analytics.com https://www.googletagmanager.com https://*.google-analytics.com https://*.googletagmanager.com https://stats.g.doubleclick.net https://region1.google-analytics.com https://region1.analytics.google.com https://*.doubleclick.net",
              "img-src 'self' data: blob: https://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://*.google.com https://*.google-analytics.com https://*.googletagmanager.com https://*.doubleclick.net",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "frame-src 'self' https://www.google.com https://*.doubleclick.net",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
