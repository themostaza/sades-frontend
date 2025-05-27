import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';
import { EquipmentDetail, UpdateEquipmentRequest } from '../../../../types/equipment';
import { validateUpdateEquipmentRequest } from '../../../../utils/equipment-validation';

const BASE_URL = config.BASE_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { id: equipmentId } = await params;
    
    console.log('🔄 Proxying equipment details request to:', `${BASE_URL}api/equipments/${equipmentId}`);
    console.log('🔑 Auth header:', authHeader);
    console.log('🆔 Equipment ID:', equipmentId);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/equipments/${equipmentId}`, {
      method: 'GET',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch equipment details' },
        { status: response.status }
      );
    }

    const data: EquipmentDetail = await response.json();
    console.log('✅ Backend success - equipment details fetched for ID:', equipmentId);

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const body: UpdateEquipmentRequest = await request.json();
    const { id: equipmentId } = await params;
    
    console.log('🔄 Proxying equipment update to:', `${BASE_URL}api/equipments/${equipmentId}`);
    console.log('🔑 Auth header:', authHeader);
    console.log('📤 Request body:', body);
    console.log('🆔 Equipment ID:', equipmentId);

    // Ensure the ID in the body matches the URL parameter
    const equipmentIdNum = parseInt(equipmentId, 10);
    if (isNaN(equipmentIdNum)) {
      return NextResponse.json(
        { error: 'Invalid equipment ID' },
        { status: 400 }
      );
    }

    // Set the ID in the body to match the URL parameter
    body.id = equipmentIdNum;

    // Validate request body
    const validationErrors = validateUpdateEquipmentRequest(body);
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

    const response = await fetch(`${BASE_URL}api/equipments/${equipmentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to update equipment' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend success - equipment updated for ID:', equipmentId);

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { id: equipmentId } = await params;
    
    console.log('🔄 Proxying equipment deletion to:', `${BASE_URL}api/equipments/${equipmentId}`);
    console.log('🔑 Auth header:', authHeader);
    console.log('🆔 Equipment ID:', equipmentId);

    // Validate equipment ID
    const equipmentIdNum = parseInt(equipmentId, 10);
    if (isNaN(equipmentIdNum)) {
      return NextResponse.json(
        { error: 'Invalid equipment ID' },
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

    const response = await fetch(`${BASE_URL}api/equipments/${equipmentId}`, {
      method: 'DELETE',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to delete equipment' },
        { status: response.status }
      );
    }

    // Per DELETE, il backend potrebbe restituire 204 No Content o un messaggio di conferma
    let data = {};
    if (response.status !== 204) {
      data = await response.json();
    }
    
    console.log('✅ Backend success - equipment deleted for ID:', equipmentId);

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 