import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../config/env';

const BASE_URL = config.BASE_URL;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Proxying device-groups request to:', `${BASE_URL}api/device-groups`);
    console.log('🔑 Auth header:', authHeader);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/device-groups`, {
      method: 'GET',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch device groups' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend success - device groups fetched:', data.length || 0, 'groups');

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 