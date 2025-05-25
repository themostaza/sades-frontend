'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, Check } from 'lucide-react';

interface Intervento {
  id: string;
  ragioneSociale: string;
  data: string;
  orario: string;
  zona: string;
  tecnico: string;
  status: 'In carico' | 'Completato' | 'Da assegnare';
}

interface CalendarioViewProps {
  interventi: Intervento[];
}

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

function DateTimePicker({ value, onChange, placeholder }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeFrom, setSelectedTimeFrom] = useState('');
  const [selectedTimeTo, setSelectedTimeTo] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Genera i giorni del mese corrente
  const getDaysInMonth = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Giorni vuoti all'inizio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Giorni del mese
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth, currentYear);
  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00'
  ];

  const handleDateSelect = (day: number) => {
    const date = `${day.toString().padStart(2, '0')}/${(currentMonth + 1).toString().padStart(2, '0')}/${currentYear}`;
    setSelectedDate(date);
  };

  const handleTimeFromSelect = (time: string) => {
    setSelectedTimeFrom(time);
    // Auto-seleziona un orario "alle" di default (1 ora dopo)
    const fromIndex = timeSlots.indexOf(time);
    if (fromIndex !== -1 && fromIndex < timeSlots.length - 2) {
      setSelectedTimeTo(timeSlots[fromIndex + 2]); // +1 ora
    }
  };

  const handleTimeToSelect = (time: string) => {
    setSelectedTimeTo(time);
  };

  const handleConfirm = () => {
    if (selectedDate && selectedTimeFrom && selectedTimeTo) {
      onChange(`${selectedDate} dalle ${selectedTimeFrom} alle ${selectedTimeTo}`);
      setIsOpen(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    } else {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    }
  };

  const resetSelection = () => {
    setSelectedDate('');
    setSelectedTimeFrom('');
    setSelectedTimeTo('');
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          readOnly
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-sm text-gray-600 bg-white border border-gray-300 rounded px-2 py-1 pr-8 cursor-pointer focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
        <Calendar size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>

      {isOpen && (
        <>
          {/* Overlay per chiudere cliccando fuori */}
          <div 
            className="fixed inset-0 z-[9998] bg-black bg-opacity-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Popup calendario */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-lg shadow-xl z-[9999] p-6 w-[500px] min-h-[70vh]">
            {/* Header calendario con navigazione mesi */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <h4 className="font-semibold text-lg text-gray-900">
                {monthNames[currentMonth]} {currentYear}
              </h4>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Colonna sinistra - Calendario */}
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-3">Seleziona data:</h5>
                
                {/* Griglia calendario */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['D', 'L', 'Ma', 'Me', 'G', 'V', 'S'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 p-2">
                      {day}
                    </div>
                  ))}
                  {days.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => day && handleDateSelect(day)}
                      disabled={!day}
                      className={`text-center text-sm p-2 rounded hover:bg-gray-100 ${
                        day ? 'text-gray-900 cursor-pointer' : 'text-transparent cursor-default'
                      } ${
                        selectedDate.startsWith(day?.toString().padStart(2, '0') || '') 
                          ? 'bg-teal-500 text-white hover:bg-teal-600' 
                          : ''
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colonna destra - Selezione orari */}
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-3">Seleziona orario:</h5>
                
                {/* Orario DALLE */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Dalle:</label>
                  <select
                    value={selectedTimeFrom}
                    onChange={(e) => handleTimeFromSelect(e.target.value)}
                    className="w-full text-sm text-gray-600 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Seleziona orario</option>
                    {timeSlots.map(time => (
                      <option key={`from-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Orario ALLE */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Alle:</label>
                  <select
                    value={selectedTimeTo}
                    onChange={(e) => handleTimeToSelect(e.target.value)}
                    disabled={!selectedTimeFrom}
                    className="w-full text-sm text-gray-600 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleziona orario</option>
                    {timeSlots.map(time => {
                      const fromIndex = timeSlots.indexOf(selectedTimeFrom);
                      const currentIndex = timeSlots.indexOf(time);
                      const isDisabled = Boolean(selectedTimeFrom && currentIndex <= fromIndex);
                      
                      return (
                        <option 
                          key={`to-${time}`} 
                          value={time}
                          disabled={isDisabled}
                        >
                          {time}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* Anteprima selezione */}
            {selectedDate && selectedTimeFrom && selectedTimeTo && (
              <div className="mt-4 p-3 bg-teal-50 rounded-lg">
                <p className="text-sm text-teal-800">
                  <strong>Selezione:</strong> {selectedDate} dalle {selectedTimeFrom} alle {selectedTimeTo}
                </p>
              </div>
            )}

            {/* Pulsanti azione */}
            <div className="flex justify-between mt-6">
              <button
                onClick={resetSelection}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
              >
                Reset
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedDate || !selectedTimeFrom || !selectedTimeTo}
                  className="px-4 py-2 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Conferma
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CalendarioView({ interventi }: CalendarioViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [interventoAssignments, setInterventoAssignments] = useState<{[key: string]: string}>({});
  const [selectedTecnicos, setSelectedTecnicos] = useState<{[key: string]: string}>({});
  const [removingInterventi, setRemovingInterventi] = useState<Set<string>>(new Set());

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
  const timeSlots = [
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

  // Funzione per ottenere gli interventi per un giorno specifico
  const getInterventiForDay = (day: Date) => {
    const dayString = day.getDate().toString();
    return interventi.filter(intervento => {
      // Semplificazione: assumiamo che la data sia nel formato "26 Gen"
      return intervento.data.includes(dayString);
    });
  };

  // Funzione per ottenere gli interventi assegnati per un giorno specifico con le loro posizioni
  const getAssignedInterventiForDay = (day: Date) => {
    const assignedInterventi: Array<{
      intervento: Intervento;
      timeFrom: string;
      timeTo: string;
      startSlotIndex: number;
      duration: number;
    }> = [];
    
    // Controlla tutte le assegnazioni
    Object.entries(interventoAssignments).forEach(([interventoId, assignment]) => {
      if (!assignment) return;
      
      // Parse dell'assegnazione: "15/01/2024 dalle 10:00 alle 15:00"
      const assignmentMatch = assignment.match(/(\d{2})\/(\d{2})\/(\d{4}) dalle (\d{2}:\d{2}) alle (\d{2}:\d{2})/);
      if (!assignmentMatch) return;
      
      const [, dayStr, monthStr, yearStr, timeFrom, timeTo] = assignmentMatch;
      const assignedDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
      
      // Verifica se è lo stesso giorno
      if (assignedDate.toDateString() === day.toDateString()) {
        const intervento = interventi.find(i => i.id === interventoId);
        if (intervento) {
          // Calcola l'indice di inizio e la durata
          const startSlotIndex = timeSlots.findIndex(slot => slot === timeFrom);
          const endSlotIndex = timeSlots.findIndex(slot => slot === timeTo);
          
          if (startSlotIndex !== -1 && endSlotIndex !== -1) {
            assignedInterventi.push({
              intervento,
              timeFrom,
              timeTo,
              startSlotIndex,
              duration: endSlotIndex - startSlotIndex
            });
          }
        }
      }
    });
    
    return assignedInterventi;
  };

  // Funzione per verificare se una cella deve essere vuota (occupata da un blocco che inizia prima)
  const isCellOccupiedByPreviousBlock = (day: Date, timeSlotIndex: number) => {
    const dayAssignments = getAssignedInterventiForDay(day);
    
    return dayAssignments.some(assignment => {
      const blockStart = assignment.startSlotIndex;
      const blockEnd = assignment.startSlotIndex + assignment.duration;
      return timeSlotIndex > blockStart && timeSlotIndex < blockEnd;
    });
  };

  // Funzione per ottenere il mese e anno corrente
  const getCurrentMonthYear = () => {
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return `${months[currentWeek.getMonth()]} ${currentWeek.getFullYear()}`;
  };

  // Filtra gli interventi da assegnare
  const interventiDaAssegnare = interventi.filter(intervento => intervento.status === 'Da assegnare');

  // Funzione per salvare l'assegnazione (placeholder per ora)
  const handleSaveIntervento = (interventoId: string) => {
    const assignment = interventoAssignments[interventoId];
    const tecnico = selectedTecnicos[interventoId];
    
    // TODO: Implementare chiamata API per salvare in DB
    console.log(`Salvando intervento ${interventoId}:\nData e orario: ${assignment}\nTecnico: ${tecnico}`);
    
    // Avvia l'animazione di rimozione
    setRemovingInterventi(prev => new Set(prev).add(interventoId));
    
    // Dopo l'animazione, rimuovi effettivamente l'intervento
    setTimeout(() => {
      setInterventoAssignments(prev => {
        const newAssignments = { ...prev };
        delete newAssignments[interventoId];
        return newAssignments;
      });
      
      setSelectedTecnicos(prev => {
        const newTecnicos = { ...prev };
        delete newTecnicos[interventoId];
        return newTecnicos;
      });
      
      setRemovingInterventi(prev => {
        const newSet = new Set(prev);
        newSet.delete(interventoId);
        return newSet;
      });
    }, 300); // Durata dell'animazione
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
          {interventiDaAssegnare.length > 0 ? (
            interventiDaAssegnare.map((intervento) => (
              <div
                key={intervento.id}
                className={`px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition-all duration-300 ${
                  removingInterventi.has(intervento.id) 
                    ? 'opacity-0 transform translate-x-full scale-95' 
                    : 'opacity-100 transform translate-x-0 scale-100'
                }`}
              >
                {/* Prima riga: Codice e Ragione sociale */}
                <div className="flex justify-between items-center mb-2">
                  <div className="flex gap-4">
                    <span className="text-sm font-medium text-gray-900">123456</span>
                    <span className="text-sm text-gray-900">Ragione sociale</span>
                  </div>
                  
                  {/* Pulsante approva con label */}
                  {interventoAssignments[intervento.id] && selectedTecnicos[intervento.id] ? (
                    <button
                      onClick={() => handleSaveIntervento(intervento.id)}
                      disabled={removingInterventi.has(intervento.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full transition-colors text-sm font-medium"
                      title="Approva assegnazione"
                    >
                      <Check size={14} />
                      <span>Approva</span>
                    </button>
                  ) : null}
                </div>
                
                {/* Seconda riga: Data e Tecnico */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <DateTimePicker
                      value={interventoAssignments[intervento.id] || ''}
                      onChange={(value) => setInterventoAssignments(prev => ({
                        ...prev,
                        [intervento.id]: value
                      }))}
                      placeholder="Seleziona data e orario"
                    />
                  </div>
                  
                  <div className="flex-1 relative">
                    <select 
                      value={selectedTecnicos[intervento.id] || ''}
                      onChange={(e) => setSelectedTecnicos(prev => ({
                        ...prev,
                        [intervento.id]: e.target.value
                      }))}
                      className="w-full text-sm text-gray-600 bg-white border border-gray-300 rounded px-2 py-1 appearance-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="">Seleziona tecnico</option>
                      <option value="tecnico1">Tecnico 1</option>
                      <option value="tecnico2">Tecnico 2</option>
                      <option value="tecnico3">Tecnico 3</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <ChevronDown size={12} className="text-gray-400" />
                    </div>
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
            {timeSlots.map((timeSlot) => (
              <div key={timeSlot} className="grid grid-cols-6 border-b border-gray-200 last:border-b-0">
                {/* Colonna orario */}
                <div className="p-4 bg-gray-50 border-r border-gray-200 flex items-center">
                  <span className="text-sm font-medium text-gray-600">{timeSlot}</span>
                </div>
                
                {/* Colonne giorni */}
                {weekDays.map((day) => {
                  const dayInterventi = getInterventiForDay(day);
                  const dayAssignments = getAssignedInterventiForDay(day);
                  const currentTimeSlotIndex = timeSlots.findIndex(slot => slot === timeSlot);
                  
                  // Trova gli interventi che iniziano in questo slot
                  const interventiStartingHere = dayAssignments.filter(assignment => 
                    assignment.startSlotIndex === currentTimeSlotIndex
                  );
                  
                  // Verifica se questa cella è occupata da un blocco che inizia prima
                  const isOccupied = isCellOccupiedByPreviousBlock(day, currentTimeSlotIndex);

                  return (
                    <div key={`${day.toISOString()}-${timeSlot}`} className="relative p-2 border-r border-gray-200 last:border-r-0 min-h-[80px]">
                      {/* Mostra solo gli interventi che iniziano in questo slot */}
                      {!isOccupied && interventiStartingHere.map((assignment) => (
                        <div
                          key={assignment.intervento.id}
                          className={`absolute left-2 right-2 ${getStatusColor(assignment.intervento.status)} text-white p-2 rounded text-xs cursor-pointer hover:opacity-80 z-10`}
                          style={{
                            height: `${assignment.duration * 80 - 8}px`, // 80px per slot - 8px per padding
                            top: '8px'
                          }}
                        >
                          <div className="font-medium truncate">
                            {assignment.intervento.ragioneSociale}
                          </div>
                          <div className="truncate opacity-90 text-xs">
                            {assignment.timeFrom} - {assignment.timeTo}
                          </div>
                          <div className="text-xs opacity-75 mt-1">
                            {assignment.intervento.tecnico !== '-' ? assignment.intervento.tecnico : 'Non assegnato'}
                          </div>
                        </div>
                      ))}
                      
                      {/* Mostra gli interventi originali solo se la cella non è occupata */}
                      {!isOccupied && dayInterventi.filter(intervento => {
                        // Filtra gli interventi originali per evitare duplicati con quelli assegnati
                        const isAlreadyAssigned = dayAssignments.some(assignment => 
                          assignment.intervento.id === intervento.id
                        );
                        return !isAlreadyAssigned;
                      }).map((intervento) => (
                        <div
                          key={`original-${intervento.id}`}
                          className={`${getStatusColor(intervento.status)} text-white p-2 rounded text-xs mb-1 cursor-pointer hover:opacity-80`}
                        >
                          <div className="font-medium truncate">
                            {intervento.ragioneSociale}
                          </div>
                          <div className="truncate opacity-90">
                            {intervento.tecnico !== '-' ? intervento.tecnico : 'Non assegnato'}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 