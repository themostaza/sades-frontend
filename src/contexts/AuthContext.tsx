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

  // Inizializza l'autenticazione al caricamento
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      if (storedToken) {
        try {
          // Chiama /api/auth/me per ottenere le informazioni aggiornate dell'utente
          const response = await fetch('/api/auth/me', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${storedToken}`,
            },
            body: JSON.stringify({ token: storedToken }),
          });

          if (response.ok) {
            const userData = await response.json();
            console.log('✅ User data from /api/auth/me:', userData);
            
            // Imposta token e dati utente aggiornati
            setToken(storedToken);
            setUser({
              id: userData.id || userData.user_id || '1',
              email: userData.email,
              name: userData.name || userData.full_name,
              role: userData.role || userData.user_role
            });
            
            // Imposta anche il cookie per il middleware
            document.cookie = `auth_token=${storedToken}; path=/; max-age=${30 * 24 * 60 * 60}`; // 30 giorni
          } else {
            // Se il token non è valido, pulisci tutto
            console.log('🚫 Token not valid, clearing auth data');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            sessionStorage.removeItem('auth_token');
            sessionStorage.removeItem('auth_user');
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          }
        } catch (error) {
          console.error('Error validating token:', error);
          // In caso di errore, pulisci tutto
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('auth_user');
          document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }
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
      
      // Imposta il cookie per il middleware
      const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 giorni o 1 giorno
      const isSecure = window.location.protocol === 'https:';
      const cookieString = `auth_token=${authToken}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      document.cookie = cookieString;
      
      // Debug: mostra info del cookie
      // const expirationDate = new Date(Date.now() + (maxAge * 1000));
      // console.log('🍪 Cookie impostato:', {
      //   rememberMe,
      //   maxAgeDays: maxAge / (24 * 60 * 60),
      //   expirationDate: expirationDate.toLocaleString('it-IT'),
      //   cookieString
      // });
      
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