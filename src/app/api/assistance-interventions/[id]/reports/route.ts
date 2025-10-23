import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../../config/env';
import { 
  CreateInterventionReportRequest,
  InterventionReportSummary 
} from '../../../../../types/intervention-reports';
import { AssistanceInterventionDetail, ConnectedArticle } from '@/types/assistance-interventions';
import { Equipment } from '@/types/equipment';

const BASE_URL = config.BASE_URL;

// Funzione helper per duplicare un intervento failed
async function duplicateFailedInterventionBackend(
  interventionId: string,
  authHeader: string | null
): Promise<{ success: boolean; data?: AssistanceInterventionDetail; error?: string }> {
  try {
    console.log('🔄 Duplicating failed intervention (backend):', interventionId);
    
    const headers: Record<string, string> = {
      'accept': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // 1. Fetch dei dati dell'intervento originale
    const getResponse = await fetch(`${BASE_URL}api/assistance-interventions/${interventionId}`, {
      method: 'GET',
      headers,
    });

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      throw new Error(`Errore nel recupero dei dati dell'intervento: ${errorText}`);
    }

    const originalIntervention = await getResponse.json();
    console.log('📋 Dati intervento originale per duplicazione:', originalIntervention.id);

    // 2. Mappa i dati per la creazione del nuovo intervento
    const newInterventionPayload = {
      customer_id: originalIntervention.customer_id,
      type_id: originalIntervention.type_id,
      zone_id: originalIntervention.zone_id,
      customer_location_id: originalIntervention.customer_location_id,
      flg_home_service: originalIntervention.flg_home_service,
      flg_discount_home_service: originalIntervention.flg_discount_home_service,
      
      // Campi che non copiamo (da programmare)
      quotation_price: 0,
      opening_hours: "",
      internal_notes: `[Intervento duplicato da #${interventionId} (rapportino failed)]\n${originalIntervention.internal_notes || ''}`,
      status_id: 1, // Presumo che 1 sia "da programmare"
      
      // Equipments: estraggo solo gli ID
      equipments: originalIntervention.connected_equipment?.map((eq: Equipment) => eq.id) || [],
      
      // Articles: mantengo la struttura { article_id, quantity }
      articles: originalIntervention.connected_articles?.map((art: ConnectedArticle) => ({
        article_id: art.id,
        quantity: art.quantity || 1
      })) || []
    };

    console.log('📤 Payload nuovo intervento duplicato:', newInterventionPayload);

    // 3. Crea il nuovo intervento
    const postHeaders = {
      ...headers,
      'Content-Type': 'application/json',
    };

    const postResponse = await fetch(`${BASE_URL}api/assistance-interventions`, {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify(newInterventionPayload)
    });

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      throw new Error(`Errore nella creazione del nuovo intervento: ${errorText}`);
    }

    const newIntervention = await postResponse.json();
    console.log('✅ Nuovo intervento creato per rapportino failed:', newIntervention.id);

    return {
      success: true,
      data: newIntervention
    };

  } catch (error) {
    console.error('💥 Errore durante la duplicazione dell\'intervento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    };
  }
}

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
    console.log('❌ Is failed intervention:', body.is_failed);

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

    // Se il rapportino è failed, duplica l'intervento
    if (body.is_failed) {
      console.log('🔄 Rapportino failed detected, duplicating intervention...');
      
      const duplicateResult = await duplicateFailedInterventionBackend(id, authHeader);
      
      if (duplicateResult.success) {
        console.log('✅ Intervento duplicato con successo:', duplicateResult.data?.id);
        // Aggiungo l'informazione del nuovo intervento alla risposta
        return NextResponse.json({
          ...data,
          duplicated_intervention: duplicateResult.data
        });
      } else {
        console.error('❌ Errore nella duplicazione dell\'intervento:', duplicateResult.error);
        // Il rapportino è comunque stato creato, quindi non faccio fallire la request
        // Ma aggiungo un warning nella risposta
        return NextResponse.json({
          ...data,
          duplication_warning: `Rapportino creato ma errore nella duplicazione intervento: ${duplicateResult.error}`
        });
      }
    }

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