"use client";

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

/**
 * Renders a gallery component for displaying property images with modal and navigation features.
 * @example
 * <PropertyGallery images={['image1.jpg', 'image2.jpg']} title="Property Title" />
 * Displays an interactive image gallery with navigation and modal viewing capabilities.
 * @param {Object} props - The properties for the PropertyGallery component.
 * @param {string[]} props.images - Array of image URLs to display in the gallery.
 * @param {string} props.title - The title of the property for labeling images.
 * @returns {JSX.Element} A JSX element representing the property image gallery.
 **/
export default function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const openModal = (index: number) => {
    setModalIndex(index);
    setIsModalOpen(true);
  };

  const nextModalImage = () => {
    setModalIndex((prev) => (prev + 1) % images.length);
  };

  const prevModalImage = () => {
    setModalIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (!images || images.length === 0) {
    return (
      <div className="h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <span className="text-gray-500">Sin imágenes disponibles</span>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 h-96 lg:h-80">
        {/* Main Image */}
        <div 
          className="lg:col-span-2 lg:row-span-2 relative overflow-hidden rounded-lg cursor-pointer group"
          onClick={() => openModal(currentIndex)}
        >
          <Image
            src={images[currentIndex]}
            alt={`${title} - Imagen principal`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          
          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Thumbnail Grid */}
        <div className="hidden lg:grid grid-cols-2 gap-2 lg:col-span-2">
          {images.slice(1, 5).map((image, index) => (
            <div
              key={index + 1}
              className="relative overflow-hidden rounded-lg cursor-pointer group bg-gray-200"
              onClick={() => openModal(index + 1)}
            >
              <Image
                src={image}
                alt={`${title} - Imagen ${index + 2}`}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </div>
          ))}
          
          {images.length > 5 && (
            <div
              className="relative overflow-hidden rounded-lg cursor-pointer group bg-gray-900/80 flex items-center justify-center"
              onClick={() => openModal(5)}
            >
              <span className="text-white font-semibold">
                +{images.length - 5} más
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile thumbnail strip */}
      <div className="lg:hidden flex gap-2 mt-2 overflow-x-auto pb-2">
        {images.map((image, index) => (
          <div
            key={index}
            className={`relative w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg cursor-pointer ${
              index === currentIndex ? 'ring-2 ring-orange-500' : ''
            }`}
            onClick={() => setCurrentIndex(index)}
          >
            <Image
              src={image}
              alt={`${title} - Miniatura ${index + 1}`}
              fill
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-7xl w-full h-full p-0 bg-black">
          <DialogTitle className="sr-only">
            Galería de imágenes - {title}
          </DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="w-6 h-6" />
            </Button>

            <div className="relative w-full h-full max-w-5xl max-h-[90vh]">
              <Image
                src={images[modalIndex]}
                alt={`${title} - Imagen ${modalIndex + 1}`}
                fill
                className="object-contain"
              />
            </div>

            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={prevModalImage}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={nextModalImage}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              {modalIndex + 1} / {images.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}