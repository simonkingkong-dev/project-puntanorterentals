"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Users, Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SearchForm() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useState({
    checkIn: '',
    checkOut: '',
    guests: '',
    location: '',
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    router.push(`/properties?${params.toString()}`);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Location */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Destino
            </label>
            <Input
              type="text"
              placeholder="¿A dónde vas?"
              value={searchParams.location}
              onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
              className="h-12"
            />
          </div>

          {/* Check In */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Entrada
            </label>
            <Input
              type="date"
              value={searchParams.checkIn}
              onChange={(e) => setSearchParams({ ...searchParams, checkIn: e.target.value })}
              className="h-12"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Check Out */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Salida
            </label>
            <Input
              type="date"
              value={searchParams.checkOut}
              onChange={(e) => setSearchParams({ ...searchParams, checkOut: e.target.value })}
              className="h-12"
              min={searchParams.checkIn || new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Guests */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Huéspedes
            </label>
            <Select value={searchParams.guests} onValueChange={(value) => setSearchParams({ ...searchParams, guests: value })}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="¿Cuántos?" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? 'huésped' : 'huéspedes'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleSearch}
          className="w-full mt-6 h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold transition-all duration-300 transform hover:scale-[1.02]"
        >
          <Search className="w-4 h-4 mr-2" />
          Buscar Propiedades
        </Button>
      </CardContent>
    </Card>
  );
}