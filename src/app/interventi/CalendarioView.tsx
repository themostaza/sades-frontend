'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X, Search, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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
}

interface CalendarioViewProps {
  interventi: Intervento[];
}

export default function CalendarioView({ interventi }: CalendarioViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // Stati per gli interventi del calendario (interni)
  const [interventiCalendario, setInterventiCalendario] = useState<Intervento[]>(interventi);
  
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

  const auth = useAuth();

  // Funzione per fetchare gli interventi del calendario
  const fetchInterventiCalendario = useCallback(async () => {
    try {
      
      const params = new URLSearchParams({
        skip: '500', // Numero elevato per evitare paginazione
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
        throw new Error('Failed to fetch calendar interventions data');
      }
      
      const data: ApiResponse<InterventionFromApi> = await response.json();
      
      // Converte nel formato atteso dal calendario (tutti gli interventi)
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
      console.log('✅ Interventi calendario refreshati:', convertedInterventi.length);
      
    } catch (err) {
      console.error('Error fetching calendar interventions:', err);
    } finally {
    }
  }, [auth.token, auth.logout]);

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
  }, [auth.token]);

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
        
        // Restituisce true se almeno uno dei campi è vuoto
        return hasEmptyAssignedToName || hasEmptyDate || hasEmptyFromDate || hasEmptyToDate;
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
  }, [auth.token, auth.logout]);

  // Hook per caricare gli interventi da assegnare al mount
  useEffect(() => {
    fetchInterventiDaAssegnare();
  }, [fetchInterventiDaAssegnare]);

  // Sincronizza interventiCalendario con la prop interventi
  useEffect(() => {
    console.log('🔄 Sincronizzazione interventi calendario:', interventi.length, 'interventi ricevuti');
    console.log('📋 Primi 3 interventi:', interventi.slice(0, 3));
    setInterventiCalendario(interventi);
  }, [interventi]);

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
    if (!currentInterventoId || !selectedDate || !selectedOrarioIntervento) {
      return;
    }

    // Verifica che ci sia un tecnico selezionato se la sezione tecnico è visibile
    if (showTechnicianSection && !selectedTechnicianInDialog) {
      alert('Seleziona un tecnico prima di confermare.');
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

      // Step 2: Prepara i dati dell'assegnazione
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
          return;
      }

      // Step 3: Mappa i dati dal dialog ai campi API
      const assignmentData = parseAssignmentString(formattedAssignment);
      
      // Determina l'ID del tecnico (se la sezione tecnico è visibile)
      let technicianId = currentData.assigned_to; // Mantieni quello esistente di default
      if (showTechnicianSection && selectedTechnicianInDialog) {
        technicianId = selectedTechnicianInDialog.id;
      }
      
      // Costruisci il body della PUT request con tutti i campi esistenti + le modifiche
      const updatePayload = {
        customer_id: currentData.customer_id,
        type_id: currentData.type_id,
        zone_id: currentData.zone_id,
        customer_location_id: currentData.customer_location_id,
        flg_home_service: currentData.flg_home_service,
        flg_discount_home_service: currentData.flg_discount_home_service,
        // I nuovi dati dal dialog
        date: assignmentData.date,
        time_slot: assignmentData.time_slot,
        from_datetime: assignmentData.from_datetime,
        to_datetime: assignmentData.to_datetime,
        quotation_price: parseFloat(currentData.quotation_price) || 0,
        opening_hours: currentData.opening_hours || '',
        assigned_to: technicianId,
        call_code: currentData.call_code,
        internal_notes: currentData.internal_notes || '',
        status_id: currentData.status_id,
        // Mantieni equipments e articles esistenti
        equipments: currentData.connected_equipment?.map((eq) => eq.id) || [],
        articles: currentData.connected_articles?.map((art) => ({
          article_id: art.id.toString(),
          quantity: 1
        })) || []
      };

      console.log('📤 Payload PUT:', updatePayload);

      // Step 4: Salva i dati con PUT
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

      // Step 5: Chiudi il dialog e ricarica i dati
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
    if (!selectedDate || !selectedOrarioIntervento) return false;
    
    if (selectedOrarioIntervento === 'fascia_oraria') {
      if (!selectedOraInizio || !selectedOraFine) return false;
    }
    
    // Se la sezione tecnico è visibile, deve essere selezionato un tecnico
    if (showTechnicianSection && !selectedTechnicianInDialog) return false;
    
    return true;
  };

  // Funzione per ottenere l'ora da una stringa datetime
  const getTimeFromDatetime = (datetime: string): string => {
    if (!datetime) return '';
    try {
      const date = new Date(datetime);
      return date.toTimeString().substring(0, 5); // Format: "HH:MM"
    } catch {
      return '';
    }
  };


  // Funzione per ottenere gli interventi che iniziano in un time slot specifico
  const getInterventiForTimeSlot = (day: Date, timeSlot: string): Intervento[] => {
    const dayString = day.getDate().toString();
    
    // DEBUG: Versione più permissiva - mostra tutti gli interventi del giorno nel primo slot
    if (timeSlot === '08:00') {
      const allDayInterventions = interventiCalendario.filter(intervento => {
        const matchesDay = intervento.data.includes(dayString);
        if (matchesDay) {
          console.log(`🔍 DEBUG: Intervento ${intervento.id} trovato per giorno ${dayString}:`, intervento);
        }
        return matchesDay;
      });
      console.log(`📊 DEBUG: Totale interventi per giorno ${dayString}:`, allDayInterventions.length);
      return allDayInterventions;
    }
    
    return []; // Per ora mostra solo nel primo slot per debug
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

  // Genera solo i giorni lavorativi della settimana corrente (Lunedì-Venerdì)
  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Lunedì come primo giorno
    startOfWeek.setDate(diff);

    // Solo 5 giorni lavorativi (Lunedì-Venerdì)
    for (let i = 0; i < 5; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const weekDays = getWeekDays(currentWeek);
  const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];

  // Fasce orarie
  const timeSlots2 = [
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
    '18:00'
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

  return (
    <div className="flex gap-6">
      {/* Lista Interventi da assegnare - Colonna sinistra */}
      <div className="w-fit min-w-[40vw] bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Interventi da assegnare</h3>
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
            interventiDaAssegnare.map((intervento) => (
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
                    
                    {/* Icona apertura nuova tab (non attiva) */}
                    <div title="Apri dettagli (non disponibile)">
                      <ExternalLink 
                        size={14} 
                        className="text-gray-400 cursor-not-allowed opacity-50" 
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
        {/* Header del calendario */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          
          <h2 className="text-lg font-medium text-gray-900">
            {getCurrentMonthYear()}
          </h2>
          
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Griglia del calendario */}
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Header giorni - Solo Lunedì-Venerdì */}
            <div className="grid grid-cols-6 border-b border-gray-200">
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
              <div key={timeSlot} className="grid grid-cols-6 border-b border-gray-200 last:border-b-0">
                {/* Colonna orario */}
                <div className="p-4 bg-gray-50 border-r border-gray-200 flex items-center">
                  <span className="text-sm font-medium text-gray-600">{timeSlot}</span>
                </div>
                
                {/* Colonne giorni */}
                {weekDays.map((day) => {
                  const dayInterventi = getInterventiForTimeSlot(day, timeSlot);
                  
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
                        
                        return (
                          <div
                            key={intervento.id}
                            className={`absolute left-2 right-2 ${getStatusColor(intervento.status)} text-white p-2 rounded text-xs cursor-pointer hover:opacity-80 shadow-md`}
                            style={{
                              height: blockHeight,
                              top: `${8 + (index * 4)}px`, // Offset leggermente diverso per più interventi
                              zIndex: 20 + index,
                              border: '1px solid rgba(255,255,255,0.3)'
                            }}
                            title={`${intervento.ragioneSociale} - ${startTime} alle ${endTime} (${duration}h)`}
                          >
                            <div className="font-medium truncate text-xs">
                              {intervento.ragioneSociale}
                            </div>
                            <div className="truncate opacity-90 text-[10px] mt-1">
                              {intervento.tecnico !== '-' ? intervento.tecnico : 'Non assegnato'}
                            </div>
                            {duration > 1 && (
                              <div className="absolute bottom-1 right-2 text-[10px] opacity-75 bg-black bg-opacity-20 px-1 rounded">
                                {duration}h
                              </div>
                            )}
                            <div className="text-[9px] opacity-75 mt-1">
                              {startTime}-{endTime}
                            </div>
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
    </div>
  );
} 