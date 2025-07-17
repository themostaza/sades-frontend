'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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

  // Inizializzazione semplificata - legge solo il cookie
  useEffect(() => {
    const initAuth = () => {
      // Il middleware gestisce la validazione del token
      // Qui leggiamo solo il cookie per determinare lo stato iniziale
      const cookieToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];
      
      if (cookieToken) {
        // Se c'è un token nel cookie, assumiamo che l'utente sia autenticato
        // Le info utente verranno caricate dal middleware/server
        setToken(cookieToken);
        // Potresti anche leggere user info dal cookie se necessario
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await loginUser(email, password);
      
      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Errore durante il login' };
      }

      const { token: authToken, user: userData } = result.data;

      setToken(authToken);
      setUser(userData);
      
      // Imposta solo il cookie - il middleware gestisce il resto
      const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 giorni o 1 giorno
      const isSecure = window.location.protocol === 'https:';
      const cookieString = `auth_token=${authToken}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      document.cookie = cookieString;
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Errore durante il login. Riprova più tardi.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    
    // Rimuovi solo il cookie - semplificato
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

  // Loading semplificato
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