import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@oven/module-registry',
    '@oven/module-maps',
    '@oven/module-players',
  ],
};

export default nextConfig;
