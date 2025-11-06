/** @type {import('next').NextConfig} */
const nextConfig = {
  
  // CORREGIDO: Eliminamos el bloque 'eslint' obsoleto
  
  // CORREGIDO: Habilitamos la optimización de imágenes
  images: {
    // Ya no usamos 'unoptimized: true'
    // En su lugar, especificamos los dominios de donde vendrán tus imágenes
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com', // Para las imágenes de Pexels
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com', // Para tus imágenes de Firebase Storage
      },
      // Si usas otro servicio de imágenes, añade su hostname aquí
    ],
  },
};

module.exports = nextConfig;