import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Small self-contained server for the Docker image.
  output: 'standalone',
  cacheComponents: true,
  partialPrefetching: true,
  // PGlite loads its WebAssembly files from disk, so keep it out of the bundle.
  serverExternalPackages: ['@electric-sql/pglite'],
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
