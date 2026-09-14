import type { NextConfig } from 'next';
const config: NextConfig = { output: 'export', outputFileTracingRoot: process.cwd(), trailingSlash: true, images: { unoptimized: true }, distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next' };
export default config;
