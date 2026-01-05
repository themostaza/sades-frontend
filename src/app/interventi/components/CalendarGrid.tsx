'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getStatusColor, statusOptions, toStatusKey } from '../../../utils/intervention-status';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useCalendarNotes } from '../../../hooks/useCalendarNotes';
import CalendarNoteDialog from './CalendarNoteDialog';
import { useAuth } from '../../../contexts/AuthContext';
import { CalendarNote } from '@/types/calendar-notes';


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
  manual_check?: boolean;
}

interface CalendarGridProps {
  viewMode: 'weekly' | 'daily';
  onViewModeChange: (mode: 'weekly' | 'daily') => void;
  currentWeek: Date;
  currentDate: Date;
  onWeekChange: (direction: 'prev' | 'next') => void;
  onDayChange: (direction: 'prev' | 'next' | 'set', date?: Date) => void;
  interventions: Intervento[];
  onInterventionClick: (intervention: Intervento) => void;
  // Filtri
  technicianFilter: string[];
  onTechnicianFilterChange: (filter: string[]) => void;
  statusFilter: string[];
  onStatusFilterChange: (filter: string[]) => void;
}

// statusOptions e toStatusKey importati da utils/intervention-status

// Fasce orarie
const timeSlots = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00'
];

export default function CalendarGrid({
  viewMode,
  onViewModeChange,
  currentWeek,
  currentDate,
  onWeekChange,
  onDayChange,
  interventions,
  onInterventionClick,
  technicianFilter,
  onTechnicianFilterChange,
  statusFilter,
  onStatusFilterChange
}: CalendarGridProps) {
  const [showTechnicianMultiSelect, setShowTechnicianMultiSelect] = useState(false);
  const [showStatusMultiSelect, setShowStatusMultiSelect] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  // Stato per gestire z-index dinamico degli interventi sovrapposti
  const [interventionZIndexes, setInterventionZIndexes] = useState<Record<string, number>>({});

  // Calendar Notes state
  const { notes, fetchNotes } = useCalendarNotes();
  const { token } = useAuth();
  const [techIdMap, setTechIdMap] = useState<Record<string, string>>({});
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedTechName, setSelectedTechName] = useState<string>('');
  const [selectedTechId, setSelectedTechId] = useState<string | undefined>(undefined);
  const [selectedNote, setSelectedNote] = useState<CalendarNote | null>(null);

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

  // Funzione per ottenere il mese e anno corrente
  const getCurrentMonthYear = () => {
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    const date = viewMode === 'weekly' ? currentWeek : currentDate;
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Funzione per ottenere la data formattata per la vista giornaliera
  const getCurrentDayFormatted = () => {
    const day = currentDate.getDate();
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return `${day} ${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  // Ottieni i tecnici unici dagli interventi per la vista giornaliera
  const getUniqueTechnicians = (): string[] => {
    const technicians = Array.from(new Set(
      interventions
        .map(i => i.tecnico)
        .filter(t => t && t !== '-')
    )).sort();
    
    // Se c'è un filtro attivo, restituisci solo i tecnici filtrati
    if (technicianFilter.length > 0) {
      const filtered = technicians.filter(t => technicianFilter.includes(t));
      return filtered.length > 0 ? filtered : ['Nessun tecnico'];
    }
    
    // Se non ci sono tecnici, mostra almeno una colonna placeholder
    return technicians.length > 0 ? technicians : ['Nessun tecnico'];
  };

  // Funzioni di normalizzazione status
  const normalizeStatus = (status: string): string => (status ? status.toLowerCase().trim() : '');
  // toStatusKey importata da utils



  // Funzione per ottenere gli interventi che iniziano in un time slot specifico
  const getInterventiForTimeSlot = (dayOrTechnician: Date | string, timeSlot: string): Intervento[] => {
    return interventions.filter(intervento => {
      // Filtra per tecnico se ci sono filtri attivi
      if (technicianFilter.length > 0 && !technicianFilter.includes(intervento.tecnico)) {
        return false;
      }

      // Filtra per status se ci sono filtri attivi
      if (statusFilter.length > 0) {
        const interventionStatus = normalizeStatus(intervento.statusLabel || intervento.status);
        const hasMatchingStatus = statusFilter.some(filterStatus => 
          normalizeStatus(filterStatus) === interventionStatus
        );
        
        if (!hasMatchingStatus) {
          return false;
        }
      }

      if (viewMode === 'weekly') {
        // Vista settimanale: filtra per giorno
        const dayString = (dayOrTechnician as Date).toISOString().split('T')[0];
        
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
      } else {
        // Vista giornaliera: filtra per tecnico e orario
        const technicianName = dayOrTechnician as string;
        
        // Controlla se l'intervento appartiene al tecnico
        if (intervento.tecnico !== technicianName) return false;
        
        // Controlla se l'intervento è nel giorno corrente
        const currentDayString = currentDate.toISOString().split('T')[0];
        
        if (intervento.from_datetime) {
          const interventionDay = intervento.from_datetime.substring(0, 10);
          const interventionTime = intervento.from_datetime.substring(11, 16);
          return interventionDay === currentDayString && interventionTime === timeSlot;
        }
        
        // Fallback con data parsing
        const interventionDate = new Date(intervento.data);
        const interventionDay = interventionDate.toISOString().split('T')[0];
        
        if (interventionDay !== currentDayString) return false;
        
        // Mappa i time_slot alle fasce orarie
        if (intervento.orario === 'mattina' && timeSlot === '08:00') return true;
        if (intervento.orario === 'pomeriggio' && timeSlot === '14:00') return true;
        if (intervento.orario === 'tutto_il_giorno' && timeSlot === '08:00') return true;
        
        return false;
      }
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

  // Funzione per ottenere l'ora da una stringa datetime
  const getTimeFromDatetime = (datetime: string): string => {
    if (!datetime) return '';
    // Prende solo la parte HH:MM dalla stringa ISO
    return datetime.substring(11, 16);
  };

  // Funzione per verificare se due interventi si sovrappongono temporalmente
  const doInterventsOverlap = (intervention1: Intervento, intervention2: Intervento): boolean => {
    if (!intervention1.from_datetime || !intervention1.to_datetime || 
        !intervention2.from_datetime || !intervention2.to_datetime) {
      return false;
    }
    
    const start1 = new Date(intervention1.from_datetime);
    const end1 = new Date(intervention1.to_datetime);
    const start2 = new Date(intervention2.from_datetime);
    const end2 = new Date(intervention2.to_datetime);
    
    return start1 < end2 && start2 < end1;
  };

  // Funzione per ottenere interventi sovrapposti in un time slot
  const getOverlappingInterventions = (dayOrTechnician: Date | string, timeSlot: string): Intervento[] => {
    const slotInterventions = getInterventiForTimeSlot(dayOrTechnician, timeSlot);
    const overlapping: Intervento[] = [];
    
    for (let i = 0; i < slotInterventions.length; i++) {
      for (let j = i + 1; j < slotInterventions.length; j++) {
        if (doInterventsOverlap(slotInterventions[i], slotInterventions[j])) {
          if (!overlapping.some(int => int.id === slotInterventions[i].id)) {
            overlapping.push(slotInterventions[i]);
          }
          if (!overlapping.some(int => int.id === slotInterventions[j].id)) {
            overlapping.push(slotInterventions[j]);
          }
        }
      }
    }
    
    return overlapping;
  };

  // Funzione per portare un intervento dietro agli altri
  const sendInterventionToBack = (interventionId: string) => {
    setInterventionZIndexes(prev => {
      const currentZIndex = prev[interventionId] || 20;
      // Diminuisce di 3, con minimo di 5
      const newZIndex = Math.max(5, currentZIndex - 3);
      return {
        ...prev,
        [interventionId]: newZIndex
      };
    });
  };

  // Funzione per portare un intervento in primo piano
  const bringInterventionToFront = (interventionId: string) => {
    setInterventionZIndexes(prev => {
      // Trova il z-index più alto attualmente in uso
      const maxZIndex = Math.max(
        20, // z-index base
        ...Object.values(prev)
      );
      return {
        ...prev,
        [interventionId]: maxZIndex + 1
      };
    });
  };

  // Funzione per ottenere il z-index di un intervento
  const getInterventionZIndex = (interventionId: string, defaultIndex: number): number => {
    return interventionZIndexes[interventionId] || (20 + defaultIndex);
  };

  // Funzione per calcolare il layout a colonne degli interventi sovrapposti (stile Google Calendar)
  const calculateInterventionLayout = (interventions: Intervento[]): Array<{intervention: Intervento, column: number, totalColumns: number}> => {
    if (interventions.length <= 1) {
      return interventions.map(intervention => ({ intervention, column: 0, totalColumns: 1 }));
    }

    // Ordina gli interventi per ora di inizio
    const sortedInterventions = [...interventions].sort((a, b) => {
      const timeA = a.from_datetime || a.data;
      const timeB = b.from_datetime || b.data;
      return new Date(timeA).getTime() - new Date(timeB).getTime();
    });

    // Array per tenere traccia delle colonne occupate
    const columns: Array<{endTime: Date, interventions: Intervento[]}> = [];
    const layout: Array<{intervention: Intervento, column: number, totalColumns: number}> = [];

    sortedInterventions.forEach(intervention => {
      const startTime = new Date(intervention.from_datetime || intervention.data);
      const endTime = new Date(intervention.to_datetime || intervention.data);

      // Trova la prima colonna libera
      let columnIndex = 0;
      for (let i = 0; i < columns.length; i++) {
        if (columns[i].endTime <= startTime) {
          columnIndex = i;
          break;
        }
        columnIndex = i + 1;
      }

      // Se non esiste la colonna, creala
      if (!columns[columnIndex]) {
        columns[columnIndex] = { endTime: new Date(0), interventions: [] };
      }

      // Aggiorna la colonna
      columns[columnIndex].endTime = endTime;
      columns[columnIndex].interventions.push(intervention);

      layout.push({
        intervention,
        column: columnIndex,
        totalColumns: Math.max(columns.length, columnIndex + 1)
      });
    });

    // Aggiorna totalColumns per tutti gli elementi
    const maxColumns = Math.max(...layout.map(item => item.totalColumns));
    return layout.map(item => ({ ...item, totalColumns: maxColumns }));
  };

  const weekDays = getWeekDays(currentWeek);
  const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

  // Opzioni tecnici disponibili nella settimana
  const technicianOptions = Array.from(new Set(interventions.map(i => i.tecnico).filter(t => t && t !== '-')));

  // Gestisce il click fuori dai dropdown per chiuderli
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.technician-multi-select') && !target.closest('.status-multi-select') && !target.closest('.date-picker-popover') && !target.closest('.date-picker-toggle')) {
        setShowTechnicianMultiSelect(false);
        setShowStatusMultiSelect(false);
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Gestisce i shortcuts da tastiera per cambiare vista
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignora se l'utente sta scrivendo in un input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'g':
          event.preventDefault();
          onViewModeChange('daily');
          break;
        case 's':
          event.preventDefault();
          onViewModeChange('weekly');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [onViewModeChange]);

  // When opening the popover, try to open the native date picker immediately
  useEffect(() => {
    if (showDatePicker && dateInputRef.current) {
      dateInputRef.current.focus();
      if (typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      }
    }
  }, [showDatePicker]);

  // Fetch calendar notes for the selected day in daily view
  useEffect(() => {
    if (viewMode !== 'daily') return;
    const day = currentDate.toISOString().split('T')[0];
    fetchNotes({ start_date: day, end_date: day, limit: 20, page: 1 });
  }, [viewMode, currentDate, fetchNotes]);

  // Build technician name -> id map from users
  useEffect(() => {
    if (viewMode !== 'daily') return;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/users?skip=200', { headers })
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: { data?: Array<{ id: string; name: string; surname: string }> }) => {
        const map: Record<string, string> = {};
        (data.data || []).forEach((u) => {
          const full = `${u.name} ${u.surname}`.trim();
          if (full) map[full] = u.id;
        });
        setTechIdMap(map);
      })
      .catch(() => {});
  }, [viewMode, token]);

  const openNoteDialog = (technician: string) => {
    const currentDayString = currentDate.toISOString().split('T')[0];
    const existing = notes.find(n => n.user_name === technician && (n.note_date || '').startsWith(currentDayString));
    setSelectedTechName(technician);
    setSelectedTechId(techIdMap[technician]);
    setSelectedNote(existing || null);
    setNoteDialogOpen(true);
  };

  const closeNoteDialog = () => {
    setNoteDialogOpen(false);
    // refetch notes for freshness
    const day = currentDate.toISOString().split('T')[0];
    fetchNotes({ start_date: day, end_date: day, limit: 20, page: 1 });
  };

  return (
    <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header del calendario + filtri */}
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Selettore modalità vista e navigazione */}
        <div className="flex items-center gap-4">
          {/* Selettore modalità vista */}
          <select
            value={viewMode}
            onChange={(e) => onViewModeChange(e.target.value as 'weekly' | 'daily')}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="weekly">S</option>
            <option value="daily">G</option>
          </select>

          {/* Navigazione */}
          <div className="flex items-center gap-2 min-w-[220px] relative">
            <button
              onClick={() => viewMode === 'weekly' ? onWeekChange('prev') : onDayChange('prev')}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              type="button"
              className="date-picker-toggle text-base font-medium text-gray-900 min-w-[120px] text-center hover:underline"
              onClick={() => setShowDatePicker(true)}
              title="Seleziona giornata"
            >
              {viewMode === 'weekly' ? getCurrentMonthYear() : getCurrentDayFormatted()}
            </button>
            <button
              onClick={() => viewMode === 'weekly' ? onWeekChange('next') : onDayChange('next')}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>

            {showDatePicker && (
              <div className="date-picker-popover absolute left-1/2 -translate-x-1/2 top-full mt-2 z-40 bg-white border border-gray-200 rounded shadow-md p-3">
                <input
                  type="date"
                  className="border rounded px-2 py-1 text-sm text-gray-700"
                  ref={dateInputRef}
                  value={currentDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) return;
                    const [y, m, d] = value.split('-').map(Number);
                    const newDate = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
                    onDayChange('set', new Date(newDate));
                    onViewModeChange('daily');
                    setShowDatePicker(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Filtri calendario */}
        <div className="flex flex-wrap gap-4 items-center relative">
          {/* Technician Multi-select */}
          <div className="relative technician-multi-select">
            <button
              type="button"
              className="px-2 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 flex items-center justify-between w-fit"
              onClick={() => setShowTechnicianMultiSelect((v) => !v)}
            >
              {technicianFilter.length === 0
                ? 'Tutti i tecnici'
                : technicianFilter.join(', ')}
              <ChevronDown className="ml-2 w-4 h-4 text-gray-400" />
            </button>
            {showTechnicianMultiSelect && (
              <div className="absolute right-0 z-30 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg min-w-[180px] max-h-60 overflow-y-auto">
                <div className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                  onClick={() => onTechnicianFilterChange([])}
                >
                  <input
                    type="checkbox"
                    checked={technicianFilter.length === 0}
                    readOnly
                  />
                  <span className="text-gray-700">Tutti</span>
                </div>
                {technicianOptions.map(tech => (
                  <div
                    key={tech}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                    onClick={() => {
                      if (technicianFilter.includes(tech)) {
                        onTechnicianFilterChange(technicianFilter.filter(t => t !== tech));
                      } else {
                        onTechnicianFilterChange([...technicianFilter, tech]);
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={technicianFilter.includes(tech)}
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
              className="w-fit px-2 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 flex items-center justify-between"
              onClick={() => setShowStatusMultiSelect((v) => !v)}
            >
              {statusFilter.length === 0
                ? 'Tutti gli stati'
                : statusFilter.join(', ')}
              <ChevronDown className="ml-2 w-4 h-4 text-gray-400" />
            </button>
            {showStatusMultiSelect && (
              <div className="absolute right-0 z-30 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg min-w-[180px] max-h-60 overflow-y-auto">
                <div className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                  onClick={() => onStatusFilterChange([])}
                >
                  <input
                    type="checkbox"
                    checked={statusFilter.length === 0}
                    readOnly
                  />
                  <span className="text-gray-700">Tutti</span>
                </div>
                {statusOptions.map(status => {
                  const isSelected = statusFilter.some(filterStatus => 
                    normalizeStatus(filterStatus) === normalizeStatus(status.label)
                  );
                  return (
                    <div
                      key={status.key}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                      onClick={() => {
                        if (isSelected) {
                          onStatusFilterChange(statusFilter.filter(s => 
                            normalizeStatus(s) !== normalizeStatus(status.label)
                          ));
                        } else {
                          onStatusFilterChange([...statusFilter, status.label]);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                      />
                      <span className={`text-xs font-medium rounded-full px-2 py-1 ${getStatusColor(status.key)}`}>
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
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {/* Indicatore scroll per vista giornaliera con molti tecnici */}
        {viewMode === 'daily' && getUniqueTechnicians().length > 6 && (
          <div className="text-xs text-gray-500 mb-2 px-4 flex items-center gap-2">
            <span>↔</span>
            <span>Scorri orizzontalmente per vedere tutti i {getUniqueTechnicians().length} tecnici</span>
          </div>
        )}
        <div className={viewMode === 'daily' ? `min-w-[${120 + (getUniqueTechnicians().length * 120)}px]` : "min-w-full"}>
          {viewMode === 'weekly' ? (
            /* Header giorni - Vista Settimanale */
            <div className="grid grid-cols-7 border-b border-gray-200">
              <div className="p-4 bg-gray-50 border-r border-gray-200">
                <span className="text-sm font-medium text-gray-500">Orario</span>
              </div>
              {weekDays.map((day, index) => (
                <button 
                  key={day.toISOString()} 
                  className="p-4 bg-gray-50 border-r border-gray-200 last:border-r-0 hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-inset"
                  onClick={() => {
                    // Imposta la data corrente al giorno cliccato
                    const newDate = new Date(day);
                    onDayChange('set', newDate);
                    // Passa alla vista giornaliera
                    onViewModeChange('daily');
                  }}
                  title={`Apri vista giornaliera per ${dayNames[index]} ${day.getDate()}`}
                >
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {dayNames[index]}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 mt-1">
                      {day.getDate()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Header tecnici - Vista Giornaliera */
            <div className={`grid border-b border-gray-200`} style={{gridTemplateColumns: `120px repeat(${getUniqueTechnicians().length}, minmax(120px, 1fr))`}}>
              <div className="p-4 bg-gray-50 border-r border-gray-200">
                <span className="text-sm font-medium text-gray-500">Orario</span>
              </div>
              {getUniqueTechnicians().map((technician, index) => (
                <div key={`${technician}-${index}`} className="p-3 bg-gray-50 border-r border-gray-200 last:border-r-0 min-w-[120px]">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900 truncate" title={technician}>
                      {technician}
                    </div>
                    <div className="mt-1 flex justify-center">
                      {(() => {
                        const day = currentDate.toISOString().split('T')[0];
                        const note = notes.find(n => n.user_name === technician && (n.note_date || '').startsWith(day));
                        if (note) {
                          const preview = note.note?.length > 24 ? `${note.note.substring(0, 24)}…` : note.note;
                          return (
                            <button
                              className="text-xs px-2 py-0.5 rounded border border-yellow-200 text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                              title={note.note}
                              onClick={() => openNoteDialog(technician)}
                            >
                              {preview || 'nota'}
                            </button>
                          );
                        }
                        return (
                          <button
                            className="text-xs text-gray-500 underline hover:text-gray-700"
                            onClick={() => openNoteDialog(technician)}
                            title="Crea nota"
                          >
                            nota
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Righe orari */}
          {timeSlots.map((timeSlot) => (
            <div 
              key={timeSlot} 
              className={viewMode === 'weekly' ? "grid grid-cols-7 border-b border-gray-200 last:border-b-0 relative" : "grid border-b border-gray-200 last:border-b-0 relative"}
              style={viewMode === 'daily' ? {gridTemplateColumns: `120px repeat(${getUniqueTechnicians().length}, minmax(120px, 1fr))`} : undefined}
            >
              {/* Colonna orario */}
              <div className="p-0 bg-gray-50 border-r border-gray-200 flex items-start h-[80px] relative">
                <span className="text-sm font-medium text-gray-600 absolute left-4 top-0 translate-y-[-50%] bg-gray-50 px-1">
                  {timeSlot}
                </span>
              </div>
              
              {/* Colonne giorni (vista settimanale) o tecnici (vista giornaliera) */}
              {viewMode === 'weekly' 
                ? weekDays.map((day) => {
                    const dayInterventi = getInterventiForTimeSlot(day, timeSlot);
                    const overlappingInterventi = getOverlappingInterventions(day, timeSlot);
                    
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
                          const isOverlapping = overlappingInterventi.some(ov => ov.id === intervento.id);
                          const zIndex = getInterventionZIndex(intervento.id, index);

                          // Background OPACO per evitare trasparenze
                          const statusKey = toStatusKey(intervento.statusLabel || intervento.status);
                          const badgeClasses = getStatusColor(statusKey);

                          // Deriva colori base dalle classi Tailwind del badge
                          const uses = {
                            'bg-orange-100 text-orange-800': { bg: 'rgba(254, 215, 170, 0.9)', border: '#fb923c', text: '#7c2d12' },
                            'bg-yellow-100 text-yellow-800': { bg: 'rgba(254, 240, 138, 0.9)', border: '#facc15', text: '#713f12' },
                            'bg-blue-100 text-blue-800': { bg: 'rgba(191, 219, 254, 0.9)', border: '#3b82f6', text: '#1e3a8a' },
                            'bg-cyan-100 text-cyan-800': { bg: 'rgba(207, 250, 254, 0.9)', border: '#06b6d4', text: '#155e75' },
                            'bg-teal-100 text-teal-800': { bg: 'rgba(204, 251, 241, 0.9)', border: '#14b8a6', text: '#134e4a' },
                            'bg-purple-100 text-purple-800': { bg: 'rgba(221, 214, 254, 0.9)', border: '#8b5cf6', text: '#3b0764' },
                            'bg-green-100 text-green-800': { bg: 'rgba(220, 252, 231, 0.9)', border: '#22c55e', text: '#14532d' },
                            'bg-gray-100 text-gray-800': { bg: 'rgba(243, 244, 246, 0.9)', border: '#9ca3af', text: '#1f2937' },
                            'bg-red-100 text-red-800': { bg: 'rgba(254, 202, 202, 0.9)', border: '#ef4444', text: '#7f1d1d' },
                            'bg-lime-100 text-lime-800': { bg: 'rgba(236, 252, 203, 0.9)', border: '#84cc16', text: '#365314' },
                            'bg-emerald-100 text-emerald-800': { bg: 'rgba(209, 250, 229, 0.9)', border: '#10b981', text: '#064e3b' },
                            'bg-indigo-100 text-indigo-800': { bg: 'rgba(224, 231, 255, 0.9)', border: '#6366f1', text: '#312e81' },
                          } as Record<string, { bg: string; border: string; text: string }>;

                          const color = uses[badgeClasses] || { bg: 'rgba(243, 244, 246, 0.9)', border: '#e5e7eb', text: '#374151' };
                          const backgroundColor = color.bg;
                          const borderColor = color.border;
                          const textColor = color.text;

                          return (
                            <div
                              key={intervento.id}
                              className="absolute left-2 right-2 rounded text-xs shadow-lg group"
                              style={{
                                height: blockHeight,
                                top: `${8 + (index * 4)}px`,
                                zIndex: zIndex,
                                border: `2px solid ${borderColor}`,
                                backgroundColor: backgroundColor,
                                color: textColor,
                                fontWeight: 500,
                              }}
                              title={`${intervento.ragioneSociale} - ${startTime} alle ${endTime} (${duration}h)`}
                            >
                              {/* Pulsante "Porta dietro" - visibile solo se c'è sovrapposizione */}
                              {isOverlapping && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sendInterventionToBack(intervento.id);
                                  }}
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition-colors z-10 opacity-0 group-hover:opacity-100"
                                  title="Porta dietro questo intervento"
                                >
                                  ↓
                                </button>
                              )}
                              
                              {/* Indicatore sovrapposizione */}
                              {isOverlapping && (
                                <div className="absolute top-1 left-1 w-2 h-2 bg-orange-400 rounded-full shadow-sm" title="Intervento sovrapposto"></div>
                              )}
                              
                              {/* Contenuto cliccabile */}
                              <div 
                                className="p-2 h-full cursor-pointer hover:opacity-90"
                                onClick={() => {
                                  bringInterventionToFront(intervento.id);
                                  onInterventionClick(intervento);
                                }}
                              >
                                {/* Tecnico in grande e grassetto */}
                                <div className="font-bold text-base leading-tight break-words">
                                  {intervento.tecnico !== '-' ? intervento.tecnico : 'Non assegnato'}
                                </div>
                                {/* Data e Orario */}
                                <div className="text-sm font-semibold mt-1 mb-1">
                                  {day.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} {startTime}-{endTime}
                                </div>
                                {/* Cliente piccolo dopo orario */}
                                <div className="text-xs font-medium break-words opacity-90 mb-1">
                                  {intervento.ragioneSociale}
                                </div>
                                {/* Stato intervento sotto le info */}
                                <div className="text-xs font-semibold mt-1">
                                  {intervento.statusLabel || intervento.status}
                                </div>
                                {/* Badge manual_check */}
                                {intervento.manual_check === false && (
                                  <span className="inline-flex px-2 py-0.5 mt-1 text-[10px] font-semibold rounded-full bg-red-100 text-red-800">
                                    non verificato!
                                  </span>
                                )}
                                {intervento.manual_check === true && (
                                  <span className="inline-flex px-2 py-0.5 mt-1 text-[10px] font-semibold rounded-full bg-green-100 text-green-800">
                                    Verificato.
                                  </span>
                                )}
                                {/* Note calendario */}
                                {intervento.calendar_notes && (
                                  <div className="text-[10px] mt-1 opacity-80 break-words line-clamp-2">
                                    {intervento.calendar_notes}
                                  </div>
                                )}
                                {duration > 1 && (
                                  <div className="absolute bottom-1 right-2 text-[10px] opacity-75 bg-black bg-opacity-30 px-1 rounded text-white">
                                    {duration}h
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                : /* Vista giornaliera - colonne tecnici */
                  getUniqueTechnicians().map((technician, techIndex) => {
                    // Costruisce il layout a colonne per TUTTI gli interventi della giornata di questo tecnico
                    const currentDayString = currentDate.toISOString().split('T')[0];
                    const techDayInterventi = interventions.filter((i) => {
                      if (i.tecnico !== technician) return false;
                      if (i.from_datetime) {
                        return i.from_datetime.substring(0, 10) === currentDayString;
                      }
                      try {
                        const d = new Date(i.data);
                        if (isNaN(d.getTime())) return false;
                        return d.toISOString().split('T')[0] === currentDayString;
                      } catch {
                        return false;
                      }
                    });
                    const techLayout = calculateInterventionLayout(techDayInterventi);
                    // In questa cella mostriamo SOLO gli interventi che iniziano in questo timeSlot,
                    // ma usando le colonne calcolate sull'intera giornata per gestire gli accavallamenti
                    const layoutData = techLayout.filter(({ intervention }) => {
                      const startTime = intervention.from_datetime
                        ? intervention.from_datetime.substring(11, 16)
                        : (intervention.orario === 'mattina'
                          ? '08:00'
                          : intervention.orario === 'pomeriggio'
                            ? '14:00'
                            : intervention.orario === 'tutto_il_giorno'
                              ? '08:00'
                              : timeSlot);
                      return startTime === timeSlot;
                    });
                    
                    return (
                      <div key={`${technician}-${timeSlot}-${techIndex}`} className="relative p-2 border-r border-gray-200 last:border-r-0 min-h-[80px] min-w-[120px]">
                        {/* Mostra gli interventi con layout a colonne stile Google Calendar */}
                        {layoutData.map(({ intervention: intervento, column, totalColumns }) => {
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

                          // Calcola posizione e larghezza per il layout a colonne
                          const columnWidth = totalColumns > 1 ? `${(100 / totalColumns) - 1}%` : 'calc(100% - 16px)';
                          const leftPosition = totalColumns > 1 ? `${(column * 100 / totalColumns) + 1}%` : '8px';

                          // Background OPACO per vista giornaliera
                          const statusKey = toStatusKey(intervento.statusLabel || intervento.status);
                          const badgeClasses = getStatusColor(statusKey);
                          const uses = {
                            'bg-orange-100 text-orange-800': { bg: 'rgba(254, 215, 170, 0.9)', border: '#fb923c', text: '#7c2d12' },
                            'bg-yellow-100 text-yellow-800': { bg: 'rgba(254, 240, 138, 0.9)', border: '#facc15', text: '#713f12' },
                            'bg-blue-100 text-blue-800': { bg: 'rgba(191, 219, 254, 0.9)', border: '#3b82f6', text: '#1e3a8a' },
                            'bg-cyan-100 text-cyan-800': { bg: 'rgba(207, 250, 254, 0.9)', border: '#06b6d4', text: '#155e75' },
                            'bg-teal-100 text-teal-800': { bg: 'rgba(204, 251, 241, 0.9)', border: '#14b8a6', text: '#134e4a' },
                            'bg-purple-100 text-purple-800': { bg: 'rgba(221, 214, 254, 0.9)', border: '#8b5cf6', text: '#3b0764' },
                            'bg-green-100 text-green-800': { bg: 'rgba(220, 252, 231, 0.9)', border: '#22c55e', text: '#14532d' },
                            'bg-gray-100 text-gray-800': { bg: 'rgba(243, 244, 246, 0.9)', border: '#9ca3af', text: '#1f2937' },
                            'bg-red-100 text-red-800': { bg: 'rgba(254, 202, 202, 0.9)', border: '#ef4444', text: '#7f1d1d' },
                            'bg-lime-100 text-lime-800': { bg: 'rgba(236, 252, 203, 0.9)', border: '#84cc16', text: '#365314' },
                            'bg-emerald-100 text-emerald-800': { bg: 'rgba(209, 250, 229, 0.9)', border: '#10b981', text: '#064e3b' },
                            'bg-indigo-100 text-indigo-800': { bg: 'rgba(224, 231, 255, 0.9)', border: '#6366f1', text: '#312e81' },
                          } as Record<string, { bg: string; border: string; text: string }>;
                          const color = uses[badgeClasses] || { bg: 'rgba(243, 244, 246, 0.9)', border: '#e5e7eb', text: '#374151' };
                          const backgroundColor = color.bg;
                          const borderColor = color.border;
                          const textColor = color.text;

                          return (
                            <div
                              key={intervento.id}
                              className="absolute rounded text-xs shadow-lg group"
                              style={{
                                height: blockHeight,
                                top: '8px',
                                left: leftPosition,
                                width: columnWidth,
                                zIndex: 20 + column,
                                border: `2px solid ${borderColor}`,
                                backgroundColor: backgroundColor,
                                color: textColor,
                                fontWeight: 500,
                              }}
                              title={`${intervento.ragioneSociale} - ${startTime} alle ${endTime} (${duration}h)`}
                            >
                              {/* Contenuto cliccabile */}
                              <div 
                                className="p-1.5 h-full cursor-pointer hover:opacity-90"
                                onClick={() => {
                                  bringInterventionToFront(intervento.id);
                                  onInterventionClick(intervento);
                                }}
                              >
                                {/* Cliente in grassetto - più compatto */}
                                <div className="text-sm font-light leading-tight break-words mb-1" title={intervento.ragioneSociale}>
                                  {intervento.ragioneSociale}
                                </div>
                                {/* Orario più compatto */}
                                <div className="text-sm mb-1">
                                  {startTime}-{endTime}
                                </div>
                                {/* Stato intervento compatto */}
                                <div className="text-sm font-light truncate" title={intervento.statusLabel || intervento.status}>
                                  {intervento.statusLabel || intervento.status}
                                </div>
                                {/* Badge manual_check */}
                                {intervento.manual_check === false && (
                                  <span className="inline-flex px-2 py-0.5 mt-1 text-[10px] font-semibold rounded-full bg-red-100 text-red-800">
                                    non verificato!
                                  </span>
                                )}
                                {intervento.manual_check === true && (
                                  <span className="inline-flex px-2 py-0.5 mt-1 text-[10px] font-semibold rounded-full bg-green-100 text-green-800">
                                    Verificato.
                                  </span>
                                )}
                                {/* Note calendario - solo se c'è spazio e una sola colonna */}
                                {intervento.calendar_notes && totalColumns === 1 && blockHeight > 80 && (
                                  <div className="text-[8px] mt-1 opacity-80 break-words line-clamp-1" title={intervento.calendar_notes}>
                                    {intervento.calendar_notes}
                                  </div>
                                )}
                                {duration > 1 && (
                                  <div className="absolute bottom-0.5 right-0.5 text-[8px] opacity-75 bg-black bg-opacity-40 px-1 rounded text-white">
                                    {duration}h
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
              }
            </div>
          ))}
        </div>
      </div>
      {noteDialogOpen && (
        <CalendarNoteDialog
          open={noteDialogOpen}
          onClose={closeNoteDialog}
          technicianName={selectedTechName}
          technicianId={selectedTechId}
          dateISO={currentDate.toISOString().split('T')[0]}
          existingNote={selectedNote}
        />
      )}
    </div>
  );
}

