'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import type { ConnectedEquipment, ConnectedArticle } from '../../../types/assistance-interventions';

interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone_number: string;
}

interface Intervento {
  id: string;
  ragioneSociale: string;
  data: string;
  orario: string;
  zona: string;
  tecnico: string;
  status: string;
  statusLabel?: string;
  statusColor?: string;
  callCode?: string;
  from_datetime?: string;
  to_datetime?: string;
  calendar_notes?: string;
}

interface ApiResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  skip?: number;
}

interface InterventionFromApi {
  id: number;
  company_name: string;
  date: string;
  time_slot: string;
  zone_label: string;
  assigned_to_name: string;
  assigned_to_surname: string;
  status_label: string;
  status_color: string;
  call_code: string;
  from_datetime: string;
  to_datetime: string;
  customer_id: number;
  type_id: number;
  zone_id: number;
  customer_location_id: number;
  flg_home_service: boolean;
  flg_discount_home_service: boolean;
  quotation_price: string;
  opening_hours: string;
  assigned_to: string;
  internal_notes: string;
  status_id: number;
  connected_equipment?: Array<{ id: number }>;
  connected_articles?: Array<{ id: number }>;
  cancelled_by?: string;
  calendar_notes?: string;
}

interface Zone {
  id: number;
  label: string;
}

export function useInterventions(viewMode: 'weekly' | 'daily' = 'weekly', currentDate: Date = new Date()) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // Stati per gli interventi del calendario (interni)
  const [interventiCalendario, setInterventiCalendario] = useState<Intervento[]>([]);
  
  // Nuovi stati per gli interventi da assegnare
  const [interventiDaAssegnare, setInterventiDaAssegnare] = useState<Intervento[]>([]);
  const [loadingInterventiDaAssegnare, setLoadingInterventiDaAssegnare] = useState(true);
  const [errorInterventiDaAssegnare, setErrorInterventiDaAssegnare] = useState<string | null>(null);

  // Stato per le zone
  const [zones, setZones] = useState<Zone[]>([]);

  const auth = useAuth();

  // Genera i giorni lavorativi della settimana corrente (Lunedì-Sabato)
  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Lunedì come primo giorno
    startOfWeek.setDate(diff);

    // 6 giorni lavorativi (Lunedì-Sabato)
    for (let i = 0; i < 6; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  // Funzione helper per parsare la stringa di assegnazione
  const parseAssignmentString = (assignment: string) => {
    // Format: "15/01/2024 - Mattina (8:00 - 13:00)" o "15/01/2024 dalle 10:00 alle 15:00"
    console.log('🔍 Parsing assignment:', assignment);
    
    // Estrai la data
    const dateMatch = assignment.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dateMatch) {
      throw new Error('Formato data non valido');
    }
    
    const [, day, month, year] = dateMatch;
    const date = `${year}-${month}-${day}`;
    
    let time_slot = '';
    let from_datetime = '';
    let to_datetime = '';
    
    // Determina il tipo di orario e i datetime
    if (assignment.includes('Mattina')) {
      time_slot = 'mattina';
      from_datetime = `${date}T08:00:00.000Z`;
      to_datetime = `${date}T13:00:00.000Z`;
    } else if (assignment.includes('Pomeriggio')) {
      time_slot = 'pomeriggio';
      from_datetime = `${date}T14:00:00.000Z`;
      to_datetime = `${date}T18:00:00.000Z`;
    } else if (assignment.includes('Tutto il giorno')) {
      time_slot = 'tutto_il_giorno';
      from_datetime = `${date}T08:00:00.000Z`;
      to_datetime = `${date}T18:00:00.000Z`;
    } else {
      // Fascia oraria personalizzata: "dalle 10:00 alle 15:00"
      const timeMatch = assignment.match(/dalle (\d{2}:\d{2}) alle (\d{2}:\d{2})/);
      if (timeMatch) {
        time_slot = 'fascia_oraria';
        const [, startTime, endTime] = timeMatch;
        from_datetime = `${date}T${startTime}:00.000Z`;
        to_datetime = `${date}T${endTime}:00.000Z`;
      }
    }
    
    console.log('📋 Parsed data:', { date, time_slot, from_datetime, to_datetime });
    
    return {
      date,
      time_slot,
      from_datetime,
      to_datetime
    };
  };

  // Funzione per fetchare gli interventi del calendario
  const fetchInterventiCalendario = useCallback(async () => {
    try {
      let fromDate: string;
      let toDate: string;
      
      if (viewMode === 'weekly') {
        // Calcola le date di inizio e fine della settimana corrente
        const weekDays = getWeekDays(currentWeek);
        const startDate = weekDays[0]; // Lunedì
        const endDate = weekDays[5]; // Sabato
        
        // Formatta le date in YYYY-MM-DD per l'API
        fromDate = startDate.toISOString().split('T')[0];
        toDate = endDate.toISOString().split('T')[0];
      } else {
        // Vista giornaliera: usa solo il giorno corrente
        fromDate = currentDate.toISOString().split('T')[0];
        toDate = fromDate; // Stesso giorno
      }
      
      const params = new URLSearchParams({
        skip: '100', // Numero più ragionevole dato che filtriamo per data
        page: '1',
        from_date: fromDate,
        to_date: toDate
      });

      console.log(`📅 Fetching interventi per ${viewMode === 'weekly' ? 'settimana' : 'giorno'}: ${fromDate} -> ${toDate}`);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/assistance-interventions?${params.toString()}`, {
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Sessione scaduta, effettuando logout');
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch calendar interventions data');
      }
      
      const data: ApiResponse<InterventionFromApi> = await response.json();
      
      // Converte nel formato atteso dal calendario (tutti gli interventi della settimana)
      const convertedInterventi: Intervento[] = data.data.map((intervention: InterventionFromApi) => ({
        id: intervention.id.toString(),
        ragioneSociale: intervention.company_name,
        data: intervention.date ? new Date(intervention.date).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: 'short'
        }) : '-',
        orario: intervention.time_slot || '-',
        zona: intervention.zone_label || '-',
        tecnico: intervention.assigned_to_name ? 
          (intervention.assigned_to_surname ? 
            `${intervention.assigned_to_name} ${intervention.assigned_to_surname}` : 
            intervention.assigned_to_name) : '-',
        status: intervention.status_label || 'Da assegnare',
        statusLabel: intervention.status_label,
        statusColor: intervention.status_color,
        callCode: intervention.call_code,
        from_datetime: intervention.from_datetime,
        to_datetime: intervention.to_datetime,
        calendar_notes: intervention.calendar_notes
      }));
      
      setInterventiCalendario(convertedInterventi);
      console.log(`✅ Interventi calendario refreshati per ${viewMode === 'weekly' ? 'settimana' : 'giorno'} ${fromDate}-${toDate}:`, convertedInterventi.length);
      
    } catch (err) {
      console.error('Error fetching calendar interventions:', err);
    }
  }, [auth, currentWeek, currentDate, viewMode]);

  // Funzione per recuperare gli interventi da assegnare dall'API
  const fetchInterventiDaAssegnare = useCallback(async () => {
    try {
      setLoadingInterventiDaAssegnare(true);
      setErrorInterventiDaAssegnare(null);
      
      // Recuperiamo un numero elevato di interventi per evitare paginazione
      // e filtriamo solo quelli che hanno almeno un campo non valorizzato
      const params = new URLSearchParams({
        skip: '1000', // Un numero elevato per prendere tutti
        page: '1',
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/assistance-interventions?${params.toString()}`, {
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Sessione scaduta, effettuando logout');
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch interventions data');
      }
      
      const data: ApiResponse<InterventionFromApi> = await response.json();
      
      // Filtra solo gli interventi che hanno almeno uno dei campi non valorizzati
      const interventiFiltered = data.data.filter((intervention: InterventionFromApi) => {
        const hasEmptyAssignedToName = !intervention.assigned_to_name || intervention.assigned_to_name.trim() === '';
        const hasEmptyDate = !intervention.date || intervention.date.trim() === '';
        const hasEmptyFromDate = !intervention.from_datetime || intervention.from_datetime.trim() === '';
        const hasEmptyToDate = !intervention.to_datetime || intervention.to_datetime.trim() === '';
        const isCancelled = intervention.cancelled_by !== undefined && intervention.cancelled_by !== null && intervention.cancelled_by !== '';
        // Restituisce true se almeno uno dei campi è vuoto E non è cancellato
        return (hasEmptyAssignedToName || hasEmptyDate || hasEmptyFromDate || hasEmptyToDate) && !isCancelled;
      });
      
      // Converte nel formato atteso dal componente
      const convertedInterventi: Intervento[] = interventiFiltered.map((intervention: InterventionFromApi) => ({
        id: intervention.id.toString(),
        ragioneSociale: intervention.company_name,
        data: intervention.date ? new Date(intervention.date).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: 'short'
        }) : '-',
        orario: intervention.time_slot || '-',
        zona: intervention.zone_label || '-',
        tecnico: intervention.assigned_to_name ? 
          (intervention.assigned_to_surname ? 
            `${intervention.assigned_to_name} ${intervention.assigned_to_surname}` : 
            intervention.assigned_to_name) : '-',
        status: 'Da assegnare', // Impostiamo tutti come "Da assegnare" per coerenza
        statusLabel: intervention.status_label,
        statusColor: intervention.status_color,
        callCode: intervention.call_code,
        from_datetime: intervention.from_datetime,
        to_datetime: intervention.to_datetime,
        calendar_notes: intervention.calendar_notes
      }));
      
      // Ordina gli interventi dal più recente al meno recente (ID decrescente)
      const sortedInterventi = convertedInterventi.sort((a, b) => {
        return parseInt(b.id) - parseInt(a.id);
      });
      
      setInterventiDaAssegnare(sortedInterventi);
      console.log('✅ Interventi da assegnare caricati:', sortedInterventi.length);
      
    } catch (err) {
      console.error('Error fetching interventi da assegnare:', err);
      setErrorInterventiDaAssegnare('Errore durante il caricamento degli interventi da assegnare');
    } finally {
      setLoadingInterventiDaAssegnare(false);
    }
  }, [auth]);

  // Funzione per salvare un intervento
  const saveIntervention = useCallback(async (data: {
    interventionId: string;
    selectedDate?: string;
    selectedOrarioIntervento?: string;
    selectedOraInizio?: string;
    selectedOraFine?: string;
    selectedTechnician?: User;
    showDateSection: boolean;
    showTimeSection: boolean;
    showTechnicianSection: boolean;
    calendarNotes?: string;
  }) => {
    const { interventionId } = data;

    try {
      console.log(`🔄 Inizio salvataggio intervento ${interventionId}`);

      // Step 1: Recupera i dati attuali dell'intervento
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const getResponse = await fetch(`/api/assistance-interventions/${interventionId}`, {
        headers,
      });

      if (!getResponse.ok) {
        throw new Error(`Errore nel recupero intervento: ${getResponse.status}`);
      }

      const currentData: InterventionFromApi = await getResponse.json();
      console.log('📋 Dati attuali intervento:', currentData);

      // Step 2: Prepara i dati di data/orario (solo se le sezioni sono visibili)
      let finalDate = currentData.date;
      let finalTimeSlot = currentData.time_slot;
      let finalFromDatetime = currentData.from_datetime;
      let finalToDatetime = currentData.to_datetime;

      // Se la sezione data/orario è visibile, aggiorna i valori
      if (data.showDateSection || data.showTimeSection) {
        let formattedAssignment = '';
        const formattedDate = data.selectedDate ? new Date(data.selectedDate).toLocaleDateString('it-IT') : '';
        
        switch (data.selectedOrarioIntervento) {
          case 'mattina':
            formattedAssignment = `${formattedDate} - Mattina (8:00 - 13:00)`;
            break;
          case 'pomeriggio':
            formattedAssignment = `${formattedDate} - Pomeriggio (14:00 - 18:00)`;
            break;
          case 'tutto_il_giorno':
            formattedAssignment = `${formattedDate} - Tutto il giorno (8:00 - 18:00)`;
            break;
          case 'fascia_oraria':
            if (data.selectedOraInizio && data.selectedOraFine) {
              formattedAssignment = `${formattedDate} dalle ${data.selectedOraInizio} alle ${data.selectedOraFine}`;
            } else {
              throw new Error('Seleziona orario di inizio e fine per la fascia oraria.');
            }
            break;
          default:
            // Se non c'è orario selezionato ma la sezione è visibile, è un errore
            if (data.showTimeSection) {
              throw new Error('Seleziona un orario prima di confermare.');
            }
        }

        // Solo se abbiamo una formattedAssignment valida, aggiorna i dati
        if (formattedAssignment) {
          const assignmentData = parseAssignmentString(formattedAssignment);
          finalDate = assignmentData.date;
          finalTimeSlot = assignmentData.time_slot;
          finalFromDatetime = assignmentData.from_datetime;
          finalToDatetime = assignmentData.to_datetime;
        }
      }
      
      // Step 3: Determina l'ID del tecnico (se la sezione tecnico è visibile)
      let technicianId = currentData.assigned_to; // Mantieni quello esistente di default
      if (data.showTechnicianSection && data.selectedTechnician) {
        technicianId = data.selectedTechnician.id;
      }
      
      // Step 4: Costruisci il body della PUT request con tutti i campi esistenti + le modifiche
      const updatePayload = {
        customer_id: currentData.customer_id,
        type_id: currentData.type_id,
        zone_id: currentData.zone_id,
        customer_location_id: currentData.customer_location_id,
        flg_home_service: currentData.flg_home_service,
        flg_discount_home_service: currentData.flg_discount_home_service,
        // Usa i dati finali (esistenti o aggiornati)
        date: finalDate,
        time_slot: finalTimeSlot,
        from_datetime: finalFromDatetime,
        to_datetime: finalToDatetime,
        quotation_price: parseFloat(currentData.quotation_price) || 0,
        opening_hours: currentData.opening_hours || '',
        assigned_to: technicianId,
        call_code: currentData.call_code,
        internal_notes: currentData.internal_notes || '',
        status_id: currentData.status_id,
        // Mantieni equipments e articles esistenti
        equipments: (currentData.connected_equipment as ConnectedEquipment[] | undefined)?.map((eq) => eq.id) || [],
        articles: (currentData.connected_articles as ConnectedArticle[] | undefined)?.map((art) => ({
          article_id: art.id,
          quantity: typeof art.quantity === 'number' ? art.quantity : 1
        })) || [],
        calendar_notes: data.calendarNotes || '',
      };

      console.log('📤 Payload PUT:', updatePayload);

      // Step 5: Salva i dati con PUT
      const putResponse = await fetch(`/api/assistance-interventions/${interventionId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatePayload),
      });

      if (!putResponse.ok) {
        const errorText = await putResponse.text();
        throw new Error(`Errore nel salvataggio: ${putResponse.status} - ${errorText}`);
      }

      const savedData = await putResponse.json();
      console.log('✅ Intervento salvato con successo:', savedData);

      // Step 6: Ricarica i dati
      fetchInterventiDaAssegnare();
      fetchInterventiCalendario();
      
    } catch (error) {
      console.error('💥 Errore durante il salvataggio:', error);
      
      // Mostra l'errore all'utente
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      alert(`Errore durante il salvataggio: ${errorMessage}`);
      throw error;
    }
  }, [auth, fetchInterventiDaAssegnare, fetchInterventiCalendario]);

  // Hook per caricare gli interventi da assegnare al mount
  useEffect(() => {
    fetchInterventiDaAssegnare();
  }, [fetchInterventiDaAssegnare]);

  // Hook per ricaricare gli interventi del calendario quando cambia la settimana
  useEffect(() => {
    fetchInterventiCalendario();
  }, [fetchInterventiCalendario]);

  // Fetch delle zone al mount
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/string',
        };
        if (auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        }
        const response = await fetch('/api/zones', { headers });
        if (response.ok) {
          const data = await response.json();
          setZones(data);
        }
      } catch (err) {
        console.error('Errore nel fetch delle zone:', err);
      }
    };
    fetchZones();
  }, [auth, auth.token]);

  // Funzione per navigare tra le settimane
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  // Funzione per navigare tra i giorni (vista giornaliera)
  const navigateDay = (direction: 'prev' | 'next'): Date => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    return newDate;
  };

  return {
    // Stati
    currentWeek,
    interventiCalendario,
    interventiDaAssegnare,
    loadingInterventiDaAssegnare,
    errorInterventiDaAssegnare,
    zones,
    
    // Azioni
    navigateWeek,
    navigateDay,
    fetchInterventiDaAssegnare,
    fetchInterventiCalendario,
    saveIntervention,
  };
}
