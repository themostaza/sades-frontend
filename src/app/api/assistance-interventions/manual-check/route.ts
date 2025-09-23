import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';

const BASE_URL = config.BASE_URL;

// PATCH - Bulk update/toggle manual_check
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = await request.text();

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/assistance-interventions/manual-check`, {
      method: 'PATCH',
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error (manual-check PATCH):', errorText);
      return NextResponse.json(
        { error: 'Failed to update manual_check' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error (manual-check PATCH):', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


