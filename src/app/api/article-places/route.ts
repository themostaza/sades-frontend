import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../config/env';

const BASE_URL = config.BASE_URL;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    // Estrai i parametri di query
    const place_type_id = searchParams.get('place_type_id');
    
    console.log('🔄 Proxying article-places request to:', `${BASE_URL}api/article-places`);
    console.log('🔑 Auth header:', authHeader);
    console.log('📋 Query params:', { place_type_id });

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Costruisci l'URL con i parametri di query
    const backendUrl = new URL(`${BASE_URL}api/article-places`);
    
    if (place_type_id) {
      backendUrl.searchParams.append('place_type_id', place_type_id);
    }

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch article places' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend success - article places fetched:', data.length || 0, 'article places');

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 