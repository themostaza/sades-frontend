// Usa i proxy locali per evitare problemi CORS
const API_BASE = '/api';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UserData {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

/**
 * Verifica la validità del token di autenticazione
 * @param token - Il token JWT da verificare
 * @returns Promise con i dati dell'utente se il token è valido
 */
export const verifyToken = async (token: string): Promise<ApiResponse<UserData>> => {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Token non valido o scaduto' };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data: {
        id: data.id || data.user_id || '1',
        email: data.email,
        name: data.name || data.full_name,
        role: data.role || data.user_role,
      }
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore di verifica del token'
    };
  }
};

/**
 * Effettua il login dell'utente
 * @param email - Email dell'utente
 * @param password - Password dell'utente
 * @returns Promise con i dati di login
 */
export const loginUser = async (email: string, password: string): Promise<ApiResponse<{ token: string; user: UserData }>> => {
  try {
    const requestBody = {
      email,
      password,
    };
    
    console.log('🔍 Login Request:', {
      url: `${API_BASE}/auth/login`,
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: requestBody
    });

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', errorText);
      
      if (response.status === 401) {
        return { success: false, error: 'Credenziali non valide' };
      }
      if (response.status === 400) {
        return { success: false, error: 'Dati di login non validi' };
      }
      if (response.status === 429) {
        return { success: false, error: 'Troppi tentativi di login. Riprova più tardi' };
      }
      if (response.status >= 500) {
        return { success: false, error: 'Errore del server. Riprova più tardi' };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Success Response:', data);
    
    const token = data.token || data.access_token || data.accessToken;
    const userData = data.user || { 
      id: data.id || data.user_id || '1', 
      email, 
      name: data.name || data.full_name,
      role: data.role || data.user_role
    };

    if (!token) {
      console.error('❌ No token in response:', data);
      return { success: false, error: 'Token non ricevuto dal server' };
    }

    console.log('🎯 Extracted token:', token);
    console.log('👤 Extracted user data:', userData);

    return {
      success: true,
      data: { token, user: userData }
    };
  } catch (error) {
    console.error('💥 Login error:', error);
    
    // Gestione errori di rete
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Errore di connessione. Verifica la tua connessione internet'
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore durante il login'
    };
  }
}; 