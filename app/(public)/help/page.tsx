import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getServerLocale } from '@/lib/i18n/server';
import { messages } from '@/lib/i18n/messages';
import { getSiteContentBySectionAdmin } from '@/lib/firebase-admin-queries';

function contentMap(items: { key: string; value: string }[]) {
  return Object.fromEntries(items.map((i) => [i.key, i.value]));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const m = messages[locale];
  const content = await getSiteContentBySectionAdmin('help');
  const c = contentMap(content);
  return {
    title: c.page_help_title?.trim() || m.page_help_title,
    description: c.page_help_meta?.trim() || m.page_help_meta,
  };
}

export default async function HelpPage() {
  const locale = await getServerLocale();
  const m = messages[locale];
  const content = await getSiteContentBySectionAdmin('help');
  const c = contentMap(content);
  const tx = (cmsKey: string, fallback: string) => c[cmsKey]?.trim() || fallback;

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-muted/50 to-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {tx('page_help_title', m.page_help_title)}
          </h1>
          <p className="mt-3 text-muted-foreground text-lg leading-relaxed">
            {tx('page_help_intro', m.page_help_intro)}
          </p>
        </header>

        <div className="space-y-5">
          <section className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">
              {tx('page_help_how_book_title', m.page_help_how_book_title)}
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              {tx('page_help_how_book', m.page_help_how_book)}
            </p>
          </section>
          <section className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">
              {tx('page_help_how_cancel_title', m.page_help_how_cancel_title)}
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              {tx('page_help_how_cancel', m.page_help_how_cancel)}
            </p>
            <p className="mt-4">
              <Link
                href="/cancellation"
                className="text-orange-600 font-medium hover:underline inline-flex items-center gap-1"
              >
                {tx('page_help_link_cancellation', m.page_help_link_cancellation)}
              </Link>
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/properties">{m.home_cta_properties}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
