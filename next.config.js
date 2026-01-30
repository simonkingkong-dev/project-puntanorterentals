/** @type {import('next').NextConfig} */
const nextConfig = {
  // Eliminamos 'output: export' para permitir SSR y funciones dinámicas en Firebase App Hosting
  reactStrictMode: true,
  images: {
    // Habilitamos la optimización de imágenes (crucial para performance)
    unoptimized: false, 
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
      }
    ],
  },
  // Experimental: Optimización de trazas para reducir tamaño de cold starts
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;