"use client";

import type { BedType } from "@/lib/types";
import { useLocale } from "@/components/providers/locale-provider";
import BedTypeIcon from "@/components/ui/bed-type-icon";

interface PropertyBedsListProps {
  beds: BedType[];
  className?: string;
}

export default function PropertyBedsList({ beds, className = "" }: PropertyBedsListProps) {
  const { t } = useLocale();

  if (!beds.length) return null;

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {beds.map((bed, i) => (
        <span
          key={`${bed}-${i}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700"
        >
          <BedTypeIcon type={bed} className="h-4 w-4 shrink-0 text-gray-700" />
          {t(`bed_${bed}`, bed)}
        </span>
      ))}
    </div>
  );
}
