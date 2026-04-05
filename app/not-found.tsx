import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { CartProvider } from "@/lib/cart-context";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { getServerLocale } from "@/lib/i18n/server";
import { NotFoundContent } from "@/components/public/not-found-content";

export default async function NotFound() {
  const initialLocale = await getServerLocale();
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <CartProvider>
        <div className="flex flex-col min-h-screen bg-gray-50">
          <Header />
          <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24 text-center">
            <NotFoundContent />
          </main>
          <Footer />
        </div>
      </CartProvider>
    </LocaleProvider>
  );
}
