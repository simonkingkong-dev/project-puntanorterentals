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
  const content = await getSiteContentBySectionAdmin('cancellation');
  const c = contentMap(content);
  return {
    title: c.page_cancellation_title?.trim() || m.page_cancellation_title,
    description: c.page_cancellation_meta?.trim() || m.page_cancellation_meta,
  };
}

export default async function CancellationPage() {
  const locale = await getServerLocale();
  const m = messages[locale];
  const content = await getSiteContentBySectionAdmin('cancellation');
  const c = contentMap(content);
  const tx = (cmsKey: string, fallback: string) => c[cmsKey]?.trim() || fallback;

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-muted/50 to-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <article className="rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm p-8 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {tx('page_cancellation_title', m.page_cancellation_title)}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {tx('page_cancellation_updated', m.page_cancellation_updated)}
          </p>
          <div className="mt-8 space-y-5 text-muted-foreground leading-relaxed">
            <p>{tx('page_cancellation_p1', m.page_cancellation_p1)}</p>
            <p>{tx('page_cancellation_p2', m.page_cancellation_p2)}</p>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/help">{m.page_help_title}</Link>
            </Button>
          </div>
        </article>
      </div>
    </div>
  );
}
