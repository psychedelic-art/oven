import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@oven/module-registry',
    '@oven/module-maps',
    '@oven/module-players',
    '@oven/module-sessions',
    '@oven/module-player-map-position',
    '@oven/map-editor',
    '@oven/module-workflows',
    '@oven/workflow-editor',
  ],
  serverExternalPackages: ['sharp'],
};

export default nextConfig;
