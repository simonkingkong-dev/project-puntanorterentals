import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { getContactInfoAdmin } from '@/lib/firebase-admin-queries';
import { Button } from '@/components/ui/button';
import { getServerLocale } from '@/lib/i18n/server';
import { messages } from '@/lib/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const m = messages[locale];
  return {
    title: m.page_contact_title,
    description: m.page_contact_meta,
  };
}

export default async function ContactPage() {
  const locale = await getServerLocale();
  const m = messages[locale];
  const contact = await getContactInfoAdmin();

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-muted/50 to-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {m.page_contact_title}
          </h1>
          <p className="mt-3 text-muted-foreground text-lg leading-relaxed max-w-2xl">
            {m.page_contact_intro}
          </p>
        </header>

        <div className="rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm p-6 sm:p-8 space-y-8">
          {contact ? (
            <>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                  <Mail className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{m.page_contact_email}</p>
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-foreground font-medium hover:text-orange-600 transition-colors"
                  >
                    {contact.email}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                  <Phone className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{m.page_contact_phone}</p>
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-foreground font-medium hover:text-orange-600 transition-colors"
                  >
                    {contact.phone}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{m.page_contact_address}</p>
                  <p className="text-foreground font-medium">{contact.address}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">{m.page_contact_loading}</p>
          )}
        </div>

        <div className="mt-10">
          <Button asChild variant="outline" size="lg">
            <Link href="/properties">{m.home_cta_properties}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
