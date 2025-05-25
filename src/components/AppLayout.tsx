'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Pagine che non devono mostrare la sidebar
  const pagesWithoutSidebar = ['/', '/login'];
  const shouldShowSidebar = !pagesWithoutSidebar.includes(pathname);
  
  // Determina l'item attivo dal pathname
  const getActiveItem = () => {
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname === '/interventi') return 'interventi';
    if (pathname === '/') return 'dashboard'; // Default per la root
    return pathname.replace('/', '') || 'dashboard';
  };

  const [activeItem, setActiveItem] = useState(getActiveItem());

  // Aggiorna l'item attivo quando cambia il pathname
  useEffect(() => {
    setActiveItem(getActiveItem());
  }, [pathname]);

  const handleSidebarClick = (item: string) => {
    setActiveItem(item);
    
    // Navigazione basata sull'item selezionato
    switch (item) {
      case 'dashboard':
        router.push('/dashboard');
        break;
      case 'interventi':
        router.push('/interventi');
        break;
      case 'utenti':
        router.push('/utenti');
        break;
      case 'documenti':
        router.push('/documenti');
        break;
      case 'strumenti':
        router.push('/strumenti');
        break;
      case 'notifiche':
        router.push('/notifiche');
        break;
      case 'calendario':
        router.push('/calendario');
        break;
      case 'settings':
        router.push('/settings');
        break;
      default:
        console.log(`Navigating to: ${item}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar fissa - solo se non siamo in login o root */}
      {shouldShowSidebar && (
        <div className="fixed top-0 left-0 z-50">
          <Sidebar 
            activeItem={activeItem}
            onItemClick={handleSidebarClick}
          />
        </div>
      )}
      
      {/* Main content con margin condizionale per la sidebar */}
      <main className={`min-h-screen ${shouldShowSidebar ? 'ml-16' : ''}`}>
        {children}
      </main>
    </div>
  );
} 