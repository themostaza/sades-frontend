import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';
import { 
  CreateInventoryActivityRequest, 
  CreateInventoryActivitiesResponse,
  InventoryActivitiesResponse,
} from '../../../../types/inventory';

const BASE_URL = config.BASE_URL;

/**
 * GET /api/inventory/activities
 * Get all inventory activities with optional filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const created_from = searchParams.get('created_from');
    const created_to = searchParams.get('created_to');
    const report_id = searchParams.get('report_id');
    const assistance_intervention_id = searchParams.get('assistance_intervention_id');
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Build backend URL with query parameters
    const backendUrl = new URL(`${BASE_URL}api/inventory/activities`);
    backendUrl.searchParams.append('page', page);
    backendUrl.searchParams.append('limit', limit);
    
    if (type) backendUrl.searchParams.append('type', type);
    if (status) backendUrl.searchParams.append('status', status);
    if (created_from) backendUrl.searchParams.append('created_from', created_from);
    if (created_to) backendUrl.searchParams.append('created_to', created_to);
    if (report_id) backendUrl.searchParams.append('report_id', report_id);
    if (assistance_intervention_id) backendUrl.searchParams.append('assistance_intervention_id', assistance_intervention_id);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch inventory activities', details: errorText },
        { status: response.status }
      );
    }

    const data: InventoryActivitiesResponse = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in inventory activities proxy (GET):', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/activities
 * Create one or multiple inventory activities (bulk)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body: CreateInventoryActivityRequest = await request.json();

    // Debug logging
    console.log('🆕 Create Inventory Activities Request received:');
    console.log('📤 Body:', JSON.stringify(body, null, 2));
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing');
    console.log('🌐 Target URL:', `${BASE_URL}api/inventory/activities`);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/inventory/activities`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📥 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText);
      return NextResponse.json(
        { error: 'Failed to create inventory activities', details: errorText },
        { status: response.status }
      );
    }

    const data: CreateInventoryActivitiesResponse = await response.json();
    console.log('✅ Backend success response:', JSON.stringify(data, null, 2));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in inventory activities proxy (POST):', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
