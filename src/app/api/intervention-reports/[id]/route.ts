import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';
import { InterventionReportDetail } from '../../../../types/intervention-reports';

const BASE_URL = config.BASE_URL;

// Interface for PUT request body
interface UpdateInterventionReportRequest {
  work_hours: number;
  travel_hours: number;
  customer_notes: string;
  is_failed: boolean;
  failure_reason: string;
  status: string;
  signature_url: string;
  items: Array<{
    id: number;
    intervention_equipment_id: number;
    note: string;
    fl_gas: boolean;
    gas_compressor_types_id: number;
    is_new_installation: boolean;
    rechargeable_gas_types_id: number;
    qty_gas_recharged: number;
    max_charge: number;
    compressor_model: string;
    compressor_model_img_url: string;
    compressor_serial_num: string;
    compressor_serial_num_img_url: string;
    compressor_unique_num: string;
    compressor_unique_num_img_url: string;
    additional_services: string;
    recovered_rech_gas_types_id: number;
    qty_gas_recovered: number;
    images: Array<{
      id: number;
      file_name: string;
      file_url: string;
    }>;
    articles: Array<{
      id: number;
      article_id: string;
      quantity: number;
    }>;
  }>;
}

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

// PUT - Update an intervention report
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const body: UpdateInterventionReportRequest = await request.json();
    
    console.log('🔄 Proxying intervention report update to:', `${BASE_URL}api/intervention-reports/${id}`);
    console.log('📝 Update data:', JSON.stringify(body, null, 2));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'accept': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/intervention-reports/${id}`, {
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
      
      if (response.status === 400) {
        return NextResponse.json(
          { error: 'Invalid request data' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to update intervention report' },
        { status: response.status }
      );
    }

    const data: InterventionReportDetail = await response.json();
    console.log('✅ Intervention report updated successfully:', data.id);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Error updating intervention report:', error);
    return NextResponse.json(
      { error: 'Failed to update intervention report' },
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