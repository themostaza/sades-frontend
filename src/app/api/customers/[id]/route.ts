import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';

const BASE_URL = config.BASE_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { id: customerId } = await params;
    
    console.log('🔄 Proxying customer details request to:', `${BASE_URL}api/customers/${customerId}`);
    console.log('🔑 Auth header:', authHeader);
    console.log('🆔 Customer ID:', customerId);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/customers/${customerId}`, {
      method: 'GET',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch customer details' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend success - customer details fetched');

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    const { id: customerId } = await params;
    
    console.log('🔄 Proxying customer blacklist update to:', `${BASE_URL}api/customers/${customerId}`);
    console.log('🔑 Auth header:', authHeader);
    console.log('📤 Request body:', body);
    console.log('🆔 Customer ID:', customerId);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/customers/${customerId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to update customer blacklist status' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend success - customer blacklist status updated');

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 