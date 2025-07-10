import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';

const BASE_URL = config.BASE_URL;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    console.log('🔄 [FORGOT-PASSWORD] Starting request for email:', email);

    if (!email) {
      console.log('❌ [FORGOT-PASSWORD] Missing email in request body');
      return NextResponse.json(
        { error: 'Email è richiesta' },
        { status: 400 }
      );
    }

    // Validazione email base
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ [FORGOT-PASSWORD] Invalid email format:', email);
      return NextResponse.json(
        { error: 'Formato email non valido' },
        { status: 400 }
      );
    }

    console.log('🔄 [FORGOT-PASSWORD] Proxying request to backend:', `${BASE_URL}api/auth/forgot-password`);

    // Chiamata all'API esterna usando BASE_URL
    const response = await fetch(`${BASE_URL}api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    console.log('📡 [FORGOT-PASSWORD] Backend response status:', response.status);
    console.log('📡 [FORGOT-PASSWORD] Backend response ok:', response.ok);

    // Gestione errori del backend
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.log('❌ [FORGOT-PASSWORD] Backend error data:', errorData);
      } catch {
        console.log('❌ [FORGOT-PASSWORD] Failed to parse backend error response');
        errorData = {};
      }
      
      // Gestione errori specifici con messaggi appropriati per il frontend
      if (response.status === 404) {
        console.log('❌ [FORGOT-PASSWORD] Email not found in system');
        return NextResponse.json(
          { error: 'Se l\'email esiste nel sistema, riceverai le istruzioni per il recupero' },
          { status: 404 }
        );
      }
      
      if (response.status === 400) {
        console.log('❌ [FORGOT-PASSWORD] Bad request from backend');
        return NextResponse.json(
          { error: 'Richiesta non valida. Verifica i dati inseriti' },
          { status: 400 }
        );
      }

      if (response.status === 429) {
        console.log('❌ [FORGOT-PASSWORD] Rate limit exceeded');
        return NextResponse.json(
          { error: 'Troppe richieste. Riprova tra qualche minuto' },
          { status: 429 }
        );
      }

      if (response.status >= 500) {
        console.log('❌ [FORGOT-PASSWORD] Server error from backend');
        return NextResponse.json(
          { error: 'Errore del server. Riprova più tardi' },
          { status: 500 }
        );
      }

      // Errore generico per altri status code non gestiti
      console.log('❌ [FORGOT-PASSWORD] Unhandled error status:', response.status);
      return NextResponse.json(
        { error: 'Si è verificato un errore. Riprova più tardi' },
        { status: response.status }
      );
    }

    // Successo: il backend ha restituito 200-299
    let data;
    try {
      data = await response.json();
      console.log('✅ [FORGOT-PASSWORD] Backend success response:', data);
    } catch {
      console.log('⚠️ [FORGOT-PASSWORD] Failed to parse success response, but request was successful');
      data = {};
    }

    // Verifica se il backend restituisce un errore nel JSON anche con status 200
    if (data.error || data.success === false) {
      console.log('❌ [FORGOT-PASSWORD] Backend returned error in JSON body despite 200 status:', data);
      return NextResponse.json(
        { error: 'Si è verificato un errore durante l\'invio dell\'email' },
        { status: 400 }
      );
    }

    console.log('✅ [FORGOT-PASSWORD] Request completed successfully');
    return NextResponse.json({
      success: true,
      message: 'Se l\'email esiste nel sistema, riceverai le istruzioni per il recupero'
    }, { status: 200 });

  } catch (error) {
    console.error('💥 [FORGOT-PASSWORD] Unexpected error:', error);
    
    // Gestione errori di rete o altri errori imprevisti
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('🌐 [FORGOT-PASSWORD] Network error - backend unreachable');
      return NextResponse.json(
        { error: 'Servizio temporaneamente non disponibile' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
} 