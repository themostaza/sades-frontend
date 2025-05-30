import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../../config/env';

const BASE_URL = config.BASE_URL;

// POST - Link equipment to a grouping
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipmentId } = await params;
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Proxying equipment grouping request to:', `${BASE_URL}api/equipments/${equipmentId}/grouping`);
    console.log('📤 Request body:', body);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/equipments/${equipmentId}/grouping`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to link equipment to grouping' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Equipment linked to grouping successfully:', data);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove equipment from grouping
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipmentId } = await params;
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Proxying equipment grouping removal to:', `${BASE_URL}api/equipments/${equipmentId}/grouping`);

    const headers: Record<string, string> = {
      'accept': '*/*',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/equipments/${equipmentId}/grouping`, {
      method: 'DELETE',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Equipment not found or not in grouping' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to remove equipment from grouping' },
        { status: response.status }
      );
    }

    console.log('✅ Equipment removed from grouping successfully');

    return NextResponse.json(
      { success: true, message: 'Equipment removed from grouping successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 