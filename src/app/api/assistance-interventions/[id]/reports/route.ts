import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../../config/env';
import { 
  CreateInterventionReportRequest,
  InterventionReportSummary 
} from '../../../../../types/intervention-reports';

const BASE_URL = config.BASE_URL;

// POST - Create a new intervention report
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: CreateInterventionReportRequest = await request.json();
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Proxying intervention report creation to:', `${BASE_URL}api/assistance-interventions/${id}/reports`);
    console.log('📤 Request body:', body);
    console.log('📋 Items array:', JSON.stringify(body.items, null, 2));

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/assistance-interventions/${id}/reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Assistance intervention not found' },
          { status: 404 }
        );
      }
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create intervention report' },
        { status: response.status }
      );
    }

    const data: InterventionReportSummary = await response.json();
    console.log('✅ Intervention report created successfully:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get intervention report by assistance intervention ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Proxying intervention report retrieval to:', `${BASE_URL}api/assistance-interventions/${id}/reports`);

    const headers: Record<string, string> = {
      'accept': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/assistance-interventions/${id}/reports`, {
      method: 'GET',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Intervention report not found' },
          { status: 404 }
        );
      }
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: InterventionReportSummary = await response.json();
    console.log('✅ Intervention report retrieved successfully:', data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Error fetching intervention report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch intervention report' },
      { status: 500 }
    );
  }
} 