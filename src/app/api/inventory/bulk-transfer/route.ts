import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';
import { BulkTransferRequest } from '../../../../types/inventory';

const BASE_URL = config.BASE_URL;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body: BulkTransferRequest = await request.json();

    // Debug logging
    console.log('🔄 Bulk Transfer Request received:');
    console.log('📤 Body:', JSON.stringify(body, null, 2));
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing');
    console.log('🌐 Target URL:', `${BASE_URL}api/inventory/bulk-transfer`);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/inventory/bulk-transfer`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📥 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText);
      return NextResponse.json(
        { error: 'Failed to perform bulk transfer', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend success response:', JSON.stringify(data, null, 2));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in bulk transfer proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
