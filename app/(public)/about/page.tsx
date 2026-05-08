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
  const content = await getSiteContentBySectionAdmin('about');
  const c = contentMap(content);
  const title = c.page_about_title?.trim() || m.page_about_title;
  const description = c.page_about_meta?.trim() || m.page_about_meta;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function AboutPage() {
  const locale = await getServerLocale();
  const m = messages[locale];
  const content = await getSiteContentBySectionAdmin('about');
  const c = contentMap(content);
  const tx = (cmsKey: string, fallback: string) => c[cmsKey]?.trim() || fallback;

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-muted/50 to-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <article className="rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm p-8 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {tx('page_about_title', m.page_about_title)}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            {tx('page_about_lead', m.page_about_lead)}
          </p>
          <p className="mt-6 text-muted-foreground leading-relaxed">
            {tx('page_about_body', m.page_about_body)}
          </p>
          <div className="mt-10">
            <Button
              asChild
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              <Link href="/properties">{m.home_cta_properties}</Link>
            </Button>
          </div>
        </article>
      </div>
    </div>
  );
}
