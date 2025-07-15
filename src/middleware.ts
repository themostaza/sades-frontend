import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canAccessRoute, getDefaultRoute, isValidRole, type UserRole } from './utils/permissions';

// Tipo per i dati utente restituiti dall'API
interface UserData {
  id?: string;
  user_id?: string;
  email: string;
  name?: string;
  full_name?: string;
  role?: string;
  user_role?: string;
}

// Funzione helper per retry della validazione token
async function validateTokenWithRetry(baseUrl: string, token: string, maxRetries: number = 2): Promise<{ success: boolean; userData?: UserData; shouldLogout?: boolean }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Token validation attempt ${attempt + 1}/${maxRetries + 1}`);
      
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const userData = await response.json() as UserData;
        console.log('✅ Token validated successfully in middleware');
        return { success: true, userData };
      }

      // Gestione errori specifici
      if (response.status === 401 || response.status === 403) {
        console.log('🚫 Token invalid (401/403) - need to logout');
        return { success: false, shouldLogout: true };
      }

      // Errori del server (5xx) - retry se non è l'ultimo tentativo
      if (response.status >= 500) {
        console.log(`⚠️ Server error (${response.status}) - attempt ${attempt + 1}/${maxRetries + 1}`);
        if (attempt < maxRetries) {
          // Aspetta prima del retry (backoff exponential)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
        // Ultimo tentativo fallito - fail safe (permettere accesso)
        console.log('⚠️ Server error after retries - failing safe (allowing access)');
        return { success: false, shouldLogout: false };
      }

      // Altri errori (400, 404, etc.) - probabilmente token invalido
      console.log(`❌ Token validation failed with status ${response.status}`);
      return { success: false, shouldLogout: true };

    } catch (error) {
      console.error(`💥 Network error during token validation (attempt ${attempt + 1}):`, error);
      
      if (attempt < maxRetries) {
        // Retry per errori di rete
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      
      // Errore di rete dopo tutti i retry - fail safe
      console.log('⚠️ Network error after retries - failing safe (allowing access)');
      return { success: false, shouldLogout: false };
    }
  }

  // Non dovrebbe mai arrivare qui
  return { success: false, shouldLogout: false };
}

export async function middleware(request: NextRequest) {
  console.log('🚀 MIDDLEWARE ATTIVATO per:', request.nextUrl.pathname);
  const { pathname } = request.nextUrl;

  // Pagine pubbliche che non richiedono autenticazione
  const publicPages = ['/', '/login'];
  
  // Se la pagina è pubblica, permetti l'accesso
  if (publicPages.includes(pathname)) {
    return NextResponse.next();
  }
  
  // Controlla se l'utente ha un token di autenticazione
  const token = request.cookies.get('auth_token')?.value;
  
  // Se non c'è token, reindirizza al login
  if (!token) {
    console.log('🚫 No token found, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // Verifica il token con retry e gestione errori migliorata
  const validationResult = await validateTokenWithRetry(request.nextUrl.origin, token);
  
  if (!validationResult.success) {
    if (validationResult.shouldLogout) {
      // Token invalido - logout e redirect
      console.log('🚫 Token validation failed - redirecting to login');
      const loginUrl = new URL('/login', request.url);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.cookies.delete('auth_token');
      return redirectResponse;
    } else {
      // Errore temporaneo del server - fail safe (permettere accesso)
      console.log('⚠️ Server error but allowing access (fail safe)');
      return NextResponse.next();
    }
  }

  const userData = validationResult.userData;

  // Verifica che userData sia definito
  if (!userData) {
    console.log('🚫 No user data received - redirecting to login');
    const loginUrl = new URL('/login', request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.cookies.delete('auth_token');
    return redirectResponse;
  }

  // Verifica che il ruolo sia definito
  if (!userData.role) {
    console.log('🚫 No user role found - redirecting to login');
    const loginUrl = new URL('/login', request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.cookies.delete('auth_token');
    return redirectResponse;
  }

  // Verifica se il ruolo è valido
  if (!isValidRole(userData.role)) {
    console.log('🚫 Invalid user role:', userData.role);
    const loginUrl = new URL('/login', request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.cookies.delete('auth_token');
    return redirectResponse;
  }

  const userRole = userData.role as UserRole;

  // Controlla se l'utente può accedere alla route richiesta
  if (!canAccessRoute(userRole, pathname)) {
    console.log(`🚫 User with role "${userRole}" cannot access "${pathname}"`);
    
    // Reindirizza alla route di default per questo ruolo
    const defaultRoute = getDefaultRoute(userRole);
    console.log(`🔄 Redirecting to default route: ${defaultRoute}`);
    
    const redirectUrl = new URL(defaultRoute, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  console.log(`✅ Access granted for role "${userRole}" to "${pathname}"`);
  
  // Se il token è valido e l'utente ha i permessi, permetti l'accesso
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 