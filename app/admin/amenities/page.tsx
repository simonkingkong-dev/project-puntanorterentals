import { Metadata } from 'next/metadata';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Wifi, Car, Utensils, Home, Waves, Shield } from 'lucide-react';
// CORREGIDO: Aseguramos la ruta correcta al layout del admin
import AdminLayout from '@/app/admin/layout';
// CORREGIDO: Importamos la función real para OBTENER las amenidades
import { getGlobalAmenities } from '@/lib/firebase/content';

export const metadata: Metadata = {
  title: 'Amenidades Globales - Admin Panel',
  robots: 'noindex, nofollow',
};

// Icon mapping (permanece igual)
const iconMap: { [key: string]: any } = {
  'wifi': Wifi,
  'car': Car,
  'utensils': Utensils,
  'home': Home,
  'waves': Waves,
  'shield': Shield,
};

// CORREGIDO: Eliminamos todo el array 'globalAmenities' mock.

/**
 * Renders the Admin Amenities Page component that allows management of global amenities.
 * @example
 * AdminAmenitiesPage()
 * <AdminLayout>...</AdminLayout>
 * @returns {JSX.Element} A component rendering the admin interface for managing amenities, including lists and actions for amenities.
 */
// CORREGIDO: La función ahora es 'async'
export default async function AdminAmenitiesPage() {
  
  // CORREGIDO: Llamamos a Firebase para obtener los datos reales
  const globalAmenities = await getGlobalAmenities();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Amenidades Globales</h1>
            <p className="text-gray-600">Gestiona las amenidades que se muestran en el sitio</p>
          </div>
          <Button asChild>
            <Link href="/admin/amenities/new">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Amenidad
            </Link>
          </Button>
        </div>

        {/* Stats (Ahora son dinámicas) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{globalAmenities.length}</div>
              <p className="text-sm text-gray-600">Total Amenidades</p