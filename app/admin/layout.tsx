"use client";

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/sidebar'; // Tu sidebar existente
import AdminHeader from '@/components/layout/header'; // Nuevo componente a crear
import { cn } from '@/lib/utils';

// Este layout se aplicará a todas las rutas dentro de /admin
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Estado para controlar la visibilidad del sidebar en pantallas móviles (y escritorio si se quisiera un colapso)
  // Nota: Tu AdminSidebar ya maneja su propia lógica de visibilidad móvil, pero lo mantendremos aquí por si se necesita más control.
  // Por ahora, solo usaremos el children.
  const pathname = usePathname();

  // Esta es la estructura principal: Sidebar fijo a la izquierda y Contenido a la derecha.
  return (
    // Estructura general: Flex container que ocupa toda la altura de la pantalla
    <div className="flex min-h-screen bg-gray-50">
      
      {/* 1. Sidebar Fijo para Escritorio (lg: flex) */}
      {/* Usamos tu AdminSidebar, que tiene lógica interna para ocultarse en móvil */}
      <div className="hidden lg:block flex-shrink-0">
        <AdminSidebar />
      </div>

      {/* 2. Contenido Principal (Header + Main Content) */}
      <div className="flex flex-col flex-1">
        
        {/* Header de Admin (Barra Superior) */}
        <AdminHeader />

        {/* Contenido de la Página */}
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>

        {/* Footer de Admin (Placeholder - Lo quitaremos del layout principal) */}
        {/* Aquí iría un componente Footer si lo necesitaras para el panel. Por ahora, no lo incluimos para evitar el Footer global. */}

      </div>
    </div>
  );
}
