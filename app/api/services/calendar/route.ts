import { NextRequest, NextResponse } from "next/server";
import { getServiceByIdAdmin } from "@/lib/firebase-admin-queries";
import { getServiceProviderCalendar } from "@/lib/providers";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
};

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!serviceId) {
    return NextResponse.json({ error: "serviceId is required" }, { status: 400 });
  }

  const service = await getServiceByIdAdmin(serviceId);
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const start = startDate?.slice(0, 10) ?? toDateStr(new Date());
  const end =
    endDate?.slice(0, 10) ??
    toDateStr(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

  try {
    const calendar = await getServiceProviderCalendar(service, start, end);
    return NextResponse.json(
      {
        serviceId,
        availability: calendar.availability,
        dailyRates: calendar.dailyRates,
        source: calendar.source,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error("[services/calendar]", error);
    return NextResponse.json({ error: "Failed to load calendar" }, { status: 500 });
  }
}
