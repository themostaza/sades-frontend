import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../../config/env';

const BASE_URL = config.BASE_URL;

// POST - Create new absence
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const { user_id } = await params;
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Proxying absence creation to:', `${BASE_URL}api/users/${user_id}/absences`);
    console.log('📤 Request body:', body);

    const headers: Record<string, string> = {
      'accept': '*/*',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/users/${user_id}/absences`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to create absence' },
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