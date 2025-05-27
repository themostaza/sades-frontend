import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../config/env';
import { EquipmentsApiResponse, CreateEquipmentRequest } from '../../../types/equipment';
import { validateCreateEquipmentRequest } from '../../../utils/equipment-validation';

const BASE_URL = config.BASE_URL;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    // Estrai i parametri di query
    const page = searchParams.get('page') || '1';
    const skip = searchParams.get('skip') || '20';
    const customer_id = searchParams.get('customer_id');
    const customer_location_id = searchParams.get('customer_location_id');
    const query = searchParams.get('query');
    
    console.log('🔄 Proxying equipments request to:', `${BASE_URL}api/equipments`);
    console.log('🔑 Auth header:', authHeader);
    console.log('📋 Query params:', { page, skip, customer_id, customer_location_id, query });

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Costruisci l'URL con i parametri di query
    const backendUrl = new URL(`${BASE_URL}api/equipments`);
    backendUrl.searchParams.append('page', page);
    backendUrl.searchParams.append('skip', skip);
    
    if (customer_id) backendUrl.searchParams.append('customer_id', customer_id);
    if (customer_location_id) backendUrl.searchParams.append('customer_location_id', customer_location_id);
    if (query) backendUrl.searchParams.append('query', query);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch equipments' },
        { status: response.status }
      );
    }

    const data: EquipmentsApiResponse = await response.json();
    console.log('✅ Backend success - equipments fetched:', data.data?.length || 0, 'equipments');

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new equipment
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body: CreateEquipmentRequest = await request.json();
    
    console.log('🔄 Proxying equipment creation to:', `${BASE_URL}api/equipments`);
    console.log('🔑 Auth header:', authHeader);
    console.log('📤 Request body:', body);

    // Validate request body
    const validationErrors = validateCreateEquipmentRequest(body);
    if (validationErrors.length > 0) {
      console.error('❌ Validation errors:', validationErrors);
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationErrors 
        },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/equipments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to create equipment' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Equipment created successfully:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 