import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../config/env';

const BASE_URL = config.BASE_URL;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    console.log(
      '🔄 Proxying equipment import to:',
      `${BASE_URL}api/import/equipment`
    );
    console.log('🔑 Auth header:', authHeader);

    // Get the FormData from the request
    const formData = await request.formData();

    console.log('📤 FormData entries:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }

    const headers: Record<string, string> = {};

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Forward the FormData to the backend
    const response = await fetch(`${BASE_URL}api/import/equipment`, {
      method: 'POST',
      headers,
      body: formData,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);

      return NextResponse.json(
        { error: 'Failed to import equipment', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Equipment import response:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
