import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../../config/env';

const BASE_URL = config.BASE_URL;

// GET - Generate a PDF for an assistance intervention
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('🔄 Proxying PDF generation request to:', `${BASE_URL}api/assistance-interventions/${id}/pdf`);

    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'accept': 'application/pdf',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/assistance-interventions/${id}/pdf`, {
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

    // Ottieni il PDF come buffer
    const pdfBuffer = await response.arrayBuffer();
    console.log('✅ PDF generated successfully for intervention:', id);
    
    // Restituisci il PDF con gli header appropriati
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="intervention-${id}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('💥 Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
} 