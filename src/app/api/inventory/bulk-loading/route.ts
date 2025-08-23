import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';
import { BulkLoadingRequest } from '../../../../types/inventory';

const BASE_URL = config.BASE_URL;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body: BulkLoadingRequest = await request.json();

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/inventory/bulk-loading`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      
      return NextResponse.json(
        { error: 'Failed to perform bulk loading' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in bulk loading proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
