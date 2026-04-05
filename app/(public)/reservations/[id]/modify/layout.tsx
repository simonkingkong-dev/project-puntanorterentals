import type { Metadata } from 'next';
import { getServerLocale } from '@/lib/i18n/server';
import { messages } from '@/lib/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const m = messages[locale];
  return {
    title: m.modify_title,
    description: m.modify_meta,
  };
}

export default function ModifyReservationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
