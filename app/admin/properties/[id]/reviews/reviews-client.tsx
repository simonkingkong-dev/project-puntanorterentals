"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROPERTY_REVIEW_CHANNELS } from "@/lib/review-channels";
import type { PropertyReview, PropertyReviewChannel, PropertyReviewPlatformStat } from "@/lib/types";
import {
  deletePropertyReview,
  deletePropertyReviewPlatformStat,
  publishPropertyReview,
  publishPropertyReviewPlatformStat,
  unpublishPropertyReview,
  unpublishPropertyReviewPlatformStat,
  updatePropertyReview,
  updatePropertyReviewPlatformStat,
  uploadAndExtractPropertyReviewStats,
  uploadAndExtractPropertyReviews,
} from "./actions";

interface ReviewsClientProps {
  propertyId: string;
  propertyTitle: string;
  initialReviews: PropertyReview[];
  initialPlatformStats: PropertyReviewPlatformStat[];
}

type PendingUpload = { file: File; channel: PropertyReviewChannel; preview: string };
type PendingStatUpload = { file: File; channel: PropertyReviewChannel; preview: string };

export default function ReviewsClient({
  propertyId,
  propertyTitle,
  initialReviews,
  initialPlatformStats,
}: ReviewsClientProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [platformStats, setPlatformStats] = useState(initialPlatformStats);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [pendingStats, setPendingStats] = useState<PendingStatUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingStats, setUploadingStats] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingStatId, setSavingStatId] = useState<string | null>(null);

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next: PendingUpload[] = [];
    Array.from(files).forEach((file) => {
      next.push({
        file,
        channel: "airbnb",
        preview: URL.createObjectURL(file),
      });
    });
    setPending((p) => [...p, ...next]);
  };

  const addStatFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next: PendingStatUpload[] = [];
    Array.from(files).forEach((file) => {
      next.push({
        file,
        channel: "google",
        preview: URL.createObjectURL(file),
      });
    });
    setPendingStats((p) => [...p, ...next]);
  };

  const runStatExtract = async () => {
    if (pendingStats.length === 0) {
      toast.error("Agrega screenshots de promedio primero");
      return;
    }
    setUploadingStats(true);
    try {
      const fd = new FormData();
      pendingStats.forEach((p) => {
        fd.append("statScreenshots", p.file);
        fd.append("statChannels", p.channel);
      });
      const result = await uploadAndExtractPropertyReviewStats(propertyId, fd);
      if (!result.success) {
        toast.error(result.error ?? "Error al procesar");
        return;
      }
      toast.success(`${result.created} borrador(es) de promedio creado(s). Revisa y publica.`);
      pendingStats.forEach((p) => URL.revokeObjectURL(p.preview));
      setPendingStats([]);
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setUploadingStats(false);
    }
  };

  const runExtract = async () => {
    if (pending.length === 0) {
      toast.error("Agrega screenshots primero");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      pending.forEach((p) => {
        fd.append("screenshots", p.file);
        fd.append("channels", p.channel);
      });
      const result = await uploadAndExtractPropertyReviews(propertyId, fd);
      if (!result.success) {
        toast.error(result.error ?? "Error al procesar");
        return;
      }
      toast.success(`${result.created} borrador(es) creado(s). Revisa y publica.`);
      pending.forEach((p) => URL.revokeObjectURL(p.preview));
      setPending([]);
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setUploading(false);
    }
  };

  const saveReview = async (review: PropertyReview) => {
    setSavingId(review.id);
    try {
      const result = await updatePropertyReview(review.id, propertyId, {
        author: review.author,
        rating: review.rating,
        text: review.text,
        reviewDate: review.reviewDate,
        channel: review.channel,
        sortOrder: review.sortOrder,
      });
      if (!result.success) toast.error(result.error ?? "No se guardó");
      else toast.success("Guardado");
    } finally {
      setSavingId(null);
    }
  };

  const patchLocal = (id: string, patch: Partial<PropertyReview>) => {
    setReviews((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const patchStatLocal = (id: string, patch: Partial<PropertyReviewPlatformStat>) => {
    setPlatformStats((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const savePlatformStat = async (stat: PropertyReviewPlatformStat) => {
    setSavingStatId(stat.id);
    try {
      const result = await updatePropertyReviewPlatformStat(stat.id, propertyId, {
        channel: stat.channel,
        averageRating: stat.averageRating,
        reviewCount: stat.reviewCount,
      });
      if (!result.success) toast.error(result.error ?? "No se guardó");
      else toast.success("Promedio guardado");
    } finally {
      setSavingStatId(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold">Promedios por plataforma</h2>
        <p className="text-sm text-muted-foreground">
          Sube capturas del resumen de calificación (promedio y cantidad de opiniones) de Google,
          Airbnb, Booking.com, etc. Si publicas varias plataformas, en la ficha se suman las
          opiniones y se calcula un promedio ponderado.
        </p>
        <div>
          <Label htmlFor="stat-screenshots">Screenshots de promedio</Label>
          <Input
            id="stat-screenshots"
            type="file"
            accept="image/*"
            multiple
            className="mt-1"
            onChange={(e) => addStatFiles(e.target.files)}
          />
        </div>
        {pendingStats.length > 0 && (
          <div className="space-y-4">
            {pendingStats.map((item, index) => (
              <div
                key={item.preview}
                className="flex flex-col sm:flex-row gap-4 p-3 border rounded-lg"
              >
                <div className="relative w-full sm:w-40 h-28 shrink-0 rounded overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.preview} alt="" className="object-contain w-full h-full" />
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Canal</Label>
                  <Select
                    value={item.channel}
                    onValueChange={(v) =>
                      setPendingStats((list) =>
                        list.map((p, i) =>
                          i === index ? { ...p, channel: v as PropertyReviewChannel } : p
                        )
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_REVIEW_CHANNELS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.labelEs}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            <Button type="button" onClick={runStatExtract} disabled={uploadingStats}>
              {uploadingStats ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Analizar promedios y crear borradores
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Promedios guardados ({platformStats.length})</h2>
        {platformStats.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay promedios por plataforma aún.</p>
        ) : (
          platformStats.map((stat) => (
            <div key={stat.id} className="rounded-lg border bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    stat.status === "published"
                      ? "bg-green-100 text-green-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {stat.status === "published" ? "Publicado" : "Borrador"}
                </span>
              </div>
              <div className="relative w-32 h-20 rounded overflow-hidden border">
                <Image
                  src={stat.screenshotUrl}
                  alt=""
                  fill
                  className="object-contain"
                  sizes="128px"
                  unoptimized
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label>Canal</Label>
                  <Select
                    value={stat.channel}
                    onValueChange={(v) =>
                      patchStatLocal(stat.id, { channel: v as PropertyReviewChannel })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_REVIEW_CHANNELS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.labelEs}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Promedio (1-5)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={stat.averageRating}
                    onChange={(e) =>
                      patchStatLocal(stat.id, { averageRating: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Cantidad de opiniones</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={stat.reviewCount}
                    onChange={(e) =>
                      patchStatLocal(stat.id, { reviewCount: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={savingStatId === stat.id}
                  onClick={() => savePlatformStat(stat)}
                >
                  Guardar
                </Button>
                {stat.status === "draft" ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      await publishPropertyReviewPlatformStat(stat.id, propertyId);
                      patchStatLocal(stat.id, { status: "published" });
                      setPlatformStats((list) =>
                        list.map((s) =>
                          s.id !== stat.id &&
                          s.channel === stat.channel &&
                          s.status === "published"
                            ? { ...s, status: "draft" }
                            : s
                        )
                      );
                      toast.success("Promedio publicado");
                    }}
                  >
                    Publicar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await unpublishPropertyReviewPlatformStat(stat.id, propertyId);
                      patchStatLocal(stat.id, { status: "draft" });
                    }}
                  >
                    Despublicar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!confirm("¿Eliminar este promedio?")) return;
                    await deletePropertyReviewPlatformStat(stat.id, propertyId);
                    setPlatformStats((list) => list.filter((s) => s.id !== stat.id));
                    toast.success("Eliminado");
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold">Importar opiniones individuales</h2>
        <p className="text-sm text-muted-foreground">
          Sube capturas de reseñas de Airbnb, Booking, Google, etc. Elige el canal por imagen. Se crearán borradores para revisar antes de publicar en la ficha de {propertyTitle}.
        </p>
        <div>
          <Label htmlFor="screenshots">Screenshots</Label>
          <Input
            id="screenshots"
            type="file"
            accept="image/*"
            multiple
            className="mt-1"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>
        {pending.length > 0 && (
          <div className="space-y-4">
            {pending.map((item, index) => (
              <div key={item.preview} className="flex flex-col sm:flex-row gap-4 p-3 border rounded-lg">
                <div className="relative w-full sm:w-40 h-28 shrink-0 rounded overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.preview} alt="" className="object-contain w-full h-full" />
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Canal</Label>
                  <Select
                    value={item.channel}
                    onValueChange={(v) =>
                      setPending((list) =>
                        list.map((p, i) =>
                          i === index ? { ...p, channel: v as PropertyReviewChannel } : p
                        )
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_REVIEW_CHANNELS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.labelEs}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            <Button type="button" onClick={runExtract} disabled={uploading}>
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Analizar y crear borradores
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Opiniones individuales ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay reseñas aún.</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="rounded-lg border bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    review.status === "published"
                      ? "bg-green-100 text-green-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {review.status === "published" ? "Publicada" : "Borrador"}
                </span>
                <span className="text-xs text-muted-foreground">Orden: {review.sortOrder}</span>
              </div>
              <div className="relative w-32 h-20 rounded overflow-hidden border">
                <Image
                  src={review.screenshotUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="128px"
                  unoptimized
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Canal</Label>
                  <Select
                    value={review.channel}
                    onValueChange={(v) =>
                      patchLocal(review.id, { channel: v as PropertyReviewChannel })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_REVIEW_CHANNELS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.labelEs}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Autor</Label>
                  <Input
                    value={review.author}
                    onChange={(e) => patchLocal(review.id, { author: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Rating (1-5)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={review.rating}
                    onChange={(e) =>
                      patchLocal(review.id, { rating: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Fecha (texto)</Label>
                  <Input
                    value={review.reviewDate ?? ""}
                    onChange={(e) => patchLocal(review.id, { reviewDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Orden</Label>
                  <Input
                    type="number"
                    value={review.sortOrder}
                    onChange={(e) =>
                      patchLocal(review.id, { sortOrder: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Texto</Label>
                <Textarea
                  value={review.text}
                  rows={4}
                  onChange={(e) => patchLocal(review.id, { text: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={savingId === review.id}
                  onClick={() => saveReview(review)}
                >
                  Guardar
                </Button>
                {review.status === "draft" ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      await publishPropertyReview(review.id, propertyId);
                      patchLocal(review.id, { status: "published" });
                      toast.success("Publicada");
                    }}
                  >
                    Publicar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await unpublishPropertyReview(review.id, propertyId);
                      patchLocal(review.id, { status: "draft" });
                    }}
                  >
                    Despublicar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!confirm("¿Eliminar esta reseña?")) return;
                    await deletePropertyReview(review.id, propertyId);
                    setReviews((list) => list.filter((r) => r.id !== review.id));
                    toast.success("Eliminada");
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
