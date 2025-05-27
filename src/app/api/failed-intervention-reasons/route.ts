import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../config/env';
import { FailedInterventionReason } from '../../../types/assistance-interventions';

const BASE_URL = config.BASE_URL;

// GET - Retrieve all failed intervention reasons
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Proxying failed intervention reasons request to:', `${BASE_URL}api/failed-intervention-reasons`);

    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'accept': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/failed-intervention-reasons`, {
      method: 'GET',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: FailedInterventionReason[] = await response.json();
    console.log('✅ Failed intervention reasons fetched successfully:', data.length, 'reasons');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Error fetching failed intervention reasons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch failed intervention reasons' },
      { status: 500 }
    );
  }
} 