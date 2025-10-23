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

    // 2. Estrai gli articoli con i loro magazzini di origine dai movements
    const articlesWithWarehouses = originalIntervention.connected_articles?.map((art: ConnectedArticle) => {
      const fromWarehouses = art.movements
        ?.filter(m => String(m.to_warehouse_id) === 'CL' && m.from_warehouse_id)
        .map(m => ({
          warehouse_id: String(m.from_warehouse_id),
          quantity: m.quantity || 0
        })) || [];
      
      return {
        article_id: String(art.id),
        quantity: art.quantity || 1,
        from_warehouses: fromWarehouses
      };
    }).filter((art: { article_id: string; quantity: number; from_warehouses: Array<{ warehouse_id: string; quantity: number }> }) => art.from_warehouses.length > 0) || [];

    console.log('📦 Articoli da riassegnare:', articlesWithWarehouses.length);

    // 3. Crea il nuovo intervento VUOTO (senza articoli)
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
      
      // Equipments: estraggo solo gli ID (sono riferimenti, quindi ok duplicarli)
      equipments: originalIntervention.connected_equipment?.map((eq: Equipment) => eq.id) || [],
      
      // Articles: VUOTO - verranno aggiunti dopo con PUT
      articles: []
    };

    console.log('📤 Payload nuovo intervento duplicato (senza articoli):', newInterventionPayload);

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
    console.log('✅ Nuovo intervento creato (vuoto):', newIntervention.id);

    // 4. AWAIT - Rimuovi articoli dall'intervento originale (tornano a magazzino)
    if (articlesWithWarehouses.length > 0) {
      console.log('🔄 Step 1/2: Rimozione articoli dall\'intervento originale...');
      
      const removeArticlesPayload = {
        customer_id: originalIntervention.customer_id,
        type_id: originalIntervention.type_id,
        zone_id: originalIntervention.zone_id,
        customer_location_id: originalIntervention.customer_location_id,
        flg_home_service: originalIntervention.flg_home_service,
        flg_discount_home_service: originalIntervention.flg_discount_home_service,
        date: originalIntervention.date || null,
        time_slot: originalIntervention.time_slot || null,
        from_datetime: originalIntervention.from_datetime || null,
        to_datetime: originalIntervention.to_datetime || null,
        quotation_price: parseFloat(String(originalIntervention.quotation_price)) || 0,
        opening_hours: originalIntervention.opening_hours || "",
        assigned_to: originalIntervention.assigned_to || "",
        call_code: originalIntervention.call_code || "",
        internal_notes: originalIntervention.internal_notes || "",
        status_id: originalIntervention.status_id,
        equipments: originalIntervention.connected_equipment?.map((eq: Equipment) => eq.id) || [],
        articles: [] // Rimuovi tutti gli articoli
      };

      const removeResponse = await fetch(`${BASE_URL}api/assistance-interventions/${interventionId}`, {
        method: 'PUT',
        headers: postHeaders,
        body: JSON.stringify(removeArticlesPayload)
      });

      if (!removeResponse.ok) {
        const errorText = await removeResponse.text();
        throw new Error(`Errore nella rimozione articoli dall'intervento originale: ${errorText}`);
      }

      console.log('✅ Articoli rimossi dall\'intervento originale (tornati a magazzino)');

      // 5. AWAIT - Aggiungi articoli al nuovo intervento (prelievo da magazzino)
      console.log('🔄 Step 2/2: Assegnazione articoli al nuovo intervento...');

      // Ricarica il nuovo intervento per avere tutti i dati aggiornati
      const getNewResponse = await fetch(`${BASE_URL}api/assistance-interventions/${newIntervention.id}`, {
        method: 'GET',
        headers,
      });

      if (!getNewResponse.ok) {
        const errorText = await getNewResponse.text();
        throw new Error(`Errore nel recupero del nuovo intervento: ${errorText}`);
      }

      const newInterventionData = await getNewResponse.json();

      const addArticlesPayload = {
        customer_id: newInterventionData.customer_id,
        type_id: newInterventionData.type_id,
        zone_id: newInterventionData.zone_id,
        customer_location_id: newInterventionData.customer_location_id,
        flg_home_service: newInterventionData.flg_home_service,
        flg_discount_home_service: newInterventionData.flg_discount_home_service,
        date: newInterventionData.date || null,
        time_slot: newInterventionData.time_slot || null,
        from_datetime: newInterventionData.from_datetime || null,
        to_datetime: newInterventionData.to_datetime || null,
        quotation_price: parseFloat(String(newInterventionData.quotation_price)) || 0,
        opening_hours: newInterventionData.opening_hours || "",
        assigned_to: newInterventionData.assigned_to || "",
        call_code: newInterventionData.call_code || "",
        internal_notes: newInterventionData.internal_notes || "",
        status_id: newInterventionData.status_id,
        equipments: newInterventionData.connected_equipment?.map((eq: Equipment) => eq.id) || [],
        articles: articlesWithWarehouses
      };

      const addResponse = await fetch(`${BASE_URL}api/assistance-interventions/${newIntervention.id}`, {
        method: 'PUT',
        headers: postHeaders,
        body: JSON.stringify(addArticlesPayload)
      });

      if (!addResponse.ok) {
        const errorText = await addResponse.text();
        throw new Error(`Errore nell'assegnazione articoli al nuovo intervento: ${errorText}`);
      }

      console.log('✅ Articoli assegnati al nuovo intervento (prelevati da magazzino)');
    } else {
      console.log('ℹ️ Nessun articolo da riassegnare');
    }

    // 6. Ricarica il nuovo intervento con tutti gli articoli aggiornati
    const getFinalResponse = await fetch(`${BASE_URL}api/assistance-interventions/${newIntervention.id}`, {
      method: 'GET',
      headers,
    });

    if (!getFinalResponse.ok) {
      const errorText = await getFinalResponse.text();
      throw new Error(`Errore nel recupero finale del nuovo intervento: ${errorText}`);
    }

    const finalNewIntervention = await getFinalResponse.json();
    console.log('✅ Duplicazione completata con successo:', finalNewIntervention.id);

    return {
      success: true,
      data: finalNewIntervention
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