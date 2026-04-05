import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getServerLocale } from '@/lib/i18n/server';
import { messages } from '@/lib/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const m = messages[locale];
  return {
    title: m.page_help_title,
    description: m.page_help_meta,
  };
}

export default async function HelpPage() {
  const locale = await getServerLocale();
  const m = messages[locale];

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-muted/50 to-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {m.page_help_title}
          </h1>
          <p className="mt-3 text-muted-foreground text-lg leading-relaxed">{m.page_help_intro}</p>
        </header>

        <div className="space-y-5">
          <section className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">{m.page_help_how_book_title}</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">{m.page_help_how_book}</p>
          </section>
          <section className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">{m.page_help_how_cancel_title}</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">{m.page_help_how_cancel}</p>
            <p className="mt-4">
              <Link
                href="/cancellation"
                className="text-orange-600 font-medium hover:underline inline-flex items-center gap-1"
              >
                {m.page_help_link_cancellation}
              </Link>
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
            <Link href="/contact">{m.page_help_cta}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/properties">{m.home_cta_properties}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
