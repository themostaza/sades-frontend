import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';
import { InterventionReportDetail } from '../../../../types/intervention-reports';

const BASE_URL = config.BASE_URL;

// GET - Get intervention report by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Proxying intervention report detail retrieval to:', `${BASE_URL}api/intervention-reports/${id}`);

    const headers: Record<string, string> = {
      'accept': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/intervention-reports/${id}`, {
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

    const data: InterventionReportDetail = await response.json();
    console.log('✅ Intervention report detail retrieved successfully:', data.id);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Error fetching intervention report detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch intervention report detail' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an intervention report
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Proxying intervention report deletion to:', `${BASE_URL}api/intervention-reports/${id}`);

    const headers: Record<string, string> = {
      'accept': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/intervention-reports/${id}`, {
      method: 'DELETE',
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
      
      return NextResponse.json(
        { error: 'Failed to delete intervention report' },
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
        data = { message: 'Intervention report deleted successfully' };
      }
    } else {
      data = { message: 'Intervention report deleted successfully' };
    }
    
    console.log('✅ Intervention report deleted successfully');
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Error deleting intervention report:', error);
    return NextResponse.json(
      { error: 'Failed to delete intervention report' },
      { status: 500 }
    );
  }
} 