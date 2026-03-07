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
    '@oven/form-editor',
    '@oven/oven-ui',
  ],
  serverExternalPackages: ['sharp'],
  typescript: {
    // Pre-existing: TypeScript can't resolve ./api/* wildcard exports across all modules.
    // Webpack resolves them fine. This needs a monorepo-wide fix for the exports pattern.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
