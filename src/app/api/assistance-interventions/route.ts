import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../config/env';
import {
  AssistanceInterventionsApiResponse,
  CreateAssistanceInterventionRequest,
} from '../../../types/assistance-interventions';

const BASE_URL = config.BASE_URL;

export async function GET(request: NextRequest) {
  console.log('========================================');
  console.log('🚀 [ASSISTANCE INTERVENTIONS API] Starting GET request');
  console.log('========================================');

  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);

    console.log('📝 [ASSISTANCE INTERVENTIONS API] Request URL:', request.url);
    console.log(
      '🔑 [ASSISTANCE INTERVENTIONS API] Auth header present:',
      !!authHeader
    );

    const query = searchParams.get('query') || '';
    const page = searchParams.get('page') || '1';
    const skip = searchParams.get('skip') || '20';
    const companyName = searchParams.get('company_name') || '';
    const assignedToName = searchParams.get('assigned_to_name') || '';
    const date = searchParams.get('date') || '';
    const fromDate = searchParams.get('from_date') || '';
    const toDate = searchParams.get('to_date') || '';
    const zoneId = searchParams.get('zone_id') || '';
    const statusIds = searchParams.getAll('status_id'); // Supporta multipli status_id
    const customerId = searchParams.get('customer_id') || '';
    const assignedToId = searchParams.get('assigned_to_id') || '';
    const manualCheck = searchParams.get('manual_check') || '';
    const typeId = searchParams.get('type_id') || '';
    const sortBy = searchParams.get('sort_by') || '';
    const sortOrder = searchParams.get('sort_order') || '';

    console.log('📋 [ASSISTANCE INTERVENTIONS API] Query params:', {
      query,
      page,
      skip,
      companyName,
      assignedToName,
      date,
      fromDate,
      toDate,
      zoneId,
      statusIds,
      customerId,
      assignedToId,
      manualCheck,
      typeId,
      sortBy,
      sortOrder,
    });

    const headers: Record<string, string> = {
      accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

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

    if (statusIds.length > 0) {
      statusIds.forEach((id) => {
        apiUrl.searchParams.append('status_id', id);
      });
    }

    if (customerId) {
      apiUrl.searchParams.append('customer_id', customerId);
    }

    if (assignedToId) {
      apiUrl.searchParams.append('assigned_to_id', assignedToId);
    }

    if (manualCheck) {
      apiUrl.searchParams.append('manual_check', manualCheck);
    }

    if (typeId) {
      apiUrl.searchParams.append('type_id', typeId);
    }

    if (sortBy) {
      apiUrl.searchParams.append('sort_by', sortBy);
    }

    if (sortOrder) {
      apiUrl.searchParams.append('sort_order', sortOrder);
    }

    console.log(
      '🔄 [ASSISTANCE INTERVENTIONS API] Calling backend:',
      apiUrl.toString()
    );

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers,
    });

    console.log(
      '📡 [ASSISTANCE INTERVENTIONS API] Backend response status:',
      response.status
    );
    console.log(
      '📡 [ASSISTANCE INTERVENTIONS API] Backend response headers:',
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        '❌ [ASSISTANCE INTERVENTIONS API] Backend error response:',
        errorText
      );
      console.error(
        '❌ [ASSISTANCE INTERVENTIONS API] Status:',
        response.status
      );
      console.error(
        '❌ [ASSISTANCE INTERVENTIONS API] Status text:',
        response.statusText
      );

      return NextResponse.json(
        { error: 'Failed to fetch assistance interventions' },
        { status: response.status }
      );
    }

    const data: AssistanceInterventionsApiResponse = await response.json();
    console.log(
      '✅ [ASSISTANCE INTERVENTIONS API] Success - interventions fetched:',
      data.meta
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 [ASSISTANCE INTERVENTIONS API] Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assistance interventions' },
      { status: 500 }
    );
  }
}

// POST - Create new assistance intervention
export async function POST(request: NextRequest) {
  console.log('========================================');
  console.log('🚀 [ASSISTANCE INTERVENTIONS API] Starting POST request');
  console.log('========================================');

  try {
    const authHeader = request.headers.get('authorization');
    const body: CreateAssistanceInterventionRequest = await request.json();

    console.log(
      '📝 [ASSISTANCE INTERVENTIONS API] Request URL:',
      `${BASE_URL}api/assistance-interventions`
    );
    console.log(
      '🔑 [ASSISTANCE INTERVENTIONS API] Auth header present:',
      !!authHeader
    );
    console.log('📤 [ASSISTANCE INTERVENTIONS API] Request body:', body);

    const headers: Record<string, string> = {
      accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const payload = JSON.stringify(body);
    console.log(
      '📦 [ASSISTANCE INTERVENTIONS API] Serialized payload being sent:',
      payload
    );

    const response = await fetch(`${BASE_URL}api/assistance-interventions`, {
      method: 'POST',
      headers,
      body: payload,
    });

    console.log(
      '📡 [ASSISTANCE INTERVENTIONS API] Backend response status:',
      response.status
    );
    console.log(
      '📡 [ASSISTANCE INTERVENTIONS API] Backend response headers:',
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        '❌ [ASSISTANCE INTERVENTIONS API] Backend error response:',
        errorText
      );
      console.error(
        '❌ [ASSISTANCE INTERVENTIONS API] Status:',
        response.status
      );
      console.error(
        '❌ [ASSISTANCE INTERVENTIONS API] Status text:',
        response.statusText
      );

      return NextResponse.json(
        { error: 'Failed to create assistance intervention' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(
      '✅ [ASSISTANCE INTERVENTIONS API] Success - intervention created:',
      data
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 [ASSISTANCE INTERVENTIONS API] Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
