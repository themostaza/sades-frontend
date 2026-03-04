import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';

const BASE_URL = config.BASE_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log(
      '🔄 Proxying change-password request to:',
      `${BASE_URL}api/auth/change-password`
    );
    console.log('📤 Request body:', body);

    const response = await fetch(`${BASE_URL}api/auth/change-password`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      let errorMessage = 'Change password failed';
      try {
        const errorData = await response.json();
        console.error('❌ Backend error:', errorData);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        const errorText = await response.text();
        console.error('❌ Backend error (text):', errorText);
      }

      return NextResponse.json(
        { error: errorMessage },
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
