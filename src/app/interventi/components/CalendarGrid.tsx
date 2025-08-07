'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

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
  // Stato per gestire z-index dinamico degli interventi sovrapposti
  const [interventionZIndexes, setInterventionZIndexes] = useState<Record<string, number>>({});

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
    
    // Se non ci sono tecnici, mostra almeno una colonna placeholder
    return technicians.length > 0 ? technicians : ['Nessun tecnico'];
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
          <div className="flex items-center gap-2 min-w-[220px]">
            <button
              onClick={() => viewMode === 'weekly' ? onWeekChange('prev') : onDayChange('prev')}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <h2 className="text-base font-medium text-gray-900 min-w-[120px] text-center">
              {viewMode === 'weekly' ? getCurrentMonthYear() : getCurrentDayFormatted()}
            </h2>
            <button
              onClick={() => viewMode === 'weekly' ? onWeekChange('next') : onDayChange('next')}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
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
                      key={status.id}
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
            <div className={`grid border-b border-gray-200`} style={{gridTemplateColumns: `120px repeat(${getUniqueTechnicians().length}, 1fr)`}}>
              <div className="p-4 bg-gray-50 border-r border-gray-200">
                <span className="text-sm font-medium text-gray-500">Orario</span>
              </div>
              {getUniqueTechnicians().map((technician, index) => (
                <div key={`${technician}-${index}`} className="p-4 bg-gray-50 border-r border-gray-200 last:border-r-0">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900 truncate" title={technician}>
                      {technician}
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
              style={viewMode === 'daily' ? {gridTemplateColumns: `120px repeat(${getUniqueTechnicians().length}, 1fr)`} : undefined}
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
                          let backgroundColor = '#ffffff';
                          let borderColor = '#e5e7eb';
                          let textColor = '#374151';
                          
                          if (intervento.statusColor) {
                            backgroundColor = hexToRgba(intervento.statusColor, 0.9); // Opacità alta
                            borderColor = intervento.statusColor;
                            textColor = '#ffffff'; // Testo bianco per contrasto
                          } else {
                            // Colori di fallback opachi
                            switch (intervento.status) {
                              case 'In carico':
                                backgroundColor = '#3b82f6';
                                textColor = '#ffffff';
                                break;
                              case 'Completato':
                                backgroundColor = '#ec4899';
                                textColor = '#ffffff';
                                break;
                              case 'Da assegnare':
                                backgroundColor = '#10b981';
                                textColor = '#ffffff';
                                break;
                              default:
                                backgroundColor = '#6b7280';
                                textColor = '#ffffff';
                            }
                          }

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
                    const technicianInterventi = getInterventiForTimeSlot(technician, timeSlot);
                    const layoutData = calculateInterventionLayout(technicianInterventi);
                    
                    return (
                      <div key={`${technician}-${timeSlot}-${techIndex}`} className="relative p-2 border-r border-gray-200 last:border-r-0 min-h-[80px]">
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
                          let backgroundColor = '#ffffff';
                          let borderColor = '#e5e7eb';
                          let textColor = '#374151';
                          
                          if (intervento.statusColor) {
                            backgroundColor = hexToRgba(intervento.statusColor, 0.9);
                            borderColor = intervento.statusColor;
                            textColor = '#ffffff';
                          } else {
                            // Colori di fallback opachi
                            switch (intervento.status) {
                              case 'In carico':
                                backgroundColor = '#3b82f6';
                                textColor = '#ffffff';
                                break;
                              case 'Completato':
                                backgroundColor = '#ec4899';
                                textColor = '#ffffff';
                                break;
                              case 'Da assegnare':
                                backgroundColor = '#10b981';
                                textColor = '#ffffff';
                                break;
                              default:
                                backgroundColor = '#6b7280';
                                textColor = '#ffffff';
                            }
                          }

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
                                className="p-2 h-full cursor-pointer hover:opacity-90"
                                onClick={() => {
                                  bringInterventionToFront(intervento.id);
                                  onInterventionClick(intervento);
                                }}
                              >
                                {/* Cliente in grande e grassetto */}
                                <div className="font-bold text-sm leading-tight break-words">
                                  {intervento.ragioneSociale}
                                </div>
                                {/* Data e Orario */}
                                <div className="text-xs font-semibold mt-1 mb-1">
                                  {currentDate.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} {startTime}-{endTime}
                                </div>
                                {/* Stato intervento sotto le info */}
                                <div className="text-xs font-semibold mt-1">
                                  {intervento.statusLabel || intervento.status}
                                </div>
                                {/* Note calendario - solo se c'è spazio */}
                                {intervento.calendar_notes && totalColumns <= 2 && (
                                  <div className="text-[10px] mt-1 opacity-80 break-words line-clamp-1">
                                    {intervento.calendar_notes}
                                  </div>
                                )}
                                {duration > 1 && (
                                  <div className="absolute bottom-1 right-1 text-[10px] opacity-75 bg-black bg-opacity-30 px-1 rounded text-white">
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
    </div>
  );
}
