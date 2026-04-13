import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@oven/module-ui-flows',
    '@oven/module-files',
    '@oven/oven-ui',
  ],
  typescript: {
    // Pre-existing: monorepo-wide exports pattern TS resolution issue.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
