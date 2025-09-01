import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';
import { CompleteActivityRequest } from '../../../../types/inventory';

const BASE_URL = config.BASE_URL;

/**
 * POST /api/inventory/complete-activity
 * Complete an inventory activity by executing the required inventory movements
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body: CompleteActivityRequest = await request.json();

    // Debug logging
    console.log('🎯 Complete Activity Request received:');
    console.log('📤 Body:', JSON.stringify(body, null, 2));
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing');
    console.log('🌐 Target URL:', `${BASE_URL}api/inventory/complete-activity`);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/inventory/complete-activity`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📥 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText);
      return NextResponse.json(
        { error: 'Failed to complete activity', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend success response:', JSON.stringify(data, null, 2));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in complete activity proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
