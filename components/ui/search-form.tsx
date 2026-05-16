"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Users, Search, ChevronDown, X } from 'lucide-react';
import {
  addDays,
  differenceInCalendarDays,
  format,
  startOfDay,
} from 'date-fns';
import { es as esLocale, enUS } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/components/providers/locale-provider';
import { cn } from '@/lib/utils';

function parseDateOnly(value: string): Date | undefined {
  if (!value) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  const [, y, mo, d] = m;
  const parsed = new Date(Number(y), Number(mo) - 1, Number(d));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${month}-${day}`;
}

export default function SearchForm() {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const { locale, t } = useLocale();
  const dateFnsLocale = locale === 'en' ? enUS : esLocale;
  const [isOpen, setIsOpen] = useState(true);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchParams, setSearchParams] = useState(() => ({
    checkIn: urlSearchParams.get('checkIn') ?? '',
    checkOut: urlSearchParams.get('checkOut') ?? '',
    guests: urlSearchParams.get('guests') ?? '',
  }));

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const urlKey = urlSearchParams.toString();
  useEffect(() => {
    const params = new URLSearchParams(urlKey);
    setSearchParams({
      checkIn: params.get('checkIn') ?? '',
      checkOut: params.get('checkOut') ?? '',
      guests: params.get('guests') ?? '',
    });
  }, [urlKey]);

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

  const hasActiveFilters =
    Boolean(searchParams.checkIn?.trim()) ||
    Boolean(searchParams.checkOut?.trim()) ||
    Boolean(searchParams.guests?.trim());

  const checkInParsed = useMemo(
    () => parseDateOnly(searchParams.checkIn),
    [searchParams.checkIn]
  );
  const checkOutParsed = useMemo(
    () => parseDateOnly(searchParams.checkOut),
    [searchParams.checkOut]
  );

  const checkInTriggerLabel = useMemo(() => {
    if (!checkInParsed) return null;
    return format(checkInParsed, 'd MMM yyyy', { locale: dateFnsLocale });
  }, [checkInParsed, dateFnsLocale]);

  const checkOutTriggerLabel = useMemo(() => {
    if (!checkOutParsed) return null;
    return format(checkOutParsed, 'd MMM yyyy', { locale: dateFnsLocale });
  }, [checkOutParsed, dateFnsLocale]);

  const checkOutMinSelectable = checkInParsed
    ? addDays(startOfDay(checkInParsed), 1)
    : null;

  const handleCheckInSelect = (d: Date | undefined) => {
    if (!d) {
      setSearchParams((prev) => ({ ...prev, checkIn: '', checkOut: '' }));
      return;
    }
    const fromDay = startOfDay(d);
    const nextIn = formatDateOnly(fromDay);
    setSearchParams((prev) => {
      let nextOut = prev.checkOut;
      const co = parseDateOnly(prev.checkOut);
      if (
        co &&
        differenceInCalendarDays(startOfDay(co), fromDay) < 1
      ) {
        nextOut = '';
      }
      return { ...prev, checkIn: nextIn, checkOut: nextOut };
    });
    setCheckInOpen(false);
  };

  const handleCheckOutSelect = (d: Date | undefined) => {
    if (!d) {
      setSearchParams((prev) => ({ ...prev, checkOut: '' }));
      return;
    }
    const ci = parseDateOnly(searchParams.checkIn);
    if (!ci) return;
    const toDay = startOfDay(d);
    if (differenceInCalendarDays(toDay, startOfDay(ci)) < 1) return;
    setSearchParams((prev) => ({
      ...prev,
      checkOut: formatDateOnly(toDay),
    }));
    setCheckOutOpen(false);
  };

  const clearCheckIn = () => {
    setSearchParams((prev) => ({ ...prev, checkIn: '', checkOut: '' }));
    setCheckInOpen(false);
  };

  const clearCheckOut = () => {
    setSearchParams((prev) => ({ ...prev, checkOut: '' }));
    setCheckOutOpen(false);
  };

  const clearGuests = () => {
    setSearchParams((prev) => ({ ...prev, guests: '' }));
  };

  const checkInCalendar = (
    <Calendar
      mode="single"
      locale={dateFnsLocale}
      selected={checkInParsed}
      onSelect={handleCheckInSelect}
      numberOfMonths={isMobile ? 1 : 1}
      defaultMonth={checkInParsed ?? new Date()}
      disabled={{ before: startOfDay(new Date()) }}
      initialFocus
    />
  );

  const checkOutCalendar = (
    <Calendar
      mode="single"
      locale={dateFnsLocale}
      selected={checkOutParsed}
      onSelect={handleCheckOutSelect}
      numberOfMonths={isMobile ? 1 : 1}
      defaultMonth={checkOutParsed ?? checkInParsed ?? new Date()}
      disabled={
        checkOutMinSelectable
          ? { before: checkOutMinSelectable }
          : () => true
      }
      initialFocus
    />
  );

  const checkInTriggerButton = (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'h-12 w-full justify-start text-left font-normal',
        !checkInTriggerLabel && 'text-muted-foreground'
      )}
      aria-expanded={checkInOpen}
      aria-haspopup="dialog"
    >
      <CalendarDays className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate">
        {checkInTriggerLabel ?? t('search_check_in_placeholder')}
      </span>
    </Button>
  );

  const checkOutTriggerButton = (
    <Button
      type="button"
      variant="outline"
      disabled={!searchParams.checkIn}
      className={cn(
        'h-12 w-full justify-start text-left font-normal',
        !checkOutTriggerLabel && 'text-muted-foreground'
      )}
      aria-expanded={checkOutOpen}
      aria-haspopup="dialog"
    >
      <CalendarDays className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate">
        {checkOutTriggerLabel ?? t('search_check_out_placeholder')}
      </span>
    </Button>
  );

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl border border-border/60 bg-card/95 backdrop-blur-md">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 sm:px-7 pt-5 pb-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Search className="w-4 h-4" />
          {t("search_submit", "Search")}
          {!isOpen && hasActiveFilters && (
            <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-orange-500" />
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <CardContent className="px-6 sm:px-7 pb-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Check-in */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2 min-w-0">
                    <CalendarDays className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{t('search_check_in')}</span>
                  </label>
                  {searchParams.checkIn ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 px-2 text-muted-foreground"
                      onClick={clearCheckIn}
                      aria-label={t('search_clear_check_in')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                {isMobile ? (
                  <Drawer open={checkInOpen} onOpenChange={setCheckInOpen}>
                    <DrawerTrigger asChild>{checkInTriggerButton}</DrawerTrigger>
                    <DrawerContent className="max-h-[90vh]">
                      <DrawerHeader className="text-left">
                        <DrawerTitle>{t('search_check_in')}</DrawerTitle>
                      </DrawerHeader>
                      <div className="overflow-y-auto px-4 pb-6">{checkInCalendar}</div>
                    </DrawerContent>
                  </Drawer>
                ) : (
                  <Popover modal open={checkInOpen} onOpenChange={setCheckInOpen}>
                    <PopoverTrigger asChild>{checkInTriggerButton}</PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      {checkInCalendar}
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Check-out */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2 min-w-0">
                    <CalendarDays className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{t('search_check_out')}</span>
                  </label>
                  {searchParams.checkOut ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 px-2 text-muted-foreground"
                      onClick={clearCheckOut}
                      aria-label={t('search_clear_check_out')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                {isMobile ? (
                  <Drawer open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                    <DrawerTrigger asChild>{checkOutTriggerButton}</DrawerTrigger>
                    <DrawerContent className="max-h-[90vh]">
                      <DrawerHeader className="text-left">
                        <DrawerTitle>{t('search_check_out')}</DrawerTitle>
                      </DrawerHeader>
                      <div className="overflow-y-auto px-4 pb-6">{checkOutCalendar}</div>
                    </DrawerContent>
                  </Drawer>
                ) : (
                  <Popover modal open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                    <PopoverTrigger asChild>{checkOutTriggerButton}</PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      {checkOutCalendar}
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Guests */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2 min-w-0">
                    <Users className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{t("search_guests")}</span>
                  </label>
                  {searchParams.guests ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 px-2 text-muted-foreground"
                      onClick={clearGuests}
                      aria-label={t('search_clear_guests')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <Select
                  value={searchParams.guests || undefined}
                  onValueChange={(value) =>
                    setSearchParams((prev) => ({ ...prev, guests: value }))
                  }
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder={t("search_guests_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {guestWord(num)}
                      </SelectItem>
                    ))}
                    <SelectItem value="6">
                      6-14 {t("property_guests")}
                    </SelectItem>
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
        </div>
      </div>
    </Card>
  );
}
