"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Star, Loader2, User } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { handleCreateTestimonial } from "../actions";
import TestimonialImageField from "@/components/admin/testimonial-image-field";
import TestimonialPropertySelect from "@/components/admin/testimonial-property-select";
import TestimonialPlatformSelect from "@/components/admin/testimonial-platform-select";
import TestimonialReviewImport from "@/components/admin/testimonial-review-import";
import type { Property, PropertyReviewChannel } from "@/lib/types";
import { getNameInitials } from "@/lib/utils";

interface NewTestimonialFormProps {
  properties: Pick<Property, "id" | "title">[];
}

export default function NewTestimonialForm({ properties }: NewTestimonialFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: "",
    text: "",
    image: "",
    rating: 5,
    location: "",
    featured: false,
    propertyId: "",
    platform: "" as PropertyReviewChannel | "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.text) {
      toast.error("Por favor completa el nombre y el testimonio");
      return;
    }

    if (formData.rating < 1 || formData.rating > 5) {
      toast.error("La calificación debe estar entre 1 y 5 estrellas");
      return;
    }

    // redirect() dentro de la Server Action lanza una excepción especial de
    // Next.js; sólo se maneja correctamente dentro de una transición, de lo
    // contrario un try/catch normal la confunde con un error real.
    startTransition(async () => {
      const result = await handleCreateTestimonial({
        ...formData,
        platform: formData.platform || undefined,
      });

      if (result && !result.success) {
        toast.error(result.error || "Error al crear el testimonio");
        return;
      }

      toast.success("Testimonio creado exitosamente");
    });
  };

  const renderStarRating = () => (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setFormData((prev) => ({ ...prev, rating: i + 1 }))}
          className="focus:outline-none"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              i < formData.rating
                ? "text-yellow-400 fill-current"
                : "text-gray-300 hover:text-yellow-200"
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-gray-600">({formData.rating}/5)</span>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <TestimonialReviewImport
        onImported={(draft) =>
          setFormData((prev) => ({
            ...prev,
            name: draft.name,
            text: draft.text,
            rating: draft.rating,
            location: draft.location,
            // Sólo se sobrescribe lo que la IA logró identificar.
            platform: draft.platform ?? prev.platform,
            propertyId: draft.propertyId ?? prev.propertyId,
            image: draft.image ?? prev.image,
          }))
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Cliente *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="María González"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Ubicación (Opcional)</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Ciudad de México"
              />
            </div>
          </div>

          <TestimonialImageField
            value={formData.image}
            onChange={(image) => setFormData((prev) => ({ ...prev, image }))}
          />

          <TestimonialPropertySelect
            properties={properties}
            value={formData.propertyId}
            onChange={(propertyId) => setFormData((prev) => ({ ...prev, propertyId }))}
          />

          <TestimonialPlatformSelect
            value={formData.platform}
            onChange={(platform) => setFormData((prev) => ({ ...prev, platform }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contenido del Testimonio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">Testimonio *</Label>
            <Textarea
              id="text"
              value={formData.text}
              onChange={(e) => setFormData((prev) => ({ ...prev, text: e.target.value }))}
              placeholder="Una experiencia absolutamente increíble..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Calificación</Label>
            {renderStarRating()}
          </div>

          <div className="space-y-2">
            <Label>Testimonio Destacado</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.featured}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, featured: checked }))
                }
              />
              <span className="text-sm text-gray-600">
                {formData.featured
                  ? "Se mostrará en la página principal"
                  : "Testimonio regular"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vista Previa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              {formData.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- Vista previa con data/blob URL
                <img
                  src={formData.image}
                  alt={formData.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : formData.name.trim() ? (
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
                  {getNameInitials(formData.name)}
                </div>
              ) : (
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-600" />
                </div>
              )}
              <div>
                <h4 className="font-semibold">{formData.name || "Nombre del Cliente"}</h4>
                {formData.location && (
                  <p className="text-sm text-gray-600">{formData.location}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 mb-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < formData.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                  }`}
                />
              ))}
            </div>

            <p className="text-gray-700 italic">
              &ldquo;{formData.text || "El testimonio aparecerá aquí..."}&rdquo;
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Crear Testimonio
            </>
          )}
        </Button>
        <Button asChild variant="outline" disabled={isPending}>
          <Link href="/admin/testimonials">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
