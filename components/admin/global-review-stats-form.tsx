"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROPERTY_REVIEW_CHANNELS } from "@/lib/review-channels";
import {
  GLOBAL_REVIEW_PLATFORM_CHANNELS,
  type GlobalReviewAggregateOverride,
  type GlobalReviewPlatformChannel,
} from "@/lib/business-review-platform-stats";
import { computeAggregateReviewStats } from "@/lib/review-platform-stats";
import type { PropertyReviewChannel, PropertyReviewPlatformStat } from "@/lib/types";
import {
  publishBusinessReviewPlatformStat,
  publishGlobalReviewAggregate,
  saveBusinessReviewPlatformStat,
  saveGlobalReviewAggregate,
  unpublishBusinessReviewPlatformStat,
  unpublishGlobalReviewAggregate,
} from "@/app/admin/testimonials/actions";

type ChannelDraft = {
  averageRating: number;
  reviewCount: number;
  status?: "draft" | "published";
};

interface GlobalReviewStatsFormProps {
  initialPlatformStats: PropertyReviewPlatformStat[];
  initialAggregate: GlobalReviewAggregateOverride | null;
}

function getChannelDraft(
  stats: PropertyReviewPlatformStat[],
  channel: PropertyReviewChannel
): ChannelDraft {
  const row = stats.find((s) => s.channel === channel);
  return {
    averageRating: row?.averageRating ?? 0,
    reviewCount: row?.reviewCount ?? 0,
    status: row?.status,
  };
}

export default function GlobalReviewStatsForm({
  initialPlatformStats,
  initialAggregate,
}: GlobalReviewStatsFormProps) {
  const [channelDrafts, setChannelDrafts] = useState<
    Record<GlobalReviewPlatformChannel, ChannelDraft>
  >(
    () => ({
      google: getChannelDraft(initialPlatformStats, "google"),
      airbnb: getChannelDraft(initialPlatformStats, "airbnb"),
      booking: getChannelDraft(initialPlatformStats, "booking"),
    })
  );
  const [aggregateRating, setAggregateRating] = useState(
    initialAggregate?.averageRating ?? 0
  );
  const [aggregateCount, setAggregateCount] = useState(initialAggregate?.reviewCount ?? 0);
  const [aggregateStatus, setAggregateStatus] = useState<"draft" | "published" | undefined>(
    initialAggregate?.status
  );
  const [savingChannel, setSavingChannel] = useState<GlobalReviewPlatformChannel | null>(null);
  const [savingAggregate, setSavingAggregate] = useState(false);

  const publishedForPreview = useMemo((): PropertyReviewPlatformStat[] => {
    return GLOBAL_REVIEW_PLATFORM_CHANNELS.flatMap((channel) => {
      const draft = channelDrafts[channel];
      if (draft.status !== "published" || draft.reviewCount <= 0 || draft.averageRating <= 0) {
        return [];
      }
      return [
        {
          id: `business-${channel}`,
          propertyId: "",
          channel,
          averageRating: draft.averageRating,
          reviewCount: draft.reviewCount,
          screenshotUrl: "",
          status: "published" as const,
          createdAt: new Date(),
        },
      ];
    });
  }, [channelDrafts]);

  const computedAggregate = computeAggregateReviewStats(publishedForPreview);

  const updateChannelDraft = (
    channel: GlobalReviewPlatformChannel,
    patch: Partial<ChannelDraft>
  ) => {
    setChannelDrafts((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], ...patch },
    }));
  };

  const saveChannel = async (channel: GlobalReviewPlatformChannel) => {
    const draft = channelDrafts[channel];
    setSavingChannel(channel);
    try {
      const result = await saveBusinessReviewPlatformStat({
        channel,
        averageRating: draft.averageRating,
        reviewCount: draft.reviewCount,
      });
      if (!result.success) {
        toast.error(result.error ?? "Error al guardar");
        return;
      }
      toast.success(`${channel} guardado`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSavingChannel(null);
    }
  };

  const publishChannel = async (channel: GlobalReviewPlatformChannel) => {
    await saveChannel(channel);
    const result = await publishBusinessReviewPlatformStat(channel);
    if (!result.success) {
      toast.error(result.error ?? "Error al publicar");
      return;
    }
    updateChannelDraft(channel, { status: "published" });
    toast.success(`${channel} publicado en todas las fichas`);
  };

  return (
    <div className="space-y-6">
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader>
          <CardTitle className="text-lg">Promedios globales por plataforma</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Google, Airbnb y Booking a nivel Punta Norte. Se muestran en la pestaña{" "}
            <strong>Reseñas</strong> de cada propiedad (salvo que esa propiedad tenga su propio
            promedio publicado para el mismo canal).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {GLOBAL_REVIEW_PLATFORM_CHANNELS.map((channel) => {
            const draft = channelDrafts[channel];
            const label =
              PROPERTY_REVIEW_CHANNELS.find((c) => c.id === channel)?.labelEs ?? channel;
            return (
              <div
                key={channel}
                className="rounded-lg border bg-white p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
              >
                <div className="sm:col-span-2 lg:col-span-1">
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  {draft.status === "published" ? (
                    <span className="text-xs text-green-700">Publicado</span>
                  ) : (
                    <span className="text-xs text-amber-700">Borrador</span>
                  )}
                </div>
                <div>
                  <Label>Promedio (1-5)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={draft.averageRating || ""}
                    onChange={(e) =>
                      updateChannelDraft(channel, {
                        averageRating: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Opiniones</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={draft.reviewCount || ""}
                    onChange={(e) =>
                      updateChannelDraft(channel, { reviewCount: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={savingChannel === channel}
                    onClick={() => saveChannel(channel)}
                  >
                    Guardar
                  </Button>
                  {draft.status === "published" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        await unpublishBusinessReviewPlatformStat(channel);
                        updateChannelDraft(channel, { status: "draft" });
                        toast.success("Despublicado");
                      }}
                    >
                      Despublicar
                    </Button>
                  ) : (
                    <Button type="button" size="sm" onClick={() => publishChannel(channel)}>
                      Publicar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {computedAggregate && computedAggregate.platformCount > 0 ? (
            <p className="text-sm text-gray-600">
              Vista previa del acumulado calculado (solo canales publicados arriba):{" "}
              <strong>{computedAggregate.averageRating.toFixed(1)}</strong> ·{" "}
              <strong>{computedAggregate.totalReviews}</strong> opiniones
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acumulado global (cabecera en fichas)</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Número principal que verán los huéspedes (p. ej. el promedio que quieras destacar).
            Si lo publicas, tiene prioridad sobre el cálculo automático por plataforma.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
            <div>
              <Label>Promedio acumulado (1-5)</Label>
              <Input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={aggregateRating || ""}
                onChange={(e) => setAggregateRating(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Total de opiniones</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={aggregateCount || ""}
                onChange={(e) => setAggregateCount(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={savingAggregate}
              onClick={async () => {
                setSavingAggregate(true);
                try {
                  const result = await saveGlobalReviewAggregate({
                    averageRating: aggregateRating,
                    reviewCount: aggregateCount,
                  });
                  if (!result.success) toast.error(result.error ?? "Error");
                  else toast.success("Acumulado guardado");
                } finally {
                  setSavingAggregate(false);
                }
              }}
            >
              Guardar acumulado
            </Button>
            {aggregateStatus === "published" ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await unpublishGlobalReviewAggregate();
                  setAggregateStatus("draft");
                  toast.success("Acumulado despublicado");
                }}
              >
                Despublicar acumulado
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  setSavingAggregate(true);
                  try {
                    await saveGlobalReviewAggregate({
                      averageRating: aggregateRating,
                      reviewCount: aggregateCount,
                    });
                    const result = await publishGlobalReviewAggregate();
                    if (!result.success) toast.error(result.error ?? "Error");
                    else {
                      setAggregateStatus("published");
                      toast.success("Acumulado publicado en todas las fichas");
                    }
                  } finally {
                    setSavingAggregate(false);
                  }
                }}
              >
                Publicar acumulado
              </Button>
            )}
            {aggregateStatus === "published" ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                Publicado
              </span>
            ) : (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Borrador
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
