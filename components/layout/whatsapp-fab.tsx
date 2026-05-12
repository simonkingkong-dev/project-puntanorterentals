import { MessageCircle } from "lucide-react";
import { getContactInfoAdmin } from "@/lib/firebase-admin-queries";

function getWhatsAppLink(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export default async function WhatsAppFab() {
  const contact = await getContactInfoAdmin();
  const directWhatsAppProfileLink = process.env.NEXT_PUBLIC_WHATSAPP_CHAT_URL?.trim();
  const whatsappHref = directWhatsAppProfileLink || getWhatsAppLink(contact?.phone);

  if (!whatsappHref) return null;

  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-24 md:bottom-5 right-4 md:right-5 z-50 inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-500 text-white shadow-xl transition-transform duration-200 hover:scale-105 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
    >
      <MessageCircle className="h-8 w-8" />
    </a>
  );
}
