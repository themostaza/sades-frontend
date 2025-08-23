import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';

const BASE_URL = config.BASE_URL;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    // Estrai i parametri di query
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const type = searchParams.get('type');
    const article_id = searchParams.get('article_id');
    const from_warehouse_id = searchParams.get('from_warehouse_id');
    const to_warehouse_id = searchParams.get('to_warehouse_id');
    const warehouse_id = searchParams.get('warehouse_id');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const search = searchParams.get('search');

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Costruisci l'URL con i parametri di query
    const backendUrl = new URL(`${BASE_URL}api/inventory/movements`);
    backendUrl.searchParams.append('page', page);
    backendUrl.searchParams.append('limit', limit);
    
    if (type) backendUrl.searchParams.append('type', type);
    if (article_id) backendUrl.searchParams.append('article_id', article_id);
    if (from_warehouse_id) backendUrl.searchParams.append('from_warehouse_id', from_warehouse_id);
    if (to_warehouse_id) backendUrl.searchParams.append('to_warehouse_id', to_warehouse_id);
    if (warehouse_id) backendUrl.searchParams.append('warehouse_id', warehouse_id);
    if (from_date) backendUrl.searchParams.append('from_date', from_date);
    if (to_date) backendUrl.searchParams.append('to_date', to_date);
    if (search) backendUrl.searchParams.append('search', search);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      
      return NextResponse.json(
        { error: 'Failed to fetch inventory movements' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in inventory movements proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
