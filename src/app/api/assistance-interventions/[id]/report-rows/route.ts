import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../../config/env';

const BASE_URL = config.BASE_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Fetching report rows for intervention:', id);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/assistance-interventions/${id}/report-rows`, {
      method: 'GET',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch report rows' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Report rows fetched:', data?.length || 0, 'rows');

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Error fetching report rows:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

