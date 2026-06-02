import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { unstable_cache } from "next/cache";
import { Button } from "@/components/ui/button";
import { getServiceBySlugAdmin } from "@/lib/firebase-admin-queries";
import { getServerLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";
import ServiceBookingPanel from "@/components/service/service-booking-panel";

export const revalidate = 300;

const getCachedServiceBySlug = unstable_cache(
  async (slug: string) => getServiceBySlugAdmin(slug),
  ["public-service-by-slug"],
  { revalidate: 300, tags: ["services"] }
);

interface ServicePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getCachedServiceBySlug(slug);
  if (!service) return { title: "Service" };
  return {
    title: service.title,
    description: service.description.slice(0, 160),
  };
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = await getCachedServiceBySlug(slug);
  const locale = await getServerLocale();
  const m = messages[locale];

  if (!service) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button asChild variant="ghost">
            <Link href="/services">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {m.nav_services ?? "Servicios"}
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="relative h-72 sm:h-96 rounded-xl overflow-hidden">
            <Image
              src={service.image}
              alt={service.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{service.title}</h1>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{service.description}</p>
          </div>
        </div>
        <div>
          <ServiceBookingPanel service={service} />
        </div>
      </div>
    </div>
  );
}
