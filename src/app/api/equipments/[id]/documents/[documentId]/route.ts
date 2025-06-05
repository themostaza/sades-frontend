import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../../../config/env';
import { DeleteDocumentResponse } from '../../../../../../types/equipment-documents';

const BASE_URL = config.BASE_URL;

// DELETE - Delete document from equipment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id: equipmentId, documentId } = await params;
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Proxying delete document request to:', `${BASE_URL}api/equipment/${equipmentId}/documents/${documentId}`);

    const headers: Record<string, string> = {
      'accept': '*/*',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/equipment/${equipmentId}/documents/${documentId}`, {
      method: 'DELETE',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Equipment or document not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: response.status }
      );
    }

    console.log('✅ Document deleted successfully');

    const responseData: DeleteDocumentResponse = {
      success: true,
      message: 'Document deleted successfully'
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 