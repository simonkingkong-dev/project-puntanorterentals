"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRY_CODES } from "@/lib/country-codes";
import { cn } from "@/lib/utils";

interface PhoneCountryCodeSelectProps {
  value: string;
  onChange: (shortCode: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  ariaLabel?: string;
  id?: string;
  className?: string;
}

export function PhoneCountryCodeSelect({
  value,
  onChange,
  placeholder = "Code",
  searchPlaceholder = "Search country…",
  emptyLabel = "No country found.",
  ariaLabel,
  id,
  className,
}: PhoneCountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRY_CODES.find((country) => country.short === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            "h-10 w-[108px] shrink-0 justify-between px-3 font-normal",
            className
          )}
        >
          <span className="truncate">
            {selected
              ? `${selected.short.toUpperCase()} ${selected.code}`
              : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,280px)] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={16}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {COUNTRY_CODES.map(({ code, short: shortCode, country }) => (
                <CommandItem
                  key={shortCode}
                  value={`${country} ${code} ${shortCode}`}
                  onSelect={() => {
                    onChange(shortCode);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === shortCode ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">
                    {code} {shortCode.toUpperCase()} — {country}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
