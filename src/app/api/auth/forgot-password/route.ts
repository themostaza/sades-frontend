import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';

const BASE_URL = config.BASE_URL;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email è richiesta' },
        { status: 400 }
      );
    }

    // Validazione email base
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato email non valido' },
        { status: 400 }
      );
    }

    console.log('🔄 Proxying forgot password request to:', `${BASE_URL}api/auth/forgot-password`);
    console.log('📤 Request email:', email);

    // Chiamata all'API esterna usando BASE_URL
    const response = await fetch(`${BASE_URL}api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Backend error:', errorData);
      
      // Gestione errori specifici
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Email non trovata nel sistema' },
          { status: 404 }
        );
      }
      
      if (response.status === 400) {
        return NextResponse.json(
          { error: errorData.message || 'Richiesta non valida' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Errore del server. Riprova più tardi.' },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('✅ Backend success:', data);

    return NextResponse.json({
      success: true,
      message: 'Email di recupero password inviata con successo',
      data
    });

  } catch (error) {
    console.error('💥 Forgot password API error:', error);
    
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
} 