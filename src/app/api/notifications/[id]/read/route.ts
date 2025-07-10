import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../../config/env';

const BASE_URL = config.BASE_URL;

// POST /api/notifications/{id}/read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    const response = await fetch(`${BASE_URL}api/notifications/${id}/read`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: 'Failed to mark notification as read', details: errorText }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 