import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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
      // Rimuovi il cookie non valido
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('auth_token');
      return response;
    }

    // Ottieni le informazioni dell'utente dalla risposta
    const userData = await response.json();
    console.log('✅ Token validated successfully in middleware, user:', userData);

    // Se l'utente è un tecnico e sta cercando di accedere alla dashboard, reindirizzalo agli interventi
    if (userData.role === 'tecnico' && pathname === '/dashboard') {
      console.log('🔄 Redirecting technician from dashboard to interventi');
      const interventiUrl = new URL('/interventi', request.url);
      return NextResponse.redirect(interventiUrl);
    }

    // Controlla se l'utente sta cercando di accedere a pagine per cui non ha autorizzazione
    const technicianAllowedPages = ['/interventi', '/inventario', '/notifiche'];
    if (userData.role === 'tecnico' && !technicianAllowedPages.some(page => pathname.startsWith(page))) {
      console.log('🚫 Technician trying to access unauthorized page:', pathname);
      const interventiUrl = new URL('/interventi', request.url);
      return NextResponse.redirect(interventiUrl);
    }
    
    // Se il token è valido, permetti l'accesso
    return NextResponse.next();
    
  } catch (error) {
    console.error('💥 Error validating token in middleware:', error);
    // In caso di errore, reindirizza al login per sicurezza
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
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