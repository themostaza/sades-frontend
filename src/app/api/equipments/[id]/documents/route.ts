import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../../config/env';
import { AddDocumentRequest, EquipmentDocument } from '../../../../../types/equipment-documents';

const BASE_URL = config.BASE_URL;

// POST - Add document to equipment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipmentId } = await params;
    const body: AddDocumentRequest = await request.json();
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Proxying add document request to:', `${BASE_URL}api/equipment/${equipmentId}/documents`);
    console.log('📤 Request body:', body);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/equipment/${equipmentId}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to add document to equipment' },
        { status: response.status }
      );
    }

    const data: EquipmentDocument = await response.json();
    console.log('✅ Document added successfully:', data);

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 