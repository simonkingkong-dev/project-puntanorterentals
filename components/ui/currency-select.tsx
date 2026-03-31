"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Currency = "USD" | "MXN" | "EUR";

interface CurrencySelectProps {
  value: Currency;
  onValueChange: (value: Currency) => void;
  className?: string;
}

export function CurrencySelect({ value, onValueChange, className }: CurrencySelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as Currency)}>
      <SelectTrigger className={className ?? "w-[140px] h-9 [&>span]:leading-none"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USD">
          <span className="inline-flex items-center leading-none">USD</span>
        </SelectItem>
        <SelectItem value="MXN">
          <span className="inline-flex items-center leading-none">MXN</span>
        </SelectItem>
        <SelectItem value="EUR">
          <span className="inline-flex items-center leading-none">EUR</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
