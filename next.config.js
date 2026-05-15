/** @type {import('next').NextConfig} */
const nextConfig = {
  // Eliminamos 'output: export' para permitir SSR y funciones dinámicas en Firebase App Hosting
  reactStrictMode: true,
  images: {
    // Habilitamos la optimización de imágenes (crucial para performance)
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [360, 640, 768, 1024, 1280, 1536],
    imageSizes: [48, 64, 96, 128, 256, 384],
    localPatterns: [
      {
        pathname: '/logo.png',
        search: '?v=2',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Por si usas placeholders
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'orbirental-images.s3.amazonaws.com', // Hostfully / S3
        port: '',
        pathname: '/**',
      }
    ],
  },
  // Experimental: Optimización de trazas para reducir tamaño de cold starts
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Evita 308 cuando Airbnb/Hostfully piden /calendar-feed/?ical=... (barra final)
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/calendar-feed/',
          destination: '/calendar-feed',
        },
      ],
    };
  },
};

module.exports = nextConfig;