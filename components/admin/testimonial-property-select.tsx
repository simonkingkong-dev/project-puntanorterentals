"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Property } from "@/lib/types";

const NONE_VALUE = "__none__";

interface TestimonialPropertySelectProps {
  properties: Pick<Property, "id" | "title">[];
  value?: string;
  onChange: (propertyId: string) => void;
}

export default function TestimonialPropertySelect({
  properties,
  value,
  onChange,
}: TestimonialPropertySelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="testimonial-property">Propiedad (opcional)</Label>
      <Select
        value={value?.trim() ? value : NONE_VALUE}
        onValueChange={(v) => onChange(v === NONE_VALUE ? "" : v)}
      >
        <SelectTrigger id="testimonial-property">
          <SelectValue placeholder="Sin propiedad vinculada" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>Sin propiedad (solo inicio)</SelectItem>
          {properties.map((property) => (
            <SelectItem key={property.id} value={property.id}>
              {property.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Si eliges una propiedad, el testimonio también aparecerá en su pestaña de reseñas.
      </p>
    </div>
  );
}
