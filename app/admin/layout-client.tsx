'use client'; 

import { ReactNode, useState } from 'react';
import AdminSidebar from '@/components/admin/sidebar';
import AdminHeader from '@/components/admin/header';
import { cn } from '@/lib/utils';

interface AdminLayoutClientProps {
  children: ReactNode; 
}

export default function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  // Iniciaremos el sidebar abierto por defecto en desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className={cn(
        "flex flex-col flex-1 overflow-y-auto transition-all duration-300 ease-in-out",
        isSidebarOpen ? "ml-64" : "ml-20" 
      )}>
        
        <AdminHeader />

        <main className="p-4 sm:p-6 flex-1">
          {children} 
        </main>
      </div>
    </div>
  );
}