import { useState, useEffect } from 'react';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check for token in localStorage on mount
    const token = localStorage.getItem('token');
    setAuthState({
      token,
      isAuthenticated: !!token,
      isLoading: false,
    });
  }, []);

  const login = (token: string) => {
    localStorage.setItem('token', token);
    setAuthState({
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setAuthState({
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authState.token) {
      headers['Authorization'] = `Bearer ${authState.token}`;
    }

    return headers;
  };

  return {
    ...authState,
    login,
    logout,
    getAuthHeaders,
  };
} 