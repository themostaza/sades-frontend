import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';

const BASE_URL = config.BASE_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔄 Proxying login request to:', `${BASE_URL}api/auth/login`);
    console.log('📤 Request body:', body);

    const response = await fetch(`${BASE_URL}api/auth/login`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Login failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend success:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 