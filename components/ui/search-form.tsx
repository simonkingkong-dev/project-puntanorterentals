"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/components/providers/locale-provider';

/**
 * Displays a search form for users to find properties based on check-in and check-out dates, and number of guests.
 * @example
 * SearchForm()
 * Renders a form with inputs for check-in and check-out dates, and guest selection.
 * @returns {JSX.Element} A JSX element containing the search form UI.
 */
export default function SearchForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [searchParams, setSearchParams] = useState({
    checkIn: '',
    checkOut: '',
    guests: '',
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

  const guestWord = (n: number) =>
    n === 1 ? t("property_guest_singular") : t("property_guests");

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl border border-border/60 bg-card/95 backdrop-blur-md">
      <CardContent className="p-6 sm:p-7">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Check In */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              {t("search_check_in")}
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
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              {t("search_check_out")}
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
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              {t("search_guests")}
            </label>
            <Select value={searchParams.guests} onValueChange={(value) => setSearchParams({ ...searchParams, guests: value })}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder={t("search_guests_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {guestWord(num)}
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
          {t("search_submit")}
        </Button>
      </CardContent>
    </Card>
  );
}