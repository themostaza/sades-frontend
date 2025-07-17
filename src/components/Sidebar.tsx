'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarRoutes, getDefaultRoute, isValidRole, type UserRole } from '../utils/permissions';
import {
  Home,
  CheckSquare,
  Users,
  BriefcaseBusiness,
  Wrench,
  Bell,
  Archive,
  LifeBuoy,
  LogOut,
  X,
} from 'lucide-react';

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
}

// Interfaccia per le informazioni utente
interface UserInfo {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone_number: string;
  role: string;
}

const allMenuItems = [
  { id: 'dashboard', icon: Home, label: 'Dashboard', route: '/dashboard' },
  { id: 'interventi', icon: CheckSquare, label: 'Interventi', route: '/interventi' },
  { id: 'team', icon: Users, label: 'Team', route: '/team' },
  { id: 'clienti', icon: BriefcaseBusiness, label: 'Clienti', route: '/clienti' },
  { id: 'apparecchiature', icon: Wrench, label: 'Apparecchiature', route: '/apparecchiature' },
  { id: 'inventario', icon: Archive, label: 'Inventario', route: '/inventario' },
  { id: 'notifiche', icon: Bell, label: 'Notifiche', route: '/notifiche' },
];

const bottomItems = [
  { id: 'help', icon: LifeBuoy, label: 'Supporto', route: '/help' },
  { id: 'logout', icon: LogOut, label: 'Logout' },
];

export default function Sidebar({
  activeItem,
  onItemClick,
}: SidebarProps) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname();
  const { logout, token } = useAuth();

  // Funzione per recuperare le informazioni dell'utente
  const fetchUserInfo = async () => {
    try {
      setUserLoading(true);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/auth/me', {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Sessione scaduta, effettuando logout');    
          logout();
          return;
        }
        throw new Error('Failed to fetch user info');
      }
      
      const userData: UserInfo = await response.json();
      setUserInfo(userData);
      // console.log('✅ Informazioni utente caricate nella sidebar:', userData);
    } catch (err) {
      console.error('Error fetching user info in sidebar:', err);
    } finally {
      setUserLoading(false);
    }
  };

  // Effect per caricare le informazioni utente al mount
  useEffect(() => {
    if (token) {
      fetchUserInfo();
    }
  }, [token]);

  // Funzione per filtrare i menu items in base al ruolo
  const getFilteredMenuItems = () => {
    if (!userInfo || !isValidRole(userInfo.role)) return [];
    
    const userRole = userInfo.role as UserRole;
    const allowedRoutes = getSidebarRoutes(userRole);
    
    return allMenuItems.filter(item => 
      allowedRoutes.includes(item.route)
    );
  };

  // Determina l'item attivo basandosi sul pathname se activeItem non è fornito
  const getActiveItem = () => {
    if (activeItem) return activeItem;
    
    // Mappa i pathname agli item IDs
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname === '/interventi') return 'interventi';
    if (pathname === '/team') return 'team';
    if (pathname === '/clienti') return 'clienti';
    if (pathname === '/apparecchiature') return 'apparecchiature';
    if (pathname === '/notifiche') return 'notifiche';
    if (pathname === '/inventario') return 'inventario';
    if (pathname === '/help') return 'help';
    
    // Default basato sul sistema di permessi
    if (userInfo && isValidRole(userInfo.role)) {
      const userRole = userInfo.role as UserRole;
      const defaultRoute = getDefaultRoute(userRole);
      // Trova l'item corrispondente alla route di default
      const defaultItem = allMenuItems.find(item => item.route === defaultRoute);
      return defaultItem?.id || 'dashboard';
    }
    
    return 'dashboard';
  };

  const currentActiveItem = getActiveItem();
  const menuItems = getFilteredMenuItems();

  const handleItemClick = (itemId: string, route?: string) => {
    if (itemId === 'logout') {
      setShowLogoutDialog(true);
      return;
    }
    
    // Naviga alla route se specificata
    if (route) {
      router.push(route);
    }
    
    // Chiama il callback se fornito
    if (onItemClick) {
      onItemClick(itemId);
    }
  };

  const handleLogout = () => {
    logout();
    setShowLogoutDialog(false);
  };

  const handleCancelLogout = () => {
    setShowLogoutDialog(false);
  };

  return (
    <div className="w-16 bg-teal-700 h-screen flex flex-col items-center py-4 shadow-lg">
      {/* Logo */}
      <div className="mb-6">
          <Image
            src="/favicon.ico"
            alt="Sades Logo"
            width={24}
            height={24}
            className="object-contain"
          />
        
      </div>
      
      {/* Menu Items */}
      <div className="flex flex-col gap-2">
        {!userLoading && menuItems.map(({ id, icon: Icon, label, route }) => (
          <button
            key={id}
            onClick={() => handleItemClick(id, route)}
            className={`
              p-3 rounded-lg transition-all duration-200 hover:bg-teal-500 group relative
              ${currentActiveItem === id ? 'bg-teal-500 shadow-md' : 'hover:bg-teal-500/70'}
            `}
          >
            <Icon
              size={20}
              className={`
                text-white transition-transform duration-200 group-hover:scale-110
                ${currentActiveItem === id ? 'scale-110' : ''}
              `}
            />

            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              {label}
            </div>
          </button>
        ))}
        
        {/* Loading skeleton per menu items */}
        {userLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-teal-600/50 animate-pulse"
              >
                <div className="w-5 h-5 bg-teal-400/50 rounded"></div>
              </div>
            ))}
          </>
        )}
      </div>
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Bottom Items */}
      <div className="flex flex-col gap-2">
        {bottomItems.map(({ id, icon: Icon, label, route }) => (
          <button
            key={id}
            onClick={() => handleItemClick(id, route)}
            className={`
              p-3 rounded-lg transition-all duration-200 hover:bg-teal-500 group relative
              ${currentActiveItem === id ? 'bg-teal-500 shadow-md' : 'hover:bg-teal-500/70'}
            `}
          >
            <Icon
              size={20}
              className={`
                text-white transition-transform duration-200 group-hover:scale-110
                ${currentActiveItem === id ? 'scale-110' : ''}
              `}
            />

            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              {label}
            </div>
          </button>
        ))}
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Conferma Logout
              </h3>
              <button
                onClick={handleCancelLogout}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">
              Sei sicuro di voler effettuare il logout? Dovrai accedere nuovamente per continuare.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelLogout}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
