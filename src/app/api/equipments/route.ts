import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../config/env';
import { EquipmentsApiResponse, CreateEquipmentRequest } from '../../../types/equipment';
import { validateCreateEquipmentRequest } from '../../../utils/equipment-validation';

const BASE_URL = config.BASE_URL;

export async function GET(request: NextRequest) {
  console.log('========================================');
  console.log('🚀 [EQUIPMENTS API] Starting GET request');
  console.log('========================================');
  
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    console.log('📝 [EQUIPMENTS API] Request URL:', request.url);
    console.log('🔑 [EQUIPMENTS API] Auth header present:', !!authHeader);
    
    // Estrai i parametri di query
    const page = searchParams.get('page') || '1';
    const skip = searchParams.get('skip') || '50';
    const customer_id = searchParams.get('customer_id');
    const customer_location_id = searchParams.get('customer_location_id');
    const query = searchParams.get('query');
    const group_id = searchParams.get('group_id');
    const brand_id = searchParams.get('brand_id');
    const family_id = searchParams.get('family_id');
    const subfamily_id = searchParams.get('subfamily_id');
    
    console.log('📋 [EQUIPMENTS API] Query params:', { 
      page, 
      skip, 
      customer_id, 
      customer_location_id, 
      query, 
      group_id, 
      brand_id, 
      family_id, 
      subfamily_id 
    });

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
    if (group_id) backendUrl.searchParams.append('group_id', group_id);
    if (brand_id) backendUrl.searchParams.append('brand_id', brand_id);
    if (family_id) backendUrl.searchParams.append('family_id', family_id);
    if (subfamily_id) backendUrl.searchParams.append('subfamily_id', subfamily_id);

    console.log('🔄 [EQUIPMENTS API] Calling backend:', backendUrl.toString());

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers,
    });

    console.log('📡 [EQUIPMENTS API] Backend response status:', response.status);
    console.log('📡 [EQUIPMENTS API] Backend response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [EQUIPMENTS API] Backend error response:', errorText);
      console.error('❌ [EQUIPMENTS API] Status:', response.status);
      console.error('❌ [EQUIPMENTS API] Status text:', response.statusText);
      
      return NextResponse.json(
        { error: 'Failed to fetch equipments', details: errorText },
        { status: response.status }
      );
    }

    const data: EquipmentsApiResponse = await response.json();
    console.log('✅ [EQUIPMENTS API] Backend success!');
    console.log('✅ [EQUIPMENTS API] Equipments count:', data.data?.length || 0);
    console.log('✅ [EQUIPMENTS API] Total items:', data.meta?.total || 0);
    console.log('✅ [EQUIPMENTS API] Sample first equipment:', data.data?.[0] ? {
      id: data.data[0].id,
      description: data.data[0].description,
      pnc_code: data.data[0].pnc_code
    } : 'No equipments');
    console.log('========================================');

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 [EQUIPMENTS API] Proxy error:', error);
    console.error('💥 [EQUIPMENTS API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('💥 [EQUIPMENTS API] Error message:', error instanceof Error ? error.message : String(error));
    console.log('========================================');
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
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