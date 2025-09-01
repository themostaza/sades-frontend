import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../../config/env';
import { 
  InventoryActivity,
  UpdateInventoryActivityRequest,
  UpdateInventoryActivityResponse 
} from '../../../../../types/inventory';

const BASE_URL = config.BASE_URL;

/**
 * GET /api/inventory/activities/[id]
 * Get a single inventory activity by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { id } = await params;

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/inventory/activities/${id}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch inventory activity', details: errorText },
        { status: response.status }
      );
    }

    const data: InventoryActivity = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in inventory activity proxy (GET):', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/inventory/activities/[id]
 * Update an inventory activity
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { id } = await params;
    const body: UpdateInventoryActivityRequest = await request.json();

    // Debug logging
    console.log(`🔄 Update Inventory Activity Request received for ID: ${id}`);
    console.log('📤 Body:', JSON.stringify(body, null, 2));
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing');
    console.log('🌐 Target URL:', `${BASE_URL}api/inventory/activities/${id}`);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/inventory/activities/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📥 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText);
      return NextResponse.json(
        { error: 'Failed to update inventory activity', details: errorText },
        { status: response.status }
      );
    }

    const data: UpdateInventoryActivityResponse = await response.json();
    console.log('✅ Backend success response:', JSON.stringify(data, null, 2));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in inventory activity proxy (PUT):', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/activities/[id]
 * Delete an inventory activity
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { id } = await params;

    // Debug logging
    console.log(`🗑️ Delete Inventory Activity Request received for ID: ${id}`);
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing');
    console.log('🌐 Target URL:', `${BASE_URL}api/inventory/activities/${id}`);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/inventory/activities/${id}`, {
      method: 'DELETE',
      headers,
    });

    console.log('📥 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText);
      return NextResponse.json(
        { error: 'Failed to delete inventory activity', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend success response:', JSON.stringify(data, null, 2));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in inventory activity proxy (DELETE):', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
