'use client';

import React, { useState } from 'react';
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
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());

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
    <div className="flex gap-6">
      {/* Lista Interventi da assegnare - Colonna sinistra */}
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

      {/* Calendario - Colonna destra */}
      <CalendarGrid
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentWeek={currentWeek}
        currentDate={currentDate}
        onWeekChange={(direction) => {
          navigateWeek(direction);
          setCurrentDate(new Date(currentWeek.getTime() + (direction === 'next' ? 7 : -7) * 24 * 60 * 60 * 1000));
        }}
        onDayChange={(direction) => {
          const newDate = navigateDay(direction);
          setCurrentDate(newDate);
        }}
        interventions={interventiCalendario}
        onInterventionClick={openCalendarInterventoDialog}
        technicianFilter={calendarTechnicianFilter}
        onTechnicianFilterChange={setCalendarTechnicianFilter}
        statusFilter={calendarStatusFilter}
        onStatusFilterChange={setCalendarStatusFilter}
      />

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
      />
    </div>
  );
}