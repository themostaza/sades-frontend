import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';
import { 
  AssistanceInterventionDetail, 
  UpdateAssistanceInterventionRequest 
} from '../../../../types/assistance-interventions';

const BASE_URL = config.BASE_URL;

// GET - Retrieve a single assistance intervention
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('🔄 Proxying assistance intervention detail request to:', `${BASE_URL}api/assistance-interventions/${id}`);

    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'accept': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/assistance-interventions/${id}`, {
      method: 'GET',
      headers,
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
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: AssistanceInterventionDetail = await response.json();
    console.log('✅ Assistance intervention detail fetched successfully:', data.id);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Error fetching assistance intervention detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assistance intervention detail' },
      { status: 500 }
    );
  }
}

// PUT - Update an assistance intervention
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateAssistanceInterventionRequest = await request.json();
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Proxying assistance intervention update to:', `${BASE_URL}api/assistance-interventions/${id}`);
    console.log('📤 Request body:', body);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/assistance-interventions/${id}`, {
      method: 'PUT',
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
        { error: 'Failed to update assistance intervention' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Assistance intervention updated successfully:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an assistance intervention
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Proxying assistance intervention deletion to:', `${BASE_URL}api/assistance-interventions/${id}`);

    const headers: Record<string, string> = {
      'accept': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/assistance-interventions/${id}`, {
      method: 'DELETE',
      headers,
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
        { error: 'Failed to delete assistance intervention' },
        { status: response.status }
      );
    }

    // Per DELETE, il backend potrebbe restituire 204 No Content o un messaggio
    let data = null;
    if (response.status !== 204) {
      try {
        data = await response.json();
      } catch {
        // Se non c'è JSON, va bene comunque
        data = { message: 'Assistance intervention deleted successfully' };
      }
    } else {
      data = { message: 'Assistance intervention deleted successfully' };
    }
    
    console.log('✅ Assistance intervention deleted successfully');

    return NextResponse.json(data, { status: 204 });
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 