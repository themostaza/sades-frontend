import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';
import { 
  AssistanceInterventionDetail, 
  CreateAssistanceInterventionRequest,
  UpdateAssistanceInterventionRequest 
} from '../../../../types/assistance-interventions';

const BASE_URL = config.BASE_URL;

interface BulkDuplicateRequest {
  intervention_ids: number[];
  cancel_originals?: boolean;
  user_id?: string; // ID dell'utente che esegue la duplicazione
  target_date?: string; // Data target per la duplicazione (YYYY-MM-DD)
}

interface BulkDuplicateResponse {
  success: boolean;
  results: {
    duplicated: Array<{
      original_id: number;
      new_intervention: AssistanceInterventionDetail;
    }>;
    cancelled: number[];
    errors: Array<{
      intervention_id: number;
      error: string;
    }>;
  };
}

// Funzione helper per calcolare la data target (default: domani)
const getTargetDate = (targetDate?: string): string => {
  if (targetDate) {
    return targetDate; // Usa la data specificata
  }
  // Default: domani
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Funzione helper per calcolare i datetime sulla data target mantenendo l'orario originale
const getTargetDatetime = (originalDatetime: string, targetDate?: string): string => {
  const originalDate = new Date(originalDatetime);
  const target = targetDate ? new Date(targetDate) : new Date();
  
  if (!targetDate) {
    // Default: domani
    target.setDate(target.getDate() + 1);
  }
  
  // Mantieni l'orario dell'intervento originale ma sulla data target
  target.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds(), originalDate.getMilliseconds());
  
  return target.toISOString();
};

// POST - Bulk duplicate assistance interventions
export async function POST(request: NextRequest) {
  try {
    const body: BulkDuplicateRequest = await request.json();
    const authHeader = request.headers.get('authorization');
    
    console.log('🔄 Starting bulk duplicate for interventions:', body.intervention_ids);
    console.log('📋 Cancel originals:', body.cancel_originals);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const results: BulkDuplicateResponse['results'] = {
      duplicated: [],
      cancelled: [],
      errors: []
    };

    // Processa ogni intervento
    for (const interventionId of body.intervention_ids) {
      try {
        console.log(`🔄 Processing intervention ${interventionId}`);

        // 1. Fetch dei dati dell'intervento originale
        const getResponse = await fetch(`${BASE_URL}api/assistance-interventions/${interventionId}`, {
          method: 'GET',
          headers,
        });

        if (!getResponse.ok) {
          throw new Error(`Failed to fetch intervention ${interventionId}: ${getResponse.status}`);
        }

        const originalIntervention: AssistanceInterventionDetail = await getResponse.json();
        console.log(`📋 Original intervention ${interventionId} fetched successfully`);

        // 2. Prepara i dati per la duplicazione
        const newInterventionPayload: CreateAssistanceInterventionRequest = {
          customer_id: originalIntervention.customer_id || 0,
          type_id: originalIntervention.type_id || 0,
          zone_id: originalIntervention.zone_id || 0,
          customer_location_id: originalIntervention.customer_location_id || '',
          flg_home_service: originalIntervention.flg_home_service || false,
          flg_discount_home_service: originalIntervention.flg_discount_home_service || false,
          
          // Data target selezionata dall'utente (default: domani)
          date: getTargetDate(body.target_date),
          time_slot: originalIntervention.time_slot || null,
          from_datetime: originalIntervention.from_datetime ? getTargetDatetime(originalIntervention.from_datetime, body.target_date) : null,
          to_datetime: originalIntervention.to_datetime ? getTargetDatetime(originalIntervention.to_datetime, body.target_date) : null,
          
          // Mantieni tutti gli altri dati uguali
          quotation_price: parseFloat(originalIntervention.quotation_price) || 0,
          opening_hours: originalIntervention.opening_hours || '',
          assigned_to: originalIntervention.assigned_to || '',
          call_code: originalIntervention.call_code || '',
          internal_notes: originalIntervention.internal_notes || '',
          
          // Status "da assegnare" (ID = 1)
          status_id: 1,
          
          // Equipments e Articles
          equipments: originalIntervention.connected_equipment?.map(eq => eq.id) || [],
          articles: originalIntervention.connected_articles?.map(art => ({
            article_id: art.id,
            quantity: art.quantity || 1
          })) || []
        };

        console.log(`📤 Creating duplicate for intervention ${interventionId}`);

        // 3. Crea il nuovo intervento
        const postResponse = await fetch(`${BASE_URL}api/assistance-interventions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(newInterventionPayload)
        });

        if (!postResponse.ok) {
          throw new Error(`Failed to create duplicate intervention: ${postResponse.status}`);
        }

        const newIntervention: AssistanceInterventionDetail = await postResponse.json();
        console.log(`✅ Duplicate created for intervention ${interventionId} -> ${newIntervention.id}`);

        results.duplicated.push({
          original_id: interventionId,
          new_intervention: newIntervention
        });

        // 4. Se richiesto, annulla l'intervento originale
        if (body.cancel_originals) {
          try {
            console.log(`🔄 Cancelling original intervention ${interventionId}`);

            const cancelPayload: UpdateAssistanceInterventionRequest = {
              customer_id: originalIntervention.customer_id || 0,
              type_id: originalIntervention.type_id || 0,
              zone_id: originalIntervention.zone_id || 0,
              customer_location_id: originalIntervention.customer_location_id || '',
              flg_home_service: originalIntervention.flg_home_service || false,
              flg_discount_home_service: originalIntervention.flg_discount_home_service || false,
              date: originalIntervention.date || null,
              time_slot: originalIntervention.time_slot || null,
              from_datetime: originalIntervention.from_datetime || null,
              to_datetime: originalIntervention.to_datetime || null,
              quotation_price: parseFloat(originalIntervention.quotation_price) || 0,
              opening_hours: originalIntervention.opening_hours || '',
              assigned_to: originalIntervention.assigned_to || '',
              call_code: originalIntervention.call_code || '',
              internal_notes: originalIntervention.internal_notes || '',
              status_id: 8, // Status "annullato" ha ID 8
              cancelled_by: body.user_id || '', // ID dell'utente che esegue la duplicazione
              equipments: originalIntervention.connected_equipment?.map(eq => eq.id) || [],
              articles: originalIntervention.connected_articles?.map(art => ({
                article_id: art.id,
                quantity: art.quantity || 1
              })) || []
            };

            const putResponse = await fetch(`${BASE_URL}api/assistance-interventions/${interventionId}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify(cancelPayload)
            });

            if (!putResponse.ok) {
              throw new Error(`Failed to cancel intervention ${interventionId}: ${putResponse.status}`);
            }

            results.cancelled.push(interventionId);
            console.log(`✅ Original intervention ${interventionId} cancelled successfully`);

          } catch (cancelError) {
            console.error(`❌ Error cancelling intervention ${interventionId}:`, cancelError);
            results.errors.push({
              intervention_id: interventionId,
              error: `Duplicazione riuscita ma errore nell'annullamento: ${cancelError instanceof Error ? cancelError.message : 'Errore sconosciuto'}`
            });
          }
        }

      } catch (error) {
        console.error(`❌ Error processing intervention ${interventionId}:`, error);
        results.errors.push({
          intervention_id: interventionId,
          error: error instanceof Error ? error.message : 'Errore sconosciuto'
        });
      }
    }

    const response: BulkDuplicateResponse = {
      success: results.errors.length === 0,
      results
    };

    console.log('✅ Bulk duplicate completed:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('💥 Bulk duplicate error:', error);
    return NextResponse.json(
      { error: 'Internal server error during bulk duplicate' },
      { status: 500 }
    );
  }
}
