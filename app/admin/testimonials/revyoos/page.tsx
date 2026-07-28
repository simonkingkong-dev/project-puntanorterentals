import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getAdminProperties } from "@/lib/firebase-admin-queries";
import {
  getRevyoosReviewsForPropertyManageAdmin,
  getRevyoosReviewsForHomeManageAdmin,
} from "@/lib/revyoos/manage";
import RevyoosReviewManager from "@/components/admin/revyoos-review-manager";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

interface RevyoosManagePageProps {
  searchParams: Promise<{
    tab?: string;
    property?: string;
    page?: string;
    q?: string;
    onlyFeatured?: string;
  }>;
}

export default async function RevyoosManagePage({ searchParams }: RevyoosManagePageProps) {
  const sp = await searchParams;
  const tab = sp.tab === "home" ? "home" : "property";
  const page = Math.max(1, Number(sp.page) || 1);
  const search = sp.q ?? "";
  const onlyFeatured = sp.onlyFeatured === "1";

  const properties = await getAdminProperties();
  const selectedPropertyId =
    tab === "property" ? sp.property || properties[0]?.id || "" : sp.property || "";

  const reviewsPage =
    tab === "property" && selectedPropertyId
      ? await getRevyoosReviewsForPropertyManageAdmin(selectedPropertyId, {
          page,
          pageSize: PAGE_SIZE,
          search,
        })
      : tab === "home"
        ? await getRevyoosReviewsForHomeManageAdmin({ page, pageSize: PAGE_SIZE, search, onlyFeatured })
        : { reviews: [], total: 0, page: 1, pageSize: PAGE_SIZE };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost">
          <Link href="/admin/testimonials">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Testimonios
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reseñas importadas (Revyoos)</h1>
          <p className="text-gray-600">
            Elige a mano cuáles reseñas se publican en cada propiedad y cuáles aparecen en el
            carrusel del inicio. También puedes editar el texto mostrado.
          </p>
        </div>
      </div>

      <RevyoosReviewManager
        tab={tab}
        properties={properties.map((p) => ({ id: p.id, title: p.title }))}
        selectedPropertyId={selectedPropertyId}
        search={search}
        onlyFeatured={onlyFeatured}
        reviewsPage={reviewsPage}
      />
    </div>
  );
}
