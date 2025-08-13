import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../config/env';

const BASE_URL = config.BASE_URL;

// GET /api/calendar-notes
// Proxy to backend with optional query params: user_id, start_date, end_date, page, limit
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id') || '';
    const start_date = searchParams.get('start_date') || '';
    const end_date = searchParams.get('end_date') || '';
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';

    const backendUrl = new URL(`${BASE_URL}api/calendar-notes`);
    backendUrl.searchParams.append('page', page);
    backendUrl.searchParams.append('limit', limit);
    if (user_id) backendUrl.searchParams.append('user_id', user_id);
    if (start_date) backendUrl.searchParams.append('start_date', start_date);
    if (end_date) backendUrl.searchParams.append('end_date', end_date);

    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error (GET calendar-notes):', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch calendar notes' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error (GET calendar-notes):', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/calendar-notes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(`${BASE_URL}api/calendar-notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error (POST calendar-notes):', errorText);
      return NextResponse.json(
        { error: 'Failed to create calendar note' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error (POST calendar-notes):', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


