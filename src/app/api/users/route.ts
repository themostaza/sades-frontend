import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../config/env';

const BASE_URL = config.BASE_URL;

interface User {
  id: string;
  name: string;
  surname: string;
  fiscal_code: string;
  email: string;
  phone_number: string;
  note: string;
  disabled: boolean;
  status: string;
  role: string;
}

interface ApiResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    skip: number;
    totalPages: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const roleId = searchParams.get('role_id') || '';
    const page = searchParams.get('page') || '1';
    const skip = searchParams.get('skip') || '20';

    // Costruisco l'URL con i parametri
    const apiUrl = new URL(`${BASE_URL}api/users`);
    apiUrl.searchParams.append('page', page);
    apiUrl.searchParams.append('skip', skip);
    
    if (query) {
      apiUrl.searchParams.append('query', query);
    }
    
    if (roleId) {
      apiUrl.searchParams.append('role_id', roleId);
    }

    console.log('🔄 Proxying users request to:', apiUrl.toString());

    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'accept': '*/*',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ApiResponse = await response.json();
    console.log('✅ Users fetched successfully:', data.meta);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Proxying user creation to:', `${BASE_URL}api/users`);
    console.log('📤 Request body:', body);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ User created successfully:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 