import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getServerLocale } from '@/lib/i18n/server';
import { messages } from '@/lib/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const m = messages[locale];
  return {
    title: m.page_privacy_title,
    description: m.page_privacy_meta,
  };
}

export default async function PrivacyPage() {
  const locale = await getServerLocale();
  const m = messages[locale];

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-muted/50 to-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <article className="rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm p-8 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {m.page_privacy_title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{m.page_privacy_updated}</p>
          <div className="mt-8 space-y-5 text-muted-foreground leading-relaxed">
            <p>{m.page_privacy_p1}</p>
            <p>{m.page_privacy_p2}</p>
          </div>
          <div className="mt-10">
            <Button asChild variant="outline">
              <Link href="/">{m.not_found_cta_home}</Link>
            </Button>
          </div>
        </article>
      </div>
    </div>
  );
}
