import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The TypeScript compiler API is only used by the server-side analysis pass.
  // Keep it external so it resolves from node_modules instead of being bundled
  // into the route handler.
  serverExternalPackages: ['typescript'],
}

export default nextConfig
