import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Transloadit CDN — uploaded images and cropped outputs
      {
        protocol: 'https',
        hostname: '**.transloadit.com',
      },
      // Clerk user avatars
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },
}

export default nextConfig
