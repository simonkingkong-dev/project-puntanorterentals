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
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition-transform duration-200 hover:scale-105 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 md:bottom-5 md:right-5 md:h-16 md:w-16 md:z-50 md:shadow-xl"
    >
      <MessageCircle className="h-8 w-8" />
    </a>
  );
}
