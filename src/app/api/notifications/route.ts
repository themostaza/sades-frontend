import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../config/env';

const BASE_URL = config.BASE_URL;

// GET /api/notifications
export async function GET(request: NextRequest) {
  try {
    console.log('[API][notifications][GET] INIZIO');
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const unreadOnly = searchParams.get('unread_only') || 'false';
    console.log('[API][notifications][GET] Params:', { page, limit, unreadOnly });

    const apiUrl = new URL(`${BASE_URL}api/notifications`);
    apiUrl.searchParams.append('page', page);
    apiUrl.searchParams.append('limit', limit);
    apiUrl.searchParams.append('unread_only', unreadOnly);
    console.log('[API][notifications][GET] Backend URL:', apiUrl.toString());

    const authHeader = request.headers.get('authorization');
    console.log('[API][notifications][GET] Authorization header:', authHeader);
    const headers: Record<string, string> = {
      'accept': 'application/json',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers,
    });
    console.log('[API][notifications][GET] Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API][notifications][GET] Backend error:', errorText);
      return NextResponse.json({ error: 'Failed to fetch notifications', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log('[API][notifications][GET] Success, data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API][notifications][GET] Internal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notifications
export async function POST(request: NextRequest) {
  try {
    console.log('[API][notifications][POST] INIZIO');
    const body = await request.json();
    console.log('[API][notifications][POST] Body:', body);
    const authHeader = request.headers.get('authorization');
    console.log('[API][notifications][POST] Authorization header:', authHeader);
    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    const response = await fetch(`${BASE_URL}api/notifications`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    console.log('[API][notifications][POST] Backend response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API][notifications][POST] Backend error:', errorText);
      return NextResponse.json({ error: 'Failed to send notification', details: errorText }, { status: response.status });
    }
    const data = await response.json();
    console.log('[API][notifications][POST] Success, data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API][notifications][POST] Internal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 