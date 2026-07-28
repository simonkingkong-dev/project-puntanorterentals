"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROPERTY_REVIEW_CHANNELS } from "@/lib/review-channels";
import type { PropertyReviewChannel } from "@/lib/types";

const NONE_VALUE = "__none__";

interface TestimonialPlatformSelectProps {
  value?: PropertyReviewChannel | "";
  onChange: (platform: PropertyReviewChannel | "") => void;
}

export default function TestimonialPlatformSelect({
  value,
  onChange,
}: TestimonialPlatformSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="testimonial-platform">Plataforma de origen (opcional)</Label>
      <Select
        value={value ? value : NONE_VALUE}
        onValueChange={(v) => onChange(v === NONE_VALUE ? "" : (v as PropertyReviewChannel))}
      >
        <SelectTrigger id="testimonial-platform">
          <SelectValue placeholder="Sin plataforma" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>Sin plataforma</SelectItem>
          {PROPERTY_REVIEW_CHANNELS.map((channel) => (
            <SelectItem key={channel.id} value={channel.id}>
              {channel.labelEs}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Se muestra en la tarjeta para indicar dónde dejó el huésped su reseña.
      </p>
    </div>
  );
}
