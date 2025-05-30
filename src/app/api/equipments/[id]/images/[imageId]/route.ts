import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../../../config/env';
import { DeleteImageResponse } from '../../../../../../types/equipment-images';

const BASE_URL = config.BASE_URL;

// DELETE - Delete image from equipment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id: equipmentId, imageId } = await params;
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Proxying delete image request to:', `${BASE_URL}api/equipment/${equipmentId}/images/${imageId}`);

    const headers: Record<string, string> = {
      'accept': '*/*',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/equipment/${equipmentId}/images/${imageId}`, {
      method: 'DELETE',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Equipment or image not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to delete image' },
        { status: response.status }
      );
    }

    console.log('✅ Image deleted successfully');

    const responseData: DeleteImageResponse = {
      success: true,
      message: 'Image deleted successfully'
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