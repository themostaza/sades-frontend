import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../config/env';
import { 
  AssistanceInterventionsApiResponse, 
  CreateAssistanceInterventionRequest 
} from '../../../types/assistance-interventions';

const BASE_URL = config.BASE_URL;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const page = searchParams.get('page') || '1';
    const skip = searchParams.get('skip') || '20';
    const companyName = searchParams.get('company_name') || '';
    const assignedToName = searchParams.get('assigned_to_name') || '';
    const date = searchParams.get('date') || '';
    const fromDate = searchParams.get('from_date') || '';
    const toDate = searchParams.get('to_date') || '';
    const zoneId = searchParams.get('zone_id') || '';
    const statusId = searchParams.get('status_id') || '';
    const customerId = searchParams.get('customer_id') || '';

    // Costruisco l'URL con i parametri
    const apiUrl = new URL(`${BASE_URL}api/assistance-interventions`);
    apiUrl.searchParams.append('page', page);
    apiUrl.searchParams.append('skip', skip);
    
    if (query) {
      apiUrl.searchParams.append('query', query);
    }
    
    if (companyName) {
      apiUrl.searchParams.append('company_name', companyName);
    }
    
    if (assignedToName) {
      apiUrl.searchParams.append('assigned_to_name', assignedToName);
    }
    
    if (date) {
      apiUrl.searchParams.append('date', date);
    }
    
    if (fromDate) {
      apiUrl.searchParams.append('from_date', fromDate);
    }
    
    if (toDate) {
      apiUrl.searchParams.append('to_date', toDate);
    }
    
    if (zoneId) {
      apiUrl.searchParams.append('zone_id', zoneId);
    }
    
    if (statusId) {
      apiUrl.searchParams.append('status_id', statusId);
    }
    
    if (customerId) {
      apiUrl.searchParams.append('customer_id', customerId);
    }

    console.log('🔄 Proxying assistance interventions request to:', apiUrl.toString());

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

    const data: AssistanceInterventionsApiResponse = await response.json();
    console.log('✅ Assistance interventions fetched successfully:', data.meta);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Error fetching assistance interventions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assistance interventions' },
      { status: 500 }
    );
  }
}

// POST - Create new assistance intervention
export async function POST(request: NextRequest) {
  try {
    const body: CreateAssistanceInterventionRequest = await request.json();
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Proxying assistance intervention creation to:', `${BASE_URL}api/assistance-interventions`);
    console.log('📤 Request body:', body);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/assistance-interventions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to create assistance intervention' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Assistance intervention created successfully:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 