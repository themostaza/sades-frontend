'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useInterventions } from './hooks/useInterventions';
import InterventionsList from './components/InterventionsList';
import CalendarGrid from './components/CalendarGrid';
import DateTimeDialog from './components/DateTimeDialog';
import InterventionDetailDialog from './components/InterventionDetailDialog';

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

interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone_number: string;
}

export default function CalendarioView() {
  // Stati locali per la vista calendario
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isInterventionsListCollapsed, setIsInterventionsListCollapsed] = useState(false);

  // Hook personalizzato per la gestione degli interventi
  const {
    currentWeek,
    interventiCalendario,
    interventiDaAssegnare,
    loadingInterventiDaAssegnare,
    errorInterventiDaAssegnare,
    zones,
    navigateWeek,
    navigateDay,
    fetchInterventiDaAssegnare,
    fetchInterventiCalendario,
    saveIntervention
  } = useInterventions(viewMode, currentDate);

  // Stati locali per i dialog e filtri
  const [showDateTimeDialog, setShowDateTimeDialog] = useState(false);
  const [currentInterventoId, setCurrentInterventoId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedCalendarIntervento, setSelectedCalendarIntervento] = useState<Intervento | null>(null);
  const [showCalendarInterventoDialog, setShowCalendarInterventoDialog] = useState(false);
  const [calendarTechnicianFilter, setCalendarTechnicianFilter] = useState<string[]>([]);
  const [calendarStatusFilter, setCalendarStatusFilter] = useState<string[]>([]);

  // Funzioni per gestire i dialog
  const openDateTimeDialog = (interventionId: string) => {
    
    setCurrentInterventoId(interventionId);
    setShowDateTimeDialog(true);
    
    // Pre-popola i dati se disponibili (questa logica è ora nel DateTimeDialog)
  };

  const closeDateTimeDialog = () => {
    setShowDateTimeDialog(false);
    setCurrentInterventoId(null);
  };

  const handleDateTimeConfirm = async (data: {
    interventionId: string;
    selectedDate?: string;
    selectedOrarioIntervento?: string;
    selectedOraInizio?: string;
    selectedOraFine?: string;
    selectedTechnician?: User;
    showDateSection: boolean;
    showTimeSection: boolean;
    showTechnicianSection: boolean;
  }) => {
    try {
      await saveIntervention(data);
      closeDateTimeDialog();
    } catch {
      // L'errore è già gestito nel hook
    }
  };

  const openCalendarInterventoDialog = (intervention: Intervento) => {
    setSelectedCalendarIntervento(intervention);
    setShowCalendarInterventoDialog(true);
  };

  const closeCalendarInterventoDialog = () => {
    setShowCalendarInterventoDialog(false);
    setSelectedCalendarIntervento(null);
  };

  // Funzione per gestire l'aggiornamento di un intervento
  const handleInterventionUpdate = () => {
    // Ricarica i dati degli interventi per riflettere le modifiche nel calendario
    fetchInterventiCalendario();
    // Ricarica anche gli interventi da assegnare nel caso l'intervento sia passato da "da assegnare" ad "assegnato"
    fetchInterventiDaAssegnare();
  };

  // Prepara i dati iniziali per il DateTimeDialog
  const getInitialDialogData = () => {
    if (!currentInterventoId) return undefined;
    
    const currentIntervento = interventiDaAssegnare.find(i => i.id === currentInterventoId);
    if (!currentIntervento) return undefined;

    const hasTecnico = currentIntervento.tecnico !== '-';
    const hasData = currentIntervento.data !== '-';
    const hasOrario = currentIntervento.orario !== '-';

    let selectedDate = '';
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
            selectedDate = `${currentYear}-${month}-${day}`;
          }
        }
      } catch {
        selectedDate = '';
      }
    }

    return {
      showDateSection: !hasData,
      showTimeSection: !hasOrario,
      showTechnicianSection: !hasTecnico,
      selectedDate,
      selectedOrarioIntervento: hasOrario ? currentIntervento.orario : '',
      technicianName: hasTecnico ? currentIntervento.tecnico : ''
    };
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Lista Interventi da assegnare - Colonna sinistra collassabile */}
      <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${
        isInterventionsListCollapsed ? 'w-12' : 'w-80'
      }`}>
        {isInterventionsListCollapsed ? (
          /* Barra collassata con pulsante per espandere */
          <div className="h-full bg-white rounded-lg border border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-200">
              <button
                onClick={() => setIsInterventionsListCollapsed(false)}
                className="w-full h-10 flex items-center justify-center text-gray-600 hover:text-teal-600 hover:bg-gray-50 rounded-lg transition-colors"
                title="Espandi lista interventi"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="transform -rotate-90 text-xs font-medium text-gray-500 whitespace-nowrap">
                Interventi da assegnare ({interventiDaAssegnare.length})
              </div>
            </div>
          </div>
        ) : (
          /* Lista completa con pulsante per collassare */
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setIsInterventionsListCollapsed(true)}
                className="flex-shrink-0 p-2 text-gray-600 hover:text-teal-600 hover:bg-gray-50 rounded-lg transition-colors"
                title="Collassa lista interventi"
              >
                <ChevronLeft size={18} />
              </button>
              <h3 className="text-sm font-medium text-gray-700 truncate">
                Interventi da assegnare ({interventiDaAssegnare.length})
              </h3>
            </div>
            <div className="flex-1 min-h-0">
              <InterventionsList
                interventions={interventiDaAssegnare}
                zones={zones}
                selectedZone={selectedZone}
                onZoneChange={setSelectedZone}
                onOpenDateTimeDialog={openDateTimeDialog}
                onRetry={fetchInterventiDaAssegnare}
                loading={loadingInterventiDaAssegnare}
                error={errorInterventiDaAssegnare}
              />
            </div>
          </div>
        )}
      </div>

      {/* Calendario - Colonna destra (ora occupa più spazio) */}
      <div className="flex-1 min-w-0">
        <CalendarGrid
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          currentWeek={currentWeek}
          currentDate={currentDate}
          onWeekChange={(direction) => {
            navigateWeek(direction);
            setCurrentDate(new Date(currentWeek.getTime() + (direction === 'next' ? 7 : -7) * 24 * 60 * 60 * 1000));
          }}
          onDayChange={(direction, date) => {
            if (direction === 'set' && date) {
              setCurrentDate(date);
            } else if (direction === 'prev' || direction === 'next') {
              const newDate = navigateDay(direction);
              setCurrentDate(newDate);
            }
          }}
          interventions={interventiCalendario}
          onInterventionClick={openCalendarInterventoDialog}
          technicianFilter={calendarTechnicianFilter}
          onTechnicianFilterChange={setCalendarTechnicianFilter}
          statusFilter={calendarStatusFilter}
          onStatusFilterChange={setCalendarStatusFilter}
        />
      </div>

      {/* Dialog per selezione data e orario */}
      <DateTimeDialog
        isOpen={showDateTimeDialog}
        interventionId={currentInterventoId}
        onClose={closeDateTimeDialog}
        onConfirm={handleDateTimeConfirm}
        initialData={getInitialDialogData()}
      />

      {/* Dialog dettaglio intervento calendario */}
      <InterventionDetailDialog
        isOpen={showCalendarInterventoDialog}
        intervention={selectedCalendarIntervento}
        onClose={closeCalendarInterventoDialog}
        onInterventionUpdate={handleInterventionUpdate}
      />
    </div>
  );
}