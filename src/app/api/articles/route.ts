import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../config/env';
import { CreateArticleRequest } from '../../../types/article';

const BASE_URL = config.BASE_URL;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    // Estrai i parametri di query
    const page = searchParams.get('page') || '1';
    const skip = searchParams.get('skip') || '20';
    const query = searchParams.get('query');
    const stock = searchParams.get('stock');
    const place_type_id = searchParams.get('place_type_id');
    const place_id = searchParams.get('place_id');
    const brand_id = searchParams.get('brand_id');
    const from_order_date = searchParams.get('from_order_date');
    const to_order_date = searchParams.get('to_order_date');
    const warehouse_id = searchParams.get('warehouse_id');
    const warehouse_ids = searchParams.get('warehouse_ids'); // Per supportare multipli IDs separati da virgola

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Costruisci l'URL con i parametri di query
    const backendUrl = new URL(`${BASE_URL}api/articles`);
    backendUrl.searchParams.append('page', page);
    backendUrl.searchParams.append('skip', skip);
    
    if (query) backendUrl.searchParams.append('query', query);
    if (stock) backendUrl.searchParams.append('stock', stock);
    if (place_type_id) backendUrl.searchParams.append('place_type_id', place_type_id);
    if (place_id) backendUrl.searchParams.append('place_id', place_id);
    if (brand_id) backendUrl.searchParams.append('brand_id', brand_id);
    if (from_order_date) backendUrl.searchParams.append('from_order_date', from_order_date);
    if (to_order_date) backendUrl.searchParams.append('to_order_date', to_order_date);
    if (warehouse_id) backendUrl.searchParams.append('warehouse_id', warehouse_id);
    if (warehouse_ids) backendUrl.searchParams.append('warehouse_ids', warehouse_ids);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in articles proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body: CreateArticleRequest = await request.json();

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/articles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      
      return NextResponse.json(
        { error: 'Failed to create article' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in articles proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 