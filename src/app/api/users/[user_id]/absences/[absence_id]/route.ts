import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../../../config/env';

const BASE_URL = config.BASE_URL;

// PUT - Update absence (approve or reject)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string; absence_id: string }> }
) {
  try {
    const { user_id, absence_id } = await params;
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    console.log(
      '🔄 Proxying absence update to:',
      `${BASE_URL}api/users/${user_id}/absences/${absence_id}`
    );
    console.log('📤 Request body:', body);

    const headers: Record<string, string> = {
      accept: '*/*',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(
      `${BASE_URL}api/users/${user_id}/absences/${absence_id}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      }
    );

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);

      return NextResponse.json(
        { error: 'Failed to update absence' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend success:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete absence
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string; absence_id: string }> }
) {
  try {
    const { user_id, absence_id } = await params;
    const authHeader = request.headers.get('authorization');

    console.log(
      '🔄 Proxying absence delete to:',
      `${BASE_URL}api/users/${user_id}/absences/${absence_id}`
    );

    const headers: Record<string, string> = {
      accept: '*/*',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(
      `${BASE_URL}api/users/${user_id}/absences/${absence_id}`,
      {
        method: 'DELETE',
        headers,
      }
    );

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to delete absence' },
        { status: response.status }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
