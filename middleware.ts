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

    console.log('✅ Token validated successfully in middleware');
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