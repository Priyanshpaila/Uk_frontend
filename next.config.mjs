/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // Keep this if you don’t want Next’s image optimizer
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8001',
      },
      {
        protocol: 'https',
        hostname: 'www.pharmacy-express.co.uk',
      },
    ],
  },
}

export default nextConfig