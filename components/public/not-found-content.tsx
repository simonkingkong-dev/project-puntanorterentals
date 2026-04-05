"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

export function NotFoundContent() {
  const { t } = useLocale();
  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <p className="text-8xl sm:text-9xl font-extrabold text-orange-500/15 leading-none select-none" aria-hidden>
        404
      </p>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
        {t("not_found_title", "Page not found")}
      </h1>
      <p className="text-muted-foreground text-base leading-relaxed">
        {t(
          "not_found_body",
          "We could not find what you are looking for. The page may have moved or the link is incorrect."
        )}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button asChild className="w-full sm:w-auto">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            {t("not_found_cta_home", "Back to home")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/properties">
            <Search className="mr-2 h-4 w-4" />
            {t("not_found_cta_properties", "View properties")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
