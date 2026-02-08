import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { CartProvider } from '@/lib/cart-context';

export default function NotFound() {
  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="space-y-6 max-w-md">
          <h1 className="text-9xl font-extrabold text-primary/20">404</h1>
          <h2 className="text-3xl font-bold tracking-tight">Página no encontrada</h2>
          <p className="text-muted-foreground">
            Lo sentimos, no pudimos encontrar la página que estás buscando. Puede que haya sido eliminada o que la dirección sea incorrecta.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href="/">
              <Button className="w-full sm:w-auto">
                <Home className="mr-2 h-4 w-4" />
                Volver al inicio
              </Button>
            </Link>
            <Link href="/properties">
              <Button variant="outline" className="w-full sm:w-auto">
                <Search className="mr-2 h-4 w-4" />
                Ver Propiedades
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </CartProvider>
  );
}