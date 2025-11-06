import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../../../config/env';

const BASE_URL = config.BASE_URL;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rowId: string }> }
) {
  try {
    const { id, rowId } = await params;
    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    
    console.log('🔄 Updating report row:', { interventionId: id, rowId, body });

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(
      `${BASE_URL}api/assistance-interventions/${id}/report-rows/${rowId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      }
    );

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to update report row' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Report row updated successfully');

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Error updating report row:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

