import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../../config/env';

const BASE_URL = config.BASE_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { familyId } = await params;
    
    console.log('🔄 Proxying device-families subfamilies request to:', `${BASE_URL}api/device-families/${familyId}/subfamilies`);
    console.log('🔑 Auth header:', authHeader);
    console.log('📋 Family ID:', familyId);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/device-families/${familyId}/subfamilies`, {
      method: 'GET',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch device subfamilies' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend success - device subfamilies fetched:', data.length || 0, 'subfamilies');

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 