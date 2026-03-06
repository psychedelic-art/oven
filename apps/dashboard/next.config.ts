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
    '@oven/module-roles',
    '@oven/rls-editor',
    '@oven/module-ui-flows',
    '@oven/ui-flows-editor',
  ],
  serverExternalPackages: ['sharp'],
};

export default nextConfig;
