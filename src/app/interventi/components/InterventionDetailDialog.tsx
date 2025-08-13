'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, ExternalLink, Search } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import type { ConnectedEquipment, ConnectedArticle } from '../../../types/assistance-interventions';

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

interface InterventionDetailDialogProps {
  isOpen: boolean;
  intervention: Intervento | null;
  onClose: () => void;
  onInterventionUpdate?: () => void;
}

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

export default function InterventionDetailDialog({ 
  isOpen, 
  intervention, 
  onClose,
  onInterventionUpdate
}: InterventionDetailDialogProps) {
  const initialWidth = () => {
    if (typeof window === 'undefined') return 0;
    const stored = window.localStorage.getItem('interventionDetailWidth');
    if (stored) {
      const val = parseInt(stored, 10);
      if (!isNaN(val)) return val;
    }
    const fallback = Math.round(window.innerWidth * 0.4);
    return Math.max(320, Math.min(fallback, Math.round(window.innerWidth * 0.85)));
  };
  const [panelWidth, setPanelWidth] = useState<number>(initialWidth);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const delta = e.clientX - startXRef.current;
    const newWidth = Math.max(320, Math.min(startWidthRef.current + delta, Math.round(window.innerWidth * 0.85)));
    setPanelWidth(newWidth);
  }, []);

  const onMouseUp = useCallback(() => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    try {
      window.localStorage.setItem('interventionDetailWidth', String(panelWidth));
    } catch {}
  }, [onMouseMove, panelWidth]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = panelWidth;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [onMouseMove, onMouseUp, panelWidth]);
  const [calendarNotes, setCalendarNotes] = useState<string>('');
  const [savingCalendarNotes, setSavingCalendarNotes] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const interventionDataDebounceTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Stati per la modifica di data/orario
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedOrarioIntervento, setSelectedOrarioIntervento] = useState('');
  const [selectedOraInizio, setSelectedOraInizio] = useState('');
  const [selectedOraFine, setSelectedOraFine] = useState('');
  
  // Stati per la selezione del tecnico
  const [technicianSearchQuery, setTechnicianSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [showTechnicianDropdown, setShowTechnicianDropdown] = useState(false);
  const [isSearchingTechnicians, setIsSearchingTechnicians] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<User | null>(null);
  
  // Stati per il salvataggio
  
  // Stati per i dati visualizzati (che si aggiornano localmente)
  const [displayData, setDisplayData] = useState<{
    tecnico: string;
    data: string;
    orario: string;
    from_datetime?: string;
    to_datetime?: string;
  }>({
    tecnico: '',
    data: '',
    orario: '',
  });

  // Stati per i dati aggiuntivi dell'intervento
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [connectedEquipment, setConnectedEquipment] = useState<ConnectedEquipment[]>([]);
  const [connectedArticles, setConnectedArticles] = useState<ConnectedArticle[]>([]);
  
  const auth = useAuth();

  // Quando si seleziona un intervento, carica i dati e inizializza i campi
  useEffect(() => {
    if (isOpen && intervention) {
      const fetchInterventionData = async () => {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (auth.token) {
            headers['Authorization'] = `Bearer ${auth.token}`;
          }
          const response = await fetch(`/api/assistance-interventions/${intervention.id}`, { headers });
          if (response.ok) {
            const data = await response.json();
            setCalendarNotes(data.calendar_notes || '');
            
            // Carica i dati aggiuntivi dell'intervento
            setInternalNotes(data.internal_notes || '');
            setConnectedEquipment(data.connected_equipment || []);
            setConnectedArticles(data.connected_articles || []);
            
            // Inizializza i campi di modifica con i dati attuali
            if (data.from_datetime) {
              const date = new Date(data.from_datetime);
              setSelectedDate(date.toISOString().split('T')[0]);
              setSelectedOraInizio(date.toTimeString().substring(0, 5));
            }
            
            if (data.to_datetime) {
              const date = new Date(data.to_datetime);
              setSelectedOraFine(date.toTimeString().substring(0, 5));
            }
            
            // Imposta il time_slot
            setSelectedOrarioIntervento(data.time_slot || '');
            
            // Imposta il tecnico se presente
            if (data.assigned_to) {
              // Cerca il tecnico tra quelli disponibili
              const technicianName = intervention.tecnico !== '-' ? intervention.tecnico : '';
              setTechnicianSearchQuery(technicianName);
              if (technicianName) {
                setSelectedTechnician({
                  id: data.assigned_to,
                  name: technicianName.split(' ')[0] || '',
                  surname: technicianName.split(' ').slice(1).join(' ') || '',
                  email: '',
                  phone_number: ''
                });
              }
            }
            
            // Inizializza i dati di visualizzazione
            setDisplayData({
              tecnico: intervention.tecnico,
              data: intervention.data,
              orario: intervention.orario,
              from_datetime: data.from_datetime,
              to_datetime: data.to_datetime,
            });
          } else {
            setCalendarNotes('');
            setInternalNotes('');
            setConnectedEquipment([]);
            setConnectedArticles([]);
          }
        } catch {
          setCalendarNotes('');
          setInternalNotes('');
          setConnectedEquipment([]);
          setConnectedArticles([]);
        }
      };
      fetchInterventionData();
    } else if (!isOpen) {
      // Reset quando si chiude
      setCalendarNotes('');
      setInternalNotes('');
      setConnectedEquipment([]);
      setConnectedArticles([]);
      setSelectedDate('');
      setSelectedOrarioIntervento('');
      setSelectedOraInizio('');
      setSelectedOraFine('');
      setTechnicianSearchQuery('');
      setSelectedTechnician(null);
      setUsers([]);
      setShowTechnicianDropdown(false);
      setDisplayData({
        tecnico: '',
        data: '',
        orario: '',
      });
    }
  }, [isOpen, intervention, auth.token]);

  // Funzione per cercare i tecnici
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

  // Gestisce la selezione di un tecnico
  const handleTechnicianSelect = (user: User) => {
    setSelectedTechnician(user);
    const fullName = user.surname ? `${user.name} ${user.surname}` : user.name;
    setTechnicianSearchQuery(fullName);
    setShowTechnicianDropdown(false);
  };

  // Gestisce il cambio del testo di ricerca tecnico
  const handleTechnicianSearchChange = (value: string) => {
    setTechnicianSearchQuery(value);
    
    if (!value.trim()) {
      setSelectedTechnician(null);
    }
  };

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

  // Funzione per autosalvataggio delle note con debounce
  const handleCalendarNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCalendarNotes(value);
    
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    
    debounceTimeout.current = setTimeout(async () => {
      if (!intervention) return;
      
      setSavingCalendarNotes(true);
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        }
        
        // Recupera i dati attuali per non sovrascrivere altri campi
        const getResponse = await fetch(`/api/assistance-interventions/${intervention.id}`, { headers });
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
          calendar_notes: value,
        };
        
        await fetch(`/api/assistance-interventions/${intervention.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updatePayload),
        });
      } finally {
        setSavingCalendarNotes(false);
      }
    }, 800); // debounce 800ms
  };

  // Funzione per salvare le modifiche di data, orario e tecnico
  const saveInterventionChanges = async () => {
    if (!intervention) return;
    
    //setSavingInterventionData(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }
      
      // Recupera i dati attuali per non sovrascrivere altri campi
      const getResponse = await fetch(`/api/assistance-interventions/${intervention.id}`, { headers });
      if (!getResponse.ok) return;
      
      const currentData = await getResponse.json();
      
      // Calcola from_datetime e to_datetime basandosi sui nuovi valori
      let from_datetime = currentData.from_datetime;
      let to_datetime = currentData.to_datetime;
      let time_slot = selectedOrarioIntervento || currentData.time_slot;
      
      if (selectedDate) {
        if (selectedOrarioIntervento === 'fascia_oraria' && selectedOraInizio && selectedOraFine) {
          // Fascia oraria personalizzata
          from_datetime = `${selectedDate}T${selectedOraInizio}:00`;
          to_datetime = `${selectedDate}T${selectedOraFine}:00`;
          time_slot = 'fascia_oraria';
        } else if (selectedOrarioIntervento) {
          // Fasce orarie predefinite
          switch (selectedOrarioIntervento) {
            case 'mattina':
              from_datetime = `${selectedDate}T08:00:00`;
              to_datetime = `${selectedDate}T13:00:00`;
              break;
            case 'pomeriggio':
              from_datetime = `${selectedDate}T14:00:00`;
              to_datetime = `${selectedDate}T18:00:00`;
              break;
            case 'tutto_il_giorno':
              from_datetime = `${selectedDate}T08:00:00`;
              to_datetime = `${selectedDate}T18:00:00`;
              break;
          }
          time_slot = selectedOrarioIntervento;
        }
      }
      
      // Prepara il payload SOLO con i campi previsti dallo swagger
      const updatePayload = {
        customer_id: currentData.customer_id,
        type_id: currentData.type_id,
        zone_id: currentData.zone_id,
        customer_location_id: currentData.customer_location_id,
        flg_home_service: currentData.flg_home_service,
        flg_discount_home_service: currentData.flg_discount_home_service,
        date: selectedDate || currentData.date,
        time_slot: time_slot,
        from_datetime: from_datetime,
        to_datetime: to_datetime,
        quotation_price: parseFloat(currentData.quotation_price) || 0,
        opening_hours: currentData.opening_hours || '',
        assigned_to: selectedTechnician?.id || currentData.assigned_to,
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
      
      const response = await fetch(`/api/assistance-interventions/${intervention.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatePayload),
      });
      
      if (response.ok) {
        // Aggiorna i dati di visualizzazione localmente
        const updatedTechnicianName = selectedTechnician ? 
          (selectedTechnician.surname ? `${selectedTechnician.name} ${selectedTechnician.surname}` : selectedTechnician.name) : 
          displayData.tecnico;
        
        let updatedData = displayData.data;
        let updatedOrario = displayData.orario;
        let updatedFromDatetime = displayData.from_datetime;
        let updatedToDatetime = displayData.to_datetime;
        
        // Aggiorna data e orario se modificati
        if (selectedDate) {
          const dateObj = new Date(selectedDate);
          updatedData = dateObj.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short'
          });
          
          if (selectedOrarioIntervento === 'fascia_oraria' && selectedOraInizio && selectedOraFine) {
            updatedOrario = `${selectedOraInizio}-${selectedOraFine}`;
            updatedFromDatetime = `${selectedDate}T${selectedOraInizio}:00`;
            updatedToDatetime = `${selectedDate}T${selectedOraFine}:00`;
          } else if (selectedOrarioIntervento) {
            switch (selectedOrarioIntervento) {
              case 'mattina':
                updatedOrario = 'Mattina (8:00 - 13:00)';
                updatedFromDatetime = `${selectedDate}T08:00:00`;
                updatedToDatetime = `${selectedDate}T13:00:00`;
                break;
              case 'pomeriggio':
                updatedOrario = 'Pomeriggio (14:00 - 18:00)';
                updatedFromDatetime = `${selectedDate}T14:00:00`;
                updatedToDatetime = `${selectedDate}T18:00:00`;
                break;
              case 'tutto_il_giorno':
                updatedOrario = 'Tutto il giorno (8:00 - 18:00)';
                updatedFromDatetime = `${selectedDate}T08:00:00`;
                updatedToDatetime = `${selectedDate}T18:00:00`;
                break;
            }
          }
        }
        
        setDisplayData({
          tecnico: updatedTechnicianName,
          data: updatedData,
          orario: updatedOrario,
          from_datetime: updatedFromDatetime,
          to_datetime: updatedToDatetime,
        });
        
        // Notifica il padre delle modifiche senza chiudere il dialog
        if (onInterventionUpdate) {
          onInterventionUpdate();
        }
      }
    } catch (error) {
      console.error('Errore nel salvare le modifiche:', error);
    } finally {
      //setSavingInterventionData(false);
    }
  };

  // Effetto per autosalvataggio quando cambiano i dati dell'intervento
  useEffect(() => {
    if (!intervention) return;
    
    // Solo se ci sono modifiche effettive
    if (selectedDate || selectedOrarioIntervento || selectedTechnician) {
      if (interventionDataDebounceTimeout.current) {
        clearTimeout(interventionDataDebounceTimeout.current);
      }
      
      interventionDataDebounceTimeout.current = setTimeout(async () => {
        await saveInterventionChanges();
      }, 1000); // debounce 1 secondo
    }
    
    return () => {
      if (interventionDataDebounceTimeout.current) {
        clearTimeout(interventionDataDebounceTimeout.current);
      }
    };
  }, [selectedDate, selectedOrarioIntervento, selectedOraInizio, selectedOraFine, selectedTechnician]);

  // Cleanup dei timeout quando il componente si smonta
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      if (interventionDataDebounceTimeout.current) {
        clearTimeout(interventionDataDebounceTimeout.current);
      }
    };
  }, []);

  if (!isOpen || !intervention) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black bg-opacity-40">
      <div className="bg-white shadow-2xl h-full p-0 relative flex flex-col overflow-hidden transform transition-transform duration-300 ease-in-out" style={{ width: panelWidth }}>
        <div
          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize z-20 hover:bg-teal-200"
          onMouseDown={startResize}
          title="Trascina per ridimensionare"
        />
        {/* Sidebar content */}
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-lg font-bold">{intervention.ragioneSociale}</span>
              <span className="text-sm font-normal text-gray-500">ID #{intervention.id}</span>
            </div>
            <button
              className="ml-2 text-gray-700 hover:text-teal-700 flex items-center gap-1 text-xs font-medium"
              title="Apri in nuova scheda"
              onClick={() => window.open(`/interventi?ai=${intervention.id}`, '_blank')}
            >
              <ExternalLink size={16} />
              Apri
            </button>
          </h3>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Corpo */}
        <div className="px-8 py-2 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto flex-1">
          {/* CAMPO NOTE CALENDARIO */}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Note calendario</label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-h-[60px]"
              value={calendarNotes}
              onChange={handleCalendarNotesChange}
              placeholder="Aggiungi note per questo intervento..."
            />
            {savingCalendarNotes && (
              <span className="text-xs text-gray-400 ml-2"></span>
            )}
          </div>

          {/* NOTE INTERNE DELL'INTERVENTO */}
          {internalNotes && (
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Note interne</label>
              <div className="w-full border border-gray-200 rounded-md px-3 py-2 text-gray-700 bg-gray-50 min-h-[60px] whitespace-pre-wrap">
                {internalNotes}
              </div>
            </div>
          )}

          {/* SEZIONE MODIFICA DATA E ORARIO */}
          <div className="col-span-2 border-gray-200 pt-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Data */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                />
              </div>

              {/* Orario intervento */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Orario intervento</label>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                >
                  <option value="">Seleziona orario</option>
                  <option value="mattina">Mattina (8:00 - 13:00)</option>
                  <option value="pomeriggio">Pomeriggio (14:00 - 18:00)</option>
                  <option value="tutto_il_giorno">Tutto il giorno (8:00 - 18:00)</option>
                  <option value="fascia_oraria">Fascia oraria (personalizzata)</option>
                </select>
              </div>
            </div>

            {/* Campi condizionali per fascia oraria */}
            {selectedOrarioIntervento === 'fascia_oraria' && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ora inizio</label>
                  <input
                    type="time"
                    value={selectedOraInizio}
                    onChange={(e) => setSelectedOraInizio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ora fine</label>
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
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Tecnico di riferimento</label>
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
          </div>

          {/* ATTREZZATURE COLLEGATE */}
          {connectedEquipment.length > 0 && (
            <div className="col-span-2 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Attrezzature collegate ({connectedEquipment.length})</h4>
              <div className="grid gap-3">
                {connectedEquipment.map((equipment) => (
                  <div key={equipment.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 mb-1">
                          {equipment.model}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          {equipment.description}
                        </div>
                        {equipment.serial_number && (
                          <div className="text-xs text-gray-500 font-mono">
                            S/N: {equipment.serial_number}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 ml-3">
                        ID: {equipment.id}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ARTICOLI/PEZZI DI RICAMBIO */}
          {connectedArticles.length > 0 && (
            <div className="col-span-2 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Pezzi di ricambio ({connectedArticles.length})</h4>
              <div className="grid gap-3">
                {connectedArticles.map((article) => (
                  <div key={article.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 mb-1">
                          {article.short_description} ({article.quantity})
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          {article.description}
                        </div>
                        {article.pnc_code && (
                          <div className="text-xs text-gray-500 font-mono">
                            PNC: {article.pnc_code}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 ml-3">
                        ID: {article.id}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <div>
              <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Tecnico</span>
              <span className="text-lg font-bold text-gray-800">{displayData.tecnico}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Cliente</span>
              <span className="text-base font-medium text-gray-700">{intervention.ragioneSociale}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Zona</span>
              <span className="text-base text-gray-700">{intervention.zona}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Status</span>
              <span
                className="inline-block px-2 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: intervention.statusColor ? hexToRgba(intervention.statusColor, 0.18) : '#f3f4f6',
                  color: intervention.statusColor || '#374151',
                }}
              >
                {intervention.statusLabel || intervention.status}
              </span>
            </div>
            {intervention.callCode && (
              <div>
                <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Codice chiamata</span>
                <span className="text-base text-blue-700 font-mono">{intervention.callCode}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div>
              <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Data e Orario</span>
              <span className="text-base text-gray-800 font-semibold">
                {displayData.from_datetime ? new Date(displayData.from_datetime).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                {displayData.to_datetime && (
                  <>
                    <span className="mx-1">→</span>
                    {new Date(displayData.to_datetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </>
                )}
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Durata</span>
              <span className="text-base text-gray-800 font-semibold">
                {displayData.from_datetime && displayData.to_datetime ?
                  (() => {
                    const start = new Date(displayData.from_datetime);
                    const end = new Date(displayData.to_datetime);
                    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    return `${diff}h`;
                  })() : '-'}
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">ID Intervento</span>
              <span className="text-base text-gray-700">#{intervention.id}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Area cliccabile per chiudere la sidebar */}
      <div 
        className="flex-1 cursor-pointer" 
        onClick={onClose}
        title="Clicca per chiudere"
      ></div>
    </div>
  );
}
