'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X, Search, ExternalLink, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { ConnectedEquipment, ConnectedArticle } from '../../types/assistance-interventions';

interface Intervento {
  id: string;
  ragioneSociale: string;
  data: string;
  orario: string;
  zona: string;
  tecnico: string;
  status: string;
  statusLabel?: string; // Status reale dall'API
  statusColor?: string; // Colore status dall'API
  callCode?: string; // Codice di chiamata
  from_datetime?: string; // Orario di inizio
  to_datetime?: string; // Orario di fine
}

interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone_number: string;
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
}

export default function CalendarioView() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // Stati per gli interventi del calendario (interni)
  const [interventiCalendario, setInterventiCalendario] = useState<Intervento[]>([]);
  
  // Nuovi stati per gli interventi da assegnare
  const [interventiDaAssegnare, setInterventiDaAssegnare] = useState<Intervento[]>([]);
  const [loadingInterventiDaAssegnare, setLoadingInterventiDaAssegnare] = useState(true);
  const [errorInterventiDaAssegnare, setErrorInterventiDaAssegnare] = useState<string | null>(null);

  // Stati per il dialog di selezione data/orario
  const [showDateTimeDialog, setShowDateTimeDialog] = useState(false);
  const [currentInterventoId, setCurrentInterventoId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedOrarioIntervento, setSelectedOrarioIntervento] = useState('');
  const [selectedOraInizio, setSelectedOraInizio] = useState('');
  const [selectedOraFine, setSelectedOraFine] = useState('');

  // Stati per controllare la visibilità delle sezioni nel dialog
  const [showDateSection, setShowDateSection] = useState(true);
  const [showTimeSection, setShowTimeSection] = useState(true);
  const [showTechnicianSection, setShowTechnicianSection] = useState(true);

  // Stati per la selezione del tecnico nel dialog
  const [technicianSearchQuery, setTechnicianSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [showTechnicianDropdown, setShowTechnicianDropdown] = useState(false);
  const [isSearchingTechnicians, setIsSearchingTechnicians] = useState(false);
  const [selectedTechnicianInDialog, setSelectedTechnicianInDialog] = useState<User | null>(null);

  // Stato per le zone e la zona selezionata
  const [zones, setZones] = useState<{ id: number; label: string }[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('');

  // Stato per il dialog di dettaglio intervento calendario
  const [selectedCalendarIntervento, setSelectedCalendarIntervento] = useState<Intervento | null>(null);
  const [showCalendarInterventoDialog, setShowCalendarInterventoDialog] = useState(false);

  // Stati per i filtri calendario
  const [calendarTechnicianFilter, setCalendarTechnicianFilter] = useState<string[]>([]);
  const [showTechnicianMultiSelect, setShowTechnicianMultiSelect] = useState(false);
  const [calendarStatusFilter, setCalendarStatusFilter] = useState<string[]>([]);
  const [showStatusMultiSelect, setShowStatusMultiSelect] = useState(false);

  // Stato per le note calendario
  const [calendarNotes, setCalendarNotes] = useState<string>('');
  const [savingCalendarNotes, setSavingCalendarNotes] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Opzioni tecnici disponibili nella settimana
  const calendarTechnicianOptions = Array.from(new Set(interventiCalendario.map(i => i.tecnico).filter(t => t && t !== '-')));

  // Status options con colori
  const statusOptions = [
    { id: 'da_assegnare', label: 'Da assegnare', color: 'bg-orange-100 text-orange-800' },
    { id: 'attesa_preventivo', label: 'Attesa preventivo', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'attesa_ricambio', label: 'Attesa ricambio', color: 'bg-blue-100 text-blue-800' },
    { id: 'in_carico', label: 'In carico', color: 'bg-teal-100 text-teal-800' },
    { id: 'da_confermare', label: 'Da confermare', color: 'bg-purple-100 text-purple-800' },
    { id: 'completato', label: 'Completato', color: 'bg-green-100 text-green-800' },
    { id: 'non_completato', label: 'Non completato', color: 'bg-gray-100 text-gray-800' },
    { id: 'annullato', label: 'Annullato', color: 'bg-red-100 text-red-800' },
    { id: 'fatturato', label: 'Fatturato', color: 'bg-emerald-100 text-emerald-800' },
    { id: 'collocamento', label: 'Collocamento', color: 'bg-indigo-100 text-indigo-800' }
  ];

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
      
      // Calcola le date di inizio e fine della settimana corrente
      const weekDays = getWeekDays(currentWeek);
      const startDate = weekDays[0]; // Lunedì
      const endDate = weekDays[5]; // Sabato
      
      // Formatta le date in YYYY-MM-DD per l'API
      const fromDate = startDate.toISOString().split('T')[0];
      const toDate = endDate.toISOString().split('T')[0];
      
      const params = new URLSearchParams({
        skip: '100', // Numero più ragionevole dato che filtriamo per data
        page: '1',
        from_date: fromDate,
        to_date: toDate
      });

      console.log(`📅 Fetching interventi per settimana: ${fromDate} -> ${toDate}`);

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
        to_datetime: intervention.to_datetime
      }));
      
      setInterventiCalendario(convertedInterventi);
      console.log(`✅ Interventi calendario refreshati per settimana ${fromDate}-${toDate}:`, convertedInterventi.length);
      
    } catch (err) {
      console.error('Error fetching calendar interventions:', err);
    } finally {
    }
  }, [auth, currentWeek]);

  // Funzione per cercare i tecnici nel dialog
  const searchTechnicians = useCallback(async (query: string) => {
    try {
      setIsSearchingTechnicians(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      // Costruisco l'URL con i parametri - uso role_id=2 per i tecnici
      let url = `/api/users?skip=10&role_id=2`;
      if (query.trim() && query.length >= 2) {
        url += `&query=${encodeURIComponent(query)}`;
      }

      const response = await fetch(url, {
        headers,
      });

      if (response.ok) {
        const data: ApiResponse<User> = await response.json();
        setUsers(data.data || []);
        setShowTechnicianDropdown(true);
      } else {
        console.error('Errore nella ricerca tecnici:', response.status);
        setUsers([]);
        setShowTechnicianDropdown(false);
      }
    } catch (error) {
      console.error('Errore nella ricerca tecnici:', error);
      setUsers([]);
      setShowTechnicianDropdown(false);
    } finally {
      setIsSearchingTechnicians(false);
    }
  }, [auth]);

  // Funzione per caricare tutti i tecnici (quando si clicca nel campo)
  const loadAllTechnicians = async () => {
    if (users.length > 0) {
      setShowTechnicianDropdown(true);
      return;
    }
    await searchTechnicians('');
  };

  // Gestisce la selezione di un tecnico nel dialog
  const handleTechnicianSelect = (user: User) => {
    setSelectedTechnicianInDialog(user);
    const fullName = user.surname ? `${user.name} ${user.surname}` : user.name;
    setTechnicianSearchQuery(fullName);
    setShowTechnicianDropdown(false);
  };

  // Gestisce il cambio del testo di ricerca tecnico
  const handleTechnicianSearchChange = (value: string) => {
    setTechnicianSearchQuery(value);
    
    if (!value.trim()) {
      setSelectedTechnicianInDialog(null);
    }
  };

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
        to_datetime: intervention.to_datetime
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

  // Gestisce il click fuori dal dropdown per chiuderlo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.technician-search-container')) {
        setShowTechnicianDropdown(false);
      }
    };

    if (showTechnicianDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTechnicianDropdown]);

  // Debounce per la ricerca tecnici
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (technicianSearchQuery.trim() && technicianSearchQuery.length >= 2) {
        searchTechnicians(technicianSearchQuery);
      } else if (technicianSearchQuery.trim() === '' && showTechnicianDropdown) {
        // Se il campo è vuoto ma il dropdown è aperto, mostra tutti i tecnici
        searchTechnicians('');
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [technicianSearchQuery, showTechnicianDropdown, searchTechnicians]);

  // Funzione per aprire il dialog di selezione data/orario
  const openDateTimeDialog = (interventoId: string) => {
    setCurrentInterventoId(interventoId);
    
    // Trova l'intervento corrente
    const currentIntervento = interventiDaAssegnare.find(i => i.id === interventoId);
    
    // Controlla se il tecnico è già valorizzato nell'intervento originale
    const hasTecnico = currentIntervento && currentIntervento.tecnico !== '-';
    
    // Controlla se la data è già valorizzata nell'intervento originale
    const hasData = currentIntervento && currentIntervento.data !== '-';
    
    // Controlla se l'orario è già valorizzato nell'intervento originale
    const hasOrario = currentIntervento && currentIntervento.orario !== '-';
    
    // Imposta la visibilità delle sezioni
    setShowTechnicianSection(!hasTecnico);
    setShowDateSection(!hasData);
    setShowTimeSection(!hasOrario);
    
    // Pre-popola la data dall'intervento originale se disponibile
    if (hasData) {
      try {
        const dateStr = currentIntervento.data;
        const currentYear = new Date().getFullYear();
        const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        const parts = dateStr.split(' ');
        if (parts.length === 2) {
          const day = parts[0].padStart(2, '0');
          const monthIndex = monthNames.indexOf(parts[1]);
          if (monthIndex !== -1) {
            const month = (monthIndex + 1).toString().padStart(2, '0');
            setSelectedDate(`${currentYear}-${month}-${day}`);
          }
        }
      } catch {
        setSelectedDate('');
      }
    } else {
      setSelectedDate('');
    }
    
    // Pre-popola l'orario dall'intervento originale se disponibile
    if (hasOrario) {
      setSelectedOrarioIntervento(currentIntervento.orario);
    } else {
      setSelectedOrarioIntervento('');
    }
    
    setSelectedOraInizio('');
    setSelectedOraFine('');
    
    // Pre-popola il tecnico dall'intervento originale se disponibile
    if (hasTecnico) {
      setTechnicianSearchQuery(currentIntervento.tecnico);
      setSelectedTechnicianInDialog({
        id: '', // Non abbiamo l'ID dall'intervento originale
        name: currentIntervento.tecnico.split(' ')[0] || '',
        surname: currentIntervento.tecnico.split(' ').slice(1).join(' ') || '',
        email: '',
        phone_number: ''
      });
    } else {
      setTechnicianSearchQuery('');
      setSelectedTechnicianInDialog(null);
    }
    
    setUsers([]);
    setShowTechnicianDropdown(false);
    setShowDateTimeDialog(true);
  };

  // Funzione per chiudere il dialog
  const closeDateTimeDialog = () => {
    setShowDateTimeDialog(false);
    setCurrentInterventoId(null);
    setSelectedDate('');
    setSelectedOrarioIntervento('');
    setSelectedOraInizio('');
    setSelectedOraFine('');
    // Reset anche stati tecnico
    setTechnicianSearchQuery('');
    setSelectedTechnicianInDialog(null);
    setUsers([]);
    setShowTechnicianDropdown(false);
    // Reset visibilità sezioni
    setShowDateSection(true);
    setShowTimeSection(true);
    setShowTechnicianSection(true);
  };

  // Funzione per confermare la selezione di data e orario
  const confirmDateTime = async () => {
    if (!currentInterventoId) {
      return;
    }

    // Verifica che ci sia un tecnico selezionato se la sezione tecnico è visibile
    if (showTechnicianSection && !selectedTechnicianInDialog) {
      alert('Seleziona un tecnico prima di confermare.');
      return;
    }

    // Se le sezioni data/orario sono visibili, verifica che siano compilate
    if (showDateSection && !selectedDate) {
      alert('Seleziona una data prima di confermare.');
      return;
    }

    if (showTimeSection && !selectedOrarioIntervento) {
      alert('Seleziona un orario prima di confermare.');
      return;
    }

    try {
      console.log(`🔄 Inizio salvataggio intervento ${currentInterventoId}`);

      // Step 1: Recupera i dati attuali dell'intervento
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const getResponse = await fetch(`/api/assistance-interventions/${currentInterventoId}`, {
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
      if (showDateSection || showTimeSection) {
        let formattedAssignment = '';
        const formattedDate = new Date(selectedDate).toLocaleDateString('it-IT');
        
        switch (selectedOrarioIntervento) {
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
            if (selectedOraInizio && selectedOraFine) {
              formattedAssignment = `${formattedDate} dalle ${selectedOraInizio} alle ${selectedOraFine}`;
            } else {
              alert('Seleziona orario di inizio e fine per la fascia oraria.');
              return;
            }
            break;
          default:
            // Se non c'è orario selezionato ma la sezione è visibile, è un errore
            if (showTimeSection) {
              alert('Seleziona un orario prima di confermare.');
              return;
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
      if (showTechnicianSection && selectedTechnicianInDialog) {
        technicianId = selectedTechnicianInDialog.id;
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
        calendar_notes: calendarNotes,
      };

      console.log('📤 Payload PUT:', updatePayload);

      // Step 5: Salva i dati con PUT
      const putResponse = await fetch(`/api/assistance-interventions/${currentInterventoId}`, {
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

      // Step 6: Chiudi il dialog e ricarica i dati
      closeDateTimeDialog();
      
      // Ricarica la lista degli interventi da assegnare per riflettere i cambiamenti
      fetchInterventiDaAssegnare();
      
      // Refresh direttamente i dati del calendario
      fetchInterventiCalendario();
      
    } catch (error) {
      console.error('💥 Errore durante il salvataggio:', error);
      
      // Mostra l'errore all'utente
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      alert(`Errore durante il salvataggio: ${errorMessage}`);
    }
  };

  // Verifica se il form è valido per la conferma
  const isFormValid = () => {
    // Se la sezione data è visibile, deve essere selezionata una data
    if (showDateSection && !selectedDate) return false;
    
    // Se la sezione orario è visibile, deve essere selezionato un orario
    if (showTimeSection && !selectedOrarioIntervento) return false;
    
    // Se è selezionata una fascia oraria personalizzata, devono essere impostati inizio e fine
    if (showTimeSection && selectedOrarioIntervento === 'fascia_oraria') {
      if (!selectedOraInizio || !selectedOraFine) return false;
    }
    
    // Se la sezione tecnico è visibile, deve essere selezionato un tecnico
    if (showTechnicianSection && !selectedTechnicianInDialog) return false;
    
    return true;
  };

  // Funzione per ottenere l'ora da una stringa datetime
  const getTimeFromDatetime = (datetime: string): string => {
    if (!datetime) return '';
    // Prende solo la parte HH:MM dalla stringa ISO
    return datetime.substring(11, 16);
  };

  // Funzione per convertire HEX in rgba con opacità
  function hexToRgba(hex: string, alpha: number) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // Funzione per normalizzare lo status per il confronto
  const normalizeStatus = (status: string): string => {
    return status ? status.toLowerCase().trim() : '';
  };

  // Funzione per ottenere gli interventi che iniziano in un time slot specifico
  const getInterventiForTimeSlot = (day: Date, timeSlot: string): Intervento[] => {
    const dayString = day.toISOString().split('T')[0];
    
    return interventiCalendario.filter(intervento => {
      // Filtra per tecnico se ci sono filtri attivi
      if (calendarTechnicianFilter.length > 0 && !calendarTechnicianFilter.includes(intervento.tecnico)) {
        return false;
      }

      // Filtra per status se ci sono filtri attivi
      if (calendarStatusFilter.length > 0) {
        const interventionStatus = normalizeStatus(intervento.statusLabel || intervento.status);
        const hasMatchingStatus = calendarStatusFilter.some(filterStatus => 
          normalizeStatus(filterStatus) === interventionStatus
        );
        
        if (!hasMatchingStatus) {
          return false;
        }
      }

      // Se l'intervento ha un from_datetime, usa direttamente la stringa ISO per il filtraggio
      if (intervento.from_datetime) {
        const interventionDay = intervento.from_datetime.substring(0, 10); // YYYY-MM-DD
        const interventionTime = intervento.from_datetime.substring(11, 16); // HH:MM
        return interventionDay === dayString && interventionTime === timeSlot;
      }
      
      // Altrimenti usa il time_slot
      const interventionDate = new Date(intervento.data);
      const interventionDay = interventionDate.toISOString().split('T')[0];
      
      if (interventionDay !== dayString) return false;
      
      // Mappa i time_slot alle fasce orarie
      if (intervento.orario === 'mattina' && timeSlot === '08:00') return true;
      if (intervento.orario === 'pomeriggio' && timeSlot === '14:00') return true;
      if (intervento.orario === 'tutto_il_giorno' && timeSlot === '08:00') return true;
      
      return false;
    });
  };

  // Funzione per calcolare la durata in ore di un intervento
  const getInterventoDurationInHours = (intervento: Intervento): number => {
    if (!intervento.from_datetime || !intervento.to_datetime) {
      // Fallback basato sul time_slot se disponibile
      if (intervento.orario === 'mattina') return 5; // 8:00-13:00
      if (intervento.orario === 'pomeriggio') return 4; // 14:00-18:00
      if (intervento.orario === 'tutto_il_giorno') return 10; // 8:00-18:00
      return 1; // Default 1 ora
    }
    
    try {
      const startTime = new Date(intervento.from_datetime);
      const endTime = new Date(intervento.to_datetime);
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      return Math.max(1, Math.round(durationHours)); // Minimo 1 ora
    } catch {
      return 1;
    }
  };

  // Funzione per ottenere l'altezza del blocco in pixel (80px per ora)
  const getBlockHeight = (intervento: Intervento): number => {
    const hours = getInterventoDurationInHours(intervento);
    return hours * 80; // 80px per ogni slot orario
  };

  const weekDays = getWeekDays(currentWeek);
  const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

  // Fasce orarie
  const timeSlots2 = [
    '07:00',
    '08:00',
    '09:00', 
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
    '21:00',
    '22:00'
  ];

  // Funzione per ottenere il colore dello status
  const getStatusColor = (status: Intervento['status']) => {
    switch (status) {
      case 'In carico':
        return 'bg-blue-500';
      case 'Completato':
        return 'bg-pink-500';
      case 'Da assegnare':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Funzione per navigare tra le settimane
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  // Funzione per ottenere il mese e anno corrente
  const getCurrentMonthYear = () => {
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return `${months[currentWeek.getMonth()]} ${currentWeek.getFullYear()}`;
  };

  const openCalendarInterventoDialog = (intervento: Intervento) => {
    setSelectedCalendarIntervento(intervento);
    setShowCalendarInterventoDialog(true);
  };

  const closeCalendarInterventoDialog = () => {
    setShowCalendarInterventoDialog(false);
    setSelectedCalendarIntervento(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.technician-multi-select') && !target.closest('.status-multi-select')) {
        setShowTechnicianMultiSelect(false);
        setShowStatusMultiSelect(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Quando si seleziona un intervento dal calendario, carica le note
  useEffect(() => {
    if (showCalendarInterventoDialog && selectedCalendarIntervento) {
      // Recupera le note dal backend se disponibili
      const fetchNotes = async () => {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (auth.token) {
            headers['Authorization'] = `Bearer ${auth.token}`;
          }
          const response = await fetch(`/api/assistance-interventions/${selectedCalendarIntervento.id}`, { headers });
          if (response.ok) {
            const data = await response.json();
            setCalendarNotes(data.calendar_notes || '');
          } else {
            setCalendarNotes('');
          }
        } catch {
          setCalendarNotes('');
        }
      };
      fetchNotes();
    }
  }, [showCalendarInterventoDialog, selectedCalendarIntervento, auth.token]);

  // Funzione per autosalvataggio delle note con debounce
  const handleCalendarNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCalendarNotes(value);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(async () => {
      if (!selectedCalendarIntervento) return;
      setSavingCalendarNotes(true);
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        }
        // Recupera i dati attuali per non sovrascrivere altri campi
        const getResponse = await fetch(`/api/assistance-interventions/${selectedCalendarIntervento.id}`, { headers });
        if (!getResponse.ok) return;
        const currentData = await getResponse.json();
        // Prepara il payload SOLO con i campi previsti dallo swagger
        const updatePayload = {
          customer_id: currentData.customer_id,
          type_id: currentData.type_id,
          zone_id: currentData.zone_id,
          customer_location_id: currentData.customer_location_id,
          flg_home_service: currentData.flg_home_service,
          flg_discount_home_service: currentData.flg_discount_home_service,
          date: currentData.date,
          time_slot: currentData.time_slot,
          from_datetime: currentData.from_datetime,
          to_datetime: currentData.to_datetime,
          quotation_price: parseFloat(currentData.quotation_price) || 0,
          opening_hours: currentData.opening_hours || '',
          assigned_to: currentData.assigned_to,
          call_code: currentData.call_code,
          internal_notes: currentData.internal_notes || '',
          status_id: currentData.status_id,
          approved_by: currentData.approved_by,
          approved_at: currentData.approved_at,
          cancelled_by: currentData.cancelled_by,
          cancelled_at: currentData.cancelled_at,
          invoiced_by: currentData.invoiced_by,
          invoiced_at: currentData.invoiced_at,
          equipments: (currentData.connected_equipment as ConnectedEquipment[] | undefined)?.map((eq) => eq.id) || [],
          articles: (currentData.connected_articles as ConnectedArticle[] | undefined)?.map((art) => ({
            article_id: art.id,
            quantity: typeof art.quantity === 'number' ? art.quantity : 1
          })) || [],
          calendar_notes: calendarNotes,
        };
        await fetch(`/api/assistance-interventions/${selectedCalendarIntervento.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updatePayload),
        });
      } finally {
        setSavingCalendarNotes(false);
      }
    }, 800); // debounce 800ms
  };

  return (
    <div className="flex gap-6">
      {/* Lista Interventi da assegnare - Colonna sinistra */}
      <div className="w-fit min-w-[40vw] bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
          {/* Filtro zona */}
          <select
            value={selectedZone}
            onChange={e => setSelectedZone(e.target.value)}
            className="min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">Tutte le zone</option>
            {zones.map(zone => (
              <option key={zone.id} value={zone.id}>{zone.label}</option>
            ))}
          </select>
        </div>
        
        {/* Righe tabella senza header */}
        <div className="max-h-[600px] overflow-y-auto">
          {loadingInterventiDaAssegnare ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm">Caricamento interventi da assegnare...</p>
              </div>
            </div>
          ) : errorInterventiDaAssegnare ? (
            <div className="px-6 py-8 text-center text-red-500">
              <div className="text-sm">
                {errorInterventiDaAssegnare}
              </div>
              <button 
                onClick={fetchInterventiDaAssegnare}
                className="mt-2 px-3 py-1 text-sm text-teal-600 hover:text-teal-700 border border-teal-300 rounded hover:bg-teal-50"
              >
                Riprova
              </button>
            </div>
          ) : interventiDaAssegnare.length > 0 ? (
            interventiDaAssegnare
              .filter(intervento => !selectedZone || intervento.zona === (zones.find(z => z.id.toString() === selectedZone)?.label || ''))
              .map((intervento) => (
                <div
                  key={intervento.id}
                  className="px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition-all duration-300"
                >
                  {/* Prima riga: ID e Ragione sociale */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">#{intervento.id}</span>
                      <span className="text-sm text-gray-900">{intervento.ragioneSociale}</span>
                      
                      {/* Badge status */}
                      {intervento.statusLabel && (
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: intervento.statusColor || '#6B7280' }}
                        >
                          {intervento.statusLabel}
                        </span>
                      )}
                      
                      {/* Icona apertura nuova tab (ora attiva) */}
                      <div
                        title="Apri dettagli"
                        className="cursor-pointer"
                        onClick={() => window.open(`/interventi?ai=${intervento.id}`, '_blank')}
                      >
                        <ExternalLink 
                          size={14} 
                          className="text-gray-400 hover:text-teal-600 transition" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Seconda riga: Info aggiuntive */}
                  <div className="flex gap-4 mb-2 text-xs text-gray-500">
                    <span>Zona: {intervento.zona}</span>
                    <span>Data attuale: {intervento.data}</span>
                    <span>Tecnico attuale: {intervento.tecnico}</span>
                    {intervento.callCode && (
                      <span className="font-medium text-blue-600">
                        Codice: {intervento.callCode}
                      </span>
                    )}
                  </div>
                  
                  {/* Terza riga: Pulsante per aprire dialog */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <button
                        onClick={() => openDateTimeDialog(intervento.id)}
                        className="w-full text-sm text-gray-600 bg-white border border-gray-300 rounded px-3 py-2 text-left hover:bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 flex items-center justify-between"
                      >
                        <span>Seleziona data, orario e tecnico</span>
                        <Calendar size={16} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              <div className="text-sm">Nessun intervento da assegnare</div>
            </div>
          )}
        </div>
      </div>

      {/* Calendario - Colonna destra */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header del calendario + filtri */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Selettore settimana */}
          <div className="flex items-center gap-2 min-w-[220px]">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <h2 className="text-base font-medium text-gray-900 min-w-[120px] text-center">
              {getCurrentMonthYear()}
            </h2>
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
          {/* Filtri calendario */}
          <div className="flex flex-wrap gap-4 items-center relative">
            {/* Technician Multi-select */}
            <div className="relative technician-multi-select">
              <button
                type="button"
                className="min-w-[220px] px-2 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 flex items-center justify-between"
                onClick={() => setShowTechnicianMultiSelect((v) => !v)}
              >
                {calendarTechnicianFilter.length === 0
                  ? 'Tutti i tecnici'
                  : calendarTechnicianFilter.join(', ')}
                <ChevronDown className="ml-2 w-4 h-4 text-gray-400" />
              </button>
              {showTechnicianMultiSelect && (
                <div className="absolute right-0 z-30 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg min-w-[180px] max-h-60 overflow-y-auto">
                  <div className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                    onClick={() => setCalendarTechnicianFilter([])}
                  >
                    <input
                      type="checkbox"
                      checked={calendarTechnicianFilter.length === 0}
                      readOnly
                    />
                    <span className="text-gray-700">Tutti</span>
                  </div>
                  {calendarTechnicianOptions.map(tech => (
                    <div
                      key={tech}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                      onClick={() => {
                        if (calendarTechnicianFilter.includes(tech)) {
                          setCalendarTechnicianFilter(calendarTechnicianFilter.filter(t => t !== tech));
                        } else {
                          setCalendarTechnicianFilter([...calendarTechnicianFilter, tech]);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={calendarTechnicianFilter.includes(tech)}
                        readOnly
                      />
                      <span className="text-gray-700">{tech}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status Multi-select */}
            <div className="relative status-multi-select">
              <button
                type="button"
                className="min-w-[220px] px-2 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 flex items-center justify-between"
                onClick={() => setShowStatusMultiSelect((v) => !v)}
              >
                {calendarStatusFilter.length === 0
                  ? 'Tutti gli stati'
                  : calendarStatusFilter.join(', ')}
                <ChevronDown className="ml-2 w-4 h-4 text-gray-400" />
              </button>
              {showStatusMultiSelect && (
                <div className="absolute right-0 z-30 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg min-w-[180px] max-h-60 overflow-y-auto">
                  <div className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                    onClick={() => setCalendarStatusFilter([])}
                  >
                    <input
                      type="checkbox"
                      checked={calendarStatusFilter.length === 0}
                      readOnly
                    />
                    <span className="text-gray-700">Tutti</span>
                  </div>
                  {statusOptions.map(status => {
                    const isSelected = calendarStatusFilter.some(filterStatus => 
                      normalizeStatus(filterStatus) === normalizeStatus(status.label)
                    );
                    return (
                      <div
                        key={status.id}
                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                        onClick={() => {
                          if (isSelected) {
                            setCalendarStatusFilter(calendarStatusFilter.filter(s => 
                              normalizeStatus(s) !== normalizeStatus(status.label)
                            ));
                          } else {
                            setCalendarStatusFilter([...calendarStatusFilter, status.label]);
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                        />
                        <span className={`text-xs font-medium rounded-full px-2 py-1 ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Griglia del calendario */}
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Header giorni - Lunedì-Sabato */}
            <div className="grid grid-cols-7 border-b border-gray-200">
              <div className="p-4 bg-gray-50 border-r border-gray-200">
                <span className="text-sm font-medium text-gray-500">Orario</span>
              </div>
              {weekDays.map((day, index) => (
                <div key={day.toISOString()} className="p-4 bg-gray-50 border-r border-gray-200 last:border-r-0">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {dayNames[index]}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 mt-1">
                      {day.getDate()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Righe orari */}
            {timeSlots2.map((timeSlot) => (
              <div key={timeSlot} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0 relative">
                {/* Colonna orario */}
                <div className="p-0 bg-gray-50 border-r border-gray-200 flex items-start h-[80px] relative">
                  <span className="text-sm font-medium text-gray-600 absolute left-4 top-0 translate-y-[-50%] bg-gray-50 px-1">
                    {timeSlot}
                  </span>
                </div>
                
                {/* Colonne giorni */}
                {weekDays.map((day) => {
                  // Applica i filtri calendario
                  let dayInterventi = getInterventiForTimeSlot(day, timeSlot);
                  if (calendarTechnicianFilter.length > 0) {
                    dayInterventi = dayInterventi.filter(i => calendarTechnicianFilter.includes(i.tecnico));
                  }
                  
                  return (
                    <div key={`${day.toISOString()}-${timeSlot}`} className="relative p-2 border-r border-gray-200 last:border-r-0 min-h-[80px]">
                      {/* Mostra solo gli interventi che iniziano in questo slot */}
                      {dayInterventi.map((intervento, index) => {
                        const blockHeight = getBlockHeight(intervento);
                        const startTime = getTimeFromDatetime(intervento.from_datetime || '') || 
                          (intervento.orario === 'mattina' ? '08:00' : 
                           intervento.orario === 'pomeriggio' ? '14:00' : 
                           intervento.orario === 'tutto_il_giorno' ? '08:00' : timeSlot);
                        const endTime = getTimeFromDatetime(intervento.to_datetime || '') ||
                          (intervento.orario === 'mattina' ? '13:00' : 
                           intervento.orario === 'pomeriggio' ? '18:00' : 
                           intervento.orario === 'tutto_il_giorno' ? '18:00' : '—');
                        const duration = getInterventoDurationInHours(intervento);

                        // Badge-like: background chiaro, bordo e testo con statusColor
                        let backgroundColor = undefined;
                        let borderColor = undefined;
                        let textColor = undefined;
                        let fallbackClass = '';
                        if (intervento.statusColor) {
                          backgroundColor = hexToRgba(intervento.statusColor, 0.18);
                          borderColor = intervento.statusColor;
                          textColor = intervento.statusColor;
                        } else {
                          fallbackClass = getStatusColor(intervento.status);
                        }

                        return (
                          <div
                            key={intervento.id}
                            className={`absolute left-2 right-2 p-2 rounded text-xs cursor-pointer hover:opacity-90 shadow-md ${fallbackClass}`}
                            style={{
                              height: blockHeight,
                              top: `${8 + (index * 4)}px`,
                              zIndex: 20 + index,
                              border: borderColor ? `1.5px solid ${borderColor}` : '1px solid rgba(255,255,255,0.3)',
                              backgroundColor: backgroundColor,
                              color: textColor,
                              fontWeight: 500,
                            }}
                            title={`${intervento.ragioneSociale} - ${startTime} alle ${endTime} (${duration}h)`}
                            onClick={() => openCalendarInterventoDialog(intervento)}
                          >
                            {/* Tecnico in grande e grassetto */}
                            <div className="font-bold text-base leading-tight break-words">
                              {intervento.tecnico !== '-' ? intervento.tecnico : 'Non assegnato'}
                            </div>
                            {/* Orario grande */}
                            <div className="text-sm font-semibold mt-1 mb-1">
                              {startTime}-{endTime}
                            </div>
                            {/* Cliente piccolo dopo orario */}
                            <div className="text-xs font-medium break-words opacity-90 mb-1">
                              {intervento.ragioneSociale}
                            </div>
                            {/* Stato intervento sotto le info */}
                            <div className="text-xs font-semibold mt-1" style={{ color: intervento.statusColor || undefined }}>
                              {intervento.statusLabel || intervento.status}
                            </div>
                            {duration > 1 && (
                              <div className="absolute bottom-1 right-2 text-[10px] opacity-75 bg-black bg-opacity-20 px-1 rounded">
                                {duration}h
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dialog per selezione data e orario */}
      {showDateTimeDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={closeDateTimeDialog}
            ></div>

            {/* Dialog */}
            <div className="bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all h-[90vh] flex flex-col relative z-10 w-fit min-w-[60vw] max-w-4xl mx-auto">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Seleziona Data, Orario e Tecnico
                  </h3>
                  <button
                    onClick={closeDateTimeDialog}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Data e Orario affiancati - Solo se necessario */}
                  {(showDateSection || showTimeSection) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Data */}
                      {showDateSection && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Data
                          </label>
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                          />
                        </div>
                      )}

                      {/* Orario intervento */}
                      {showTimeSection && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Orario intervento
                          </label>
                          <select
                            value={selectedOrarioIntervento}
                            onChange={(e) => {
                              setSelectedOrarioIntervento(e.target.value);
                              // Reset campi ora quando si cambia tipo orario
                              if (e.target.value !== 'fascia_oraria') {
                                setSelectedOraInizio('');
                                setSelectedOraFine('');
                              }
                            }}
                            disabled={!selectedDate && showDateSection}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700 ${
                              (!selectedDate && showDateSection) ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
                            }`}
                          >
                            <option value="">Seleziona orario</option>
                            <option value="mattina">Mattina (8:00 - 13:00)</option>
                            <option value="pomeriggio">Pomeriggio (14:00 - 18:00)</option>
                            <option value="tutto_il_giorno">Tutto il giorno (8:00 - 18:00)</option>
                            <option value="fascia_oraria">Fascia oraria (personalizzata)</option>
                          </select>
                          
                          {/* Messaggio informativo */}
                          {!selectedDate && showDateSection && (
                            <p className="mt-1 text-xs text-gray-500">
                              💡 Seleziona prima una data per abilitare la scelta dell orario
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Campi condizionali per fascia oraria */}
                  {showTimeSection && selectedOrarioIntervento === 'fascia_oraria' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ora inizio
                        </label>
                        <input
                          type="time"
                          value={selectedOraInizio}
                          onChange={(e) => setSelectedOraInizio(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ora fine
                        </label>
                        <input
                          type="time"
                          value={selectedOraFine}
                          onChange={(e) => setSelectedOraFine(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sezione Tecnico */}
                  {showTechnicianSection && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tecnico di riferimento
                      </label>
                      <div className="relative technician-search-container">
                        <div className="relative">
                          <input
                            type="text"
                            value={technicianSearchQuery}
                            onChange={(e) => handleTechnicianSearchChange(e.target.value)}
                            onFocus={() => {
                              loadAllTechnicians();
                            }}
                            placeholder="Cerca tecnico..."
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                          />
                          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                          {isSearchingTechnicians && (
                            <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                              <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                        </div>
                        
                        {/* Dropdown con risultati */}
                        {showTechnicianDropdown && users.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {users.map((user) => (
                              <div
                                key={user.id}
                                onClick={() => handleTechnicianSelect(user)}
                                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-900">{user.name} {user.surname}</div>
                                <div className="text-sm text-gray-500">
                                  {user.email}
                                </div>
                                <div className="text-xs text-gray-400">
                                  Tel: {user.phone_number || 'N/A'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pulsanti fissi in basso */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                <button
                  onClick={confirmDateTime}
                  disabled={!isFormValid()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Conferma
                </button>
                <button
                  onClick={closeDateTimeDialog}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog dettaglio intervento calendario */}
      {showCalendarInterventoDialog && selectedCalendarIntervento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-3xl min-w-[70vw] p-0 relative flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Dettaglio intervento
                <button
                  className="ml-2 text-gray-700 hover:text-teal-700 flex items-center gap-1 text-xs font-medium"
                  title="Apri in nuova scheda"
                  onClick={() => window.open(`/interventi?ai=${selectedCalendarIntervento.id}`, '_blank')}
                >
                  <ExternalLink size={16} />
                  Apri
                </button>
              </h3>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={closeCalendarInterventoDialog}
              >
                <X size={24} />
              </button>
            </div>
            {/* Corpo */}
            <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CAMPO NOTE CALENDARIO */}
              <div className="col-span-2 mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Note calendario</label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-h-[60px]"
                  value={calendarNotes}
                  onChange={handleCalendarNotesChange}
                  placeholder="Aggiungi note per questo intervento..."
                />
                {savingCalendarNotes && (
                  <span className="text-xs text-gray-400 ml-2">Salvataggio...</span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Tecnico</span>
                  <span className="text-lg font-bold text-gray-800">{selectedCalendarIntervento.tecnico}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Cliente</span>
                  <span className="text-base font-medium text-gray-700">{selectedCalendarIntervento.ragioneSociale}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Zona</span>
                  <span className="text-base text-gray-700">{selectedCalendarIntervento.zona}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Status</span>
                  <span
                    className="inline-block px-2 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: selectedCalendarIntervento.statusColor ? hexToRgba(selectedCalendarIntervento.statusColor, 0.18) : '#f3f4f6',
                      color: selectedCalendarIntervento.statusColor || '#374151',
                    }}
                  >
                    {selectedCalendarIntervento.statusLabel || selectedCalendarIntervento.status}
                  </span>
                </div>
                {selectedCalendarIntervento.callCode && (
                  <div>
                    <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Codice chiamata</span>
                    <span className="text-base text-blue-700 font-mono">{selectedCalendarIntervento.callCode}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Data e Orario</span>
                  <span className="text-base text-gray-800 font-semibold">
                    {selectedCalendarIntervento.from_datetime ? new Date(selectedCalendarIntervento.from_datetime).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                    {selectedCalendarIntervento.to_datetime && (
                      <>
                        <span className="mx-1">→</span>
                        {new Date(selectedCalendarIntervento.to_datetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </>
                    )}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Durata</span>
                  <span className="text-base text-gray-800 font-semibold">
                    {selectedCalendarIntervento.from_datetime && selectedCalendarIntervento.to_datetime ?
                      (() => {
                        const start = new Date(selectedCalendarIntervento.from_datetime);
                        const end = new Date(selectedCalendarIntervento.to_datetime);
                        const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                        return `${diff}h`;
                      })() : '-'}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Fascia oraria</span>
                  <span className="text-base text-gray-700">{selectedCalendarIntervento.orario}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">ID Intervento</span>
                  <span className="text-base text-gray-700">#{selectedCalendarIntervento.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 