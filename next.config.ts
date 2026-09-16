import type { NextConfig } from 'next';
const config: NextConfig = { outputFileTracingRoot: process.cwd(), trailingSlash: true, images: { unoptimized: true }, distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
 async headers() { return [{ source: '/:path*', headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
 ] }]; },
};
export default config;
