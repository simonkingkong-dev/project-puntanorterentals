"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Currency = "USD" | "MXN";

interface CurrencySelectProps {
  value: Currency;
  onValueChange: (value: Currency) => void;
  className?: string;
}

export function CurrencySelect({ value, onValueChange, className }: CurrencySelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as Currency)}>
      <SelectTrigger className={className ?? "w-[140px] h-9"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USD">
          <span className="flex items-center gap-2">
            <span className="text-lg">🇺🇸</span>
            USD
          </span>
        </SelectItem>
        <SelectItem value="MXN">
          <span className="flex items-center gap-2">
            <span className="text-lg">🇲🇽</span>
            MXN
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
