import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../config/env';

const BASE_URL = config.BASE_URL;

interface Absence {
  id: number;
  user_uid: string;
  from_date: string;
  to_date: string;
  status: string;
  note: string;
  created_at: string;
  updated_at: string;
  name: string;
  surname: string;
}

interface AbsencesApiResponse {
  data: Absence[];
  meta: {
    total: string;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const fromDate = searchParams.get('from_date') || '';
    const toDate = searchParams.get('to_date') || '';
    const status = searchParams.get('status') || '';
    const userId = searchParams.get('user_id') || '';

    // Costruisco l'URL con i parametri
    const apiUrl = new URL(`${BASE_URL}api/absences`);
    apiUrl.searchParams.append('page', page);
    apiUrl.searchParams.append('limit', limit);
    
    if (fromDate) {
      apiUrl.searchParams.append('from_date', fromDate);
    }
    
    if (toDate) {
      apiUrl.searchParams.append('to_date', toDate);
    }
    
    if (status) {
      apiUrl.searchParams.append('status', status);
    }
    
    if (userId) {
      apiUrl.searchParams.append('user_id', userId);
    }

    console.log('🔄 Proxying absences request to:', apiUrl.toString());

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

    const data: AbsencesApiResponse = await response.json();
    console.log('✅ Absences fetched successfully:', data.meta);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Error fetching absences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch absences' },
      { status: 500 }
    );
  }
} 