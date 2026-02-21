
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      }
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "6000-firebase-studio-1749752097045.cluster-duylic2g3fbzerqpzxxbw6helm.cloudworkstations.dev",
        "mashup-music-hub.web.app",
        "mashup-music-hub.firebaseapp.com",
        "mashupmusic.com.br",
        "www.mashupmusic.com.br"
      ]
    }
  }
};

module.exports = nextConfig;
