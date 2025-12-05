"use client";

import { useState } from 'react';
import { Property } from '@/lib/types';
import { Wifi, Car, Utensils, Home, Waves, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import AvailabilityCalendar from '@/components/ui/availability-calendar';
import ReservationForm from '@/components/ui/reservation-form';

// Mapeo de íconos
const amenityIcons: { [key: string]: any } = {
  'WiFi de alta velocidad': Wifi,
  'Aire acondicionado': Home,
  'Cocina equipada': Utensils,
  'Estacionamiento': Car,
  'Piscina comunitaria': Waves,
  'Vista al mar': Waves,
  'Terraza privada': Home,
  'Servicio de limpieza': Home,
  'Seguridad 24/7': Shield,
  'Acceso a playa': Waves,
  default: Home,
};

interface PropertyBodyProps {
  property: Property;
}

export default function PropertyBody({ property }: PropertyBodyProps) {
  // AQUÍ ESTÁ LA SOLUCIÓN: El estado vive en el cliente
  const [selectedDates, setSelectedDates] = useState<{ checkIn: Date; checkOut: Date } | undefined>();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Columna Izquierda: Detalles */}
      <div className="lg:col-span-2 space-y-8">
        {/* Descripción */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Descripción</h2>
          <div className="prose prose-gray max-w-none">
            {property.description.split('\n').map((paragraph, index) => (
              <p key={index} className="text-gray-600 leading-relaxed mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <Separator />

        {/* Amenidades */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Amenidades</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {property.amenities.map((amenity, index) => {
              const IconComponent = amenityIcons[amenity] || amenityIcons.default;
              return (
                <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                  <IconComponent className="w-5 h-5 text-orange-600" />
                  <span className="text-gray-900">{amenity}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Calendario */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Disponibilidad</h2>
          <AvailabilityCalendar
            property={property}
            onDateSelect={setSelectedDates} // Ahora sí podemos pasar la función
            selectedDates={selectedDates}
          />
        </div>
      </div>

      {/* Columna Derecha: Formulario (Sticky) */}
      <div className="lg:col-span-1">
        <div className="sticky top-24">
          <ReservationForm
            property={property}
            selectedDates={selectedDates} // Pasamos las fechas seleccionadas al form
          />
        </div>
      </div>
    </div>
  );
}