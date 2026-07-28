"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  Star,
  Loader2,
  Pencil,
  RotateCcw,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getReviewChannelLabel } from "@/lib/review-channels";
import { getNameInitials } from "@/lib/utils";
import type { RevyoosReview } from "@/lib/types";
import type { RevyoosManagePage } from "@/lib/revyoos/manage";
import {
  setRevyoosReviewPublishedAction,
  setRevyoosReviewFeaturedAction,
  updateRevyoosReviewDisplayTextAction,
  autoSelectRealisticForPropertyAction,
  autoSelectRealisticForHomeAction,
} from "@/app/admin/testimonials/revyoos-actions";

interface RevyoosReviewManagerProps {
  tab: "property" | "home";
  properties: Array<{ id: string; title: string }>;
  selectedPropertyId: string;
  search: string;
  onlyFeatured: boolean;
  reviewsPage: RevyoosManagePage;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

export default function RevyoosReviewManager({
  tab,
  properties,
  selectedPropertyId,
  search,
  onlyFeatured,
  reviewsPage,
}: RevyoosReviewManagerProps) {
  const router = useRouter();
  const [reviews, setReviews] = useState<RevyoosReview[]>(reviewsPage.reviews);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [searchInput, setSearchInput] = useState(search);
  const [autoSelecting, startAutoSelect] = useTransition();

  // router.push() re-renders este mismo componente con un `reviewsPage` nuevo (no lo remonta),
  // así que el estado local hay que resincronizarlo explícitamente en cada cambio de página/filtro.
  useEffect(() => {
    setReviews(reviewsPage.reviews);
    setEditingId(null);
  }, [reviewsPage]);

  const navigate = (params: Record<string, string | number | boolean | undefined>) => {
    const usp = new URLSearchParams();
    usp.set("tab", tab);
    if (tab === "property" && selectedPropertyId) usp.set("property", selectedPropertyId);
    if (search) usp.set("q", search);
    if (tab === "home" && onlyFeatured) usp.set("onlyFeatured", "1");
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === "" || v === false) usp.delete(k);
      else usp.set(k, String(v === true ? "1" : v));
    }
    router.push(`/admin/testimonials/revyoos?${usp.toString()}`);
  };

  const totalPages = Math.max(1, Math.ceil(reviewsPage.total / reviewsPage.pageSize));

  const toggleRow = async (review: RevyoosReview) => {
    setSavingId(review.id);
    const nextValue = tab === "property" ? review.status !== "published" : !review.featuredOnHome;
    const result =
      tab === "property"
        ? await setRevyoosReviewPublishedAction(review.id, nextValue)
        : await setRevyoosReviewFeaturedAction(review.id, nextValue);
    if (!result.success) {
      toast.error(result.error);
    } else {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id
            ? tab === "property"
              ? { ...r, status: nextValue ? "published" : "draft" }
              : { ...r, featuredOnHome: nextValue }
            : r
        )
      );
    }
    setSavingId(null);
  };

  const startEdit = (review: RevyoosReview) => {
    setEditingId(review.id);
    setEditText(review.displayText ?? review.text);
  };

  const saveEdit = async (review: RevyoosReview) => {
    setSavingId(review.id);
    const result = await updateRevyoosReviewDisplayTextAction(review.id, editText);
    if (!result.success) {
      toast.error(result.error);
    } else {
      const trimmed = editText.trim();
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id
            ? { ...r, displayText: trimmed && trimmed !== r.text ? trimmed : undefined }
            : r
        )
      );
      toast.success("Texto actualizado");
      setEditingId(null);
    }
    setSavingId(null);
  };

  const restoreOriginal = async (review: RevyoosReview) => {
    setSavingId(review.id);
    const result = await updateRevyoosReviewDisplayTextAction(review.id, "");
    if (!result.success) {
      toast.error(result.error);
    } else {
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, displayText: undefined } : r)));
      toast.success("Se restauró el texto original");
      if (editingId === review.id) setEditingId(null);
    }
    setSavingId(null);
  };

  const runAutoSelect = () => {
    startAutoSelect(async () => {
      const result =
        tab === "property"
          ? await autoSelectRealisticForPropertyAction(selectedPropertyId)
          : await autoSelectRealisticForHomeAction();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Seleccionadas ${result.selectedCount} de ${result.totalCount} reseñas`);
      router.refresh();
    });
  };

  const selectedPropertyTitle = properties.find((p) => p.id === selectedPropertyId)?.title;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b">
        <button
          type="button"
          onClick={() => navigate({ tab: "property", page: 1, q: undefined })}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "property" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          Por propiedad
        </button>
        <button
          type="button"
          onClick={() => navigate({ tab: "home", page: 1, q: undefined })}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "home" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          Carrusel de inicio
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {tab === "property" ? (
          <Select
            value={selectedPropertyId}
            onValueChange={(v) => navigate({ property: v, page: 1 })}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecciona una propiedad" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <Switch
              checked={onlyFeatured}
              onCheckedChange={(checked) => navigate({ onlyFeatured: checked, page: 1 })}
            />
            Sólo destacadas
          </label>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ q: searchInput, page: 1 });
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre o texto..."
            className="w-64"
          />
          <Button type="submit" variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <div className="ml-auto">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={tab === "property" && !selectedPropertyId}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Auto-seleccionar realista
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {tab === "property"
                    ? `¿Reemplazar la selección publicada de "${selectedPropertyTitle ?? ""}"?`
                    : "¿Reemplazar las reseñas destacadas del inicio?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Elige hasta {tab === "property" ? "30" : "35"} reseñas reales cuyo promedio caiga
                  entre 4.3 y 4.7, como punto de partida. Esto reemplaza{" "}
                  {tab === "property" ? "lo publicado hoy en esta propiedad" : "lo destacado hoy en el inicio"}
                  ; luego puedes ajustar a mano.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={runAutoSelect} disabled={autoSelecting}>
                  {autoSelecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Reemplazar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Huésped</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead>Calificación</TableHead>
              <TableHead className="min-w-[280px]">Texto</TableHead>
              <TableHead>Fecha</TableHead>
              {tab === "home" && <TableHead>Propiedad</TableHead>}
              <TableHead className="text-right">
                {tab === "property" ? "Publicado" : "Destacado"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((review) => {
              const isEdited = Boolean(review.displayText?.trim());
              const displayed = review.displayText?.trim() || review.text;
              const isSaving = savingId === review.id;
              const propertyTitle =
                tab === "home" ? properties.find((p) => p.id === review.propertyId)?.title : undefined;

              return (
                <TableRow key={review.id}>
                  <TableCell>
                    {review.avatarUrl ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border">
                        <Image src={review.avatarUrl} alt="" fill className="object-cover" sizes="32px" unoptimized />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                        {getNameInitials(review.author)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{review.author}</TableCell>
                  <TableCell>
                    <span className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                      {getReviewChannelLabel(review.platform, "es")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i < Math.round(review.rating) ? "fill-current" : "text-gray-300"}`}
                        />
                      ))}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-md">
                    {editingId === review.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={4}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(review)} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                            Guardar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {isEdited && (
                          <Badge variant="secondary" className="text-[10px]">
                            Editado
                          </Badge>
                        )}
                        <p className="text-sm text-gray-600 line-clamp-3">{displayed}</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(review)}
                            className="inline-flex items-center gap-1 text-xs text-orange-700 hover:underline"
                          >
                            <Pencil className="h-3 w-3" />
                            Editar texto
                          </button>
                          {isEdited && (
                            <button
                              type="button"
                              onClick={() => restoreOriginal(review)}
                              disabled={isSaving}
                              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:underline"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Restaurar original
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(review.reviewDate)}
                  </TableCell>
                  {tab === "home" && (
                    <TableCell className="text-sm text-gray-500">{propertyTitle}</TableCell>
                  )}
                  <TableCell className="text-right">
                    {isSaving && editingId !== review.id ? (
                      <Loader2 className="h-4 w-4 animate-spin inline-block" />
                    ) : (
                      <Switch
                        checked={tab === "property" ? review.status === "published" : review.featuredOnHome}
                        onCheckedChange={() => toggleRow(review)}
                        disabled={isSaving}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {reviews.length === 0 && (
              <TableRow>
                <TableCell colSpan={tab === "home" ? 8 : 7} className="text-center text-gray-500 py-8">
                  No hay reseñas para mostrar con estos filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {reviewsPage.total} reseña{reviewsPage.total === 1 ? "" : "s"} · página {reviewsPage.page} de{" "}
          {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={reviewsPage.page <= 1}
            onClick={() => navigate({ page: reviewsPage.page - 1 })}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={reviewsPage.page >= totalPages}
            onClick={() => navigate({ page: reviewsPage.page + 1 })}
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
