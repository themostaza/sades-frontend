'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, token } = useAuth();

  // Pagine che non devono mostrare la sidebar (pagine pubbliche e specifiche)
  const pagesWithoutSidebar = ['/', '/login', '/change-password'];

  // Funzione per determinare se mostrare la sidebar
  const shouldShowSidebar = () => {
    // Pagine specifiche senza sidebar
    if (pagesWithoutSidebar.includes(pathname)) {
      return false;
    }

    // Pagine di dettaglio rapportino senza sidebar (esperienza fullscreen)
    if (pathname.startsWith('/interventi/rapportino/')) {
      return false;
    }

    return true;
  };

  const showSidebar = shouldShowSidebar();

  // Controllo di autenticazione per pagine non pubbliche
  useEffect(() => {
    // Esegui il controllo solo per pagine che richiedono autenticazione
    // (escludendo solo login e root, ma includendo rapportini che richiedono auth)
    const isPublicPage = pagesWithoutSidebar.includes(pathname);

    if (!isPublicPage) {
      // Verifica sincronizzazione tra cookie e localStorage/sessionStorage
      const cookieToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('auth_token='))
        ?.split('=')[1];

      const storageToken =
        localStorage.getItem('auth_token') ||
        sessionStorage.getItem('auth_token');

      // Se c'è token in storage ma non nel cookie -> logout automatico
      if (storageToken && !cookieToken && token) {
        // console.log('🚫 Desincronizzazione rilevata: token presente in storage ma mancante nel cookie');
        logout();
        return;
      }

      // Se non c'è token né in storage né nel cookie, ma AuthContext pensa di essere autenticato
      if (!storageToken && !cookieToken && token) {
        // console.log('🚫 Nessun token trovato: logout automatico');
        logout();
        return;
      }

      // console.log('✅ Controllo autenticazione AppLayout:', {
      //   pathname,
      //   hasCookieToken: !!cookieToken,
      //   hasStorageToken: !!storageToken,
      //   hasContextToken: !!token
      // });
    }
  }, [pathname, token, logout]); // Controlla ad ogni cambio route

  // Determina l'item attivo dal pathname
  const getActiveItem = () => {
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname === '/interventi') return 'interventi';
    if (pathname === '/team') return 'team';
    if (pathname === '/clienti') return 'clienti';
    if (pathname === '/apparecchiature') return 'apparecchiature';
    if (pathname === '/notifiche') return 'notifiche';
    if (pathname === '/inventario') return 'inventario';
    if (pathname === '/help') return 'help';
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
      case 'team':
        router.push('/team');
        break;
      case 'clienti':
        router.push('/clienti');
        break;
      case 'apparecchiature':
        router.push('/apparecchiature');
        break;
      case 'notifiche':
        router.push('/notifiche');
        break;
      case 'inventario':
        router.push('/inventario');
        break;
      case 'help':
        router.push('/help');
        break;
      default:
      // console.log(`Navigating to: ${item}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar fissa - solo se non siamo in login o root */}
      {showSidebar && (
        <div className="fixed top-0 left-0 z-50">
          <Sidebar activeItem={activeItem} onItemClick={handleSidebarClick} />
        </div>
      )}

      {/* Main content con margin condizionale per la sidebar */}
      <main className={`min-h-screen ${showSidebar ? 'ml-16' : ''}`}>
        {children}
      </main>
    </div>
  );
}
