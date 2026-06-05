"use client";

import type { BedType } from "@/lib/types";
import {
  BED_TYPE_LABELS,
  BED_TYPES,
  bedCountsToArray,
  bedsArrayToCounts,
  totalBedCount,
} from "@/lib/property-beds";
import BedTypeIcon from "@/components/ui/bed-type-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

interface BedsCountEditorProps {
  beds: BedType[];
  onChange: (beds: BedType[]) => void;
}

export default function BedsCountEditor({ beds, onChange }: BedsCountEditorProps) {
  const counts = bedsArrayToCounts(beds);
  const total = totalBedCount(counts);

  const setCount = (type: BedType, next: number) => {
    const clamped = Math.max(0, Math.min(99, Math.floor(next) || 0));
    onChange(bedCountsToArray({ ...counts, [type]: clamped }));
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {BED_TYPES.map((type) => (
          <div
            key={type}
            className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted text-gray-700">
              <BedTypeIcon type={type} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium">{BED_TYPE_LABELS[type]}</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                disabled={counts[type] <= 0}
                onClick={() => setCount(type, counts[type] - 1)}
                aria-label={`Quitar ${BED_TYPE_LABELS[type]}`}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={0}
                max={99}
                className="h-8 w-14 px-1 text-center tabular-nums"
                value={counts[type]}
                onChange={(e) => setCount(type, parseInt(e.target.value, 10))}
                aria-label={`Cantidad ${BED_TYPE_LABELS[type]}`}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setCount(type, counts[type] + 1)}
                aria-label={`Agregar ${BED_TYPE_LABELS[type]}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {total === 0
          ? "Indica cuántas camas hay de cada tipo."
          : `Total: ${total} ${total === 1 ? "cama" : "camas"}.`}
      </p>
    </div>
  );
}
