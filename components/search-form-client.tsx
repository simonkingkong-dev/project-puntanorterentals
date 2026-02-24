'use client';

import dynamic from 'next/dynamic';

// Radix Select genera IDs internos que pueden diferir entre servidor y cliente.
// Cargar solo en cliente evita el hydration mismatch de aria-controls.
const SearchForm = dynamic(() => import('@/components/ui/search-form'), { ssr: false });

export default function SearchFormClient() {
  return <SearchForm />;
}
