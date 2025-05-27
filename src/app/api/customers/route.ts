import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../config/env';

const BASE_URL = config.BASE_URL;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    // Estrai i parametri di query
    const query = searchParams.get('query');
    const page = searchParams.get('page');
    const skip = searchParams.get('skip');
    const blacklist = searchParams.get('blacklist');
    
    console.log('🔄 Proxying customers request to:', `${BASE_URL}api/customers`);
    console.log('🔑 Auth header:', authHeader);
    console.log('📋 Query params:', { query, page, skip, blacklist });

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Costruisci l'URL con i parametri di query
    const backendUrl = new URL(`${BASE_URL}api/customers`);
    
    if (query) backendUrl.searchParams.append('query', query);
    if (page) backendUrl.searchParams.append('page', page);
    if (skip) backendUrl.searchParams.append('skip', skip);
    if (blacklist) backendUrl.searchParams.append('blacklist', blacklist);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend success - customers fetched:', data.data?.length || 0, 'customers');

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 