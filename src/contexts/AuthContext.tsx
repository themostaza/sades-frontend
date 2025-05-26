'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { loginUser } from '../utils/api';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  // Login method for user authentication
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Pagine pubbliche che non richiedono autenticazione
  const publicPages = ['/', '/login'];
  const isPublicPage = publicPages.includes(pathname);

  // Inizializza l'autenticazione al caricamento
  useEffect(() => {
    const initAuth = () => {
      const storedToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
      
      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          
          // Imposta anche il cookie per il middleware
          document.cookie = `auth_token=${storedToken}; path=/; max-age=${30 * 24 * 60 * 60}`; // 30 giorni
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('auth_user');
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Middleware di autenticazione
  useEffect(() => {
    if (!isLoading && !isPublicPage && !token) {
      router.push('/login');
    }
  }, [isLoading, isPublicPage, token, router]);

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await loginUser(email, password);
      
      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Errore durante il login' };
      }

      const { token: authToken, user: userData } = result.data;

      setToken(authToken);
      setUser(userData);
      
      // Imposta il cookie per il middleware
      const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 giorni o 1 giorno
      document.cookie = `auth_token=${authToken}; path=/; max-age=${maxAge}`;
      
      // Salva nel localStorage se "ricordami" è selezionato
      if (rememberMe) {
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('auth_user', JSON.stringify(userData));
      } else {
        // Usa sessionStorage per sessioni temporanee
        sessionStorage.setItem('auth_token', authToken);
        sessionStorage.setItem('auth_user', JSON.stringify(userData));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Errore durante il login. Riprova più tardi.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    
    // Rimuovi il cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    router.push('/login');
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    isAuthenticated: !!token,
  };

  // Mostra un loading spinner durante l'inizializzazione
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <span className="text-gray-600">Caricamento...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 