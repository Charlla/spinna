import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Canvas is client-only, exclude from server-side rendering
  serverExternalPackages: [],
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
