import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canAccessRoute, getDefaultRoute, isValidRole, type UserRole } from './utils/permissions';

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
  
  // Verifica il token tramite API
  try {
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ token }),
    });

    // Se il token non è valido, reindirizza al login
    if (!response.ok) {
      console.log('🚫 Token validation failed in middleware, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.cookies.delete('auth_token');
      return redirectResponse;
    }

    // Ottieni le informazioni dell'utente dalla risposta
    const userData = await response.json();
    console.log('✅ Token validated successfully in middleware, user:', userData);

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
    
  } catch (error) {
    console.error('💥 Error validating token in middleware:', error);
    // In caso di errore, reindirizza al login per sicurezza
    const loginUrl = new URL('/login', request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.cookies.delete('auth_token');
    return redirectResponse;
  }
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