'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';

interface DateRangePickerProps {
  value: {
    from: string;
    to: string;
  };
  onChange: (value: { from: string; to: string }) => void;
  placeholder?: string;
  className?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  placeholder = "Filtra per data",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempSelection, setTempSelection] = useState<{
    from: string;
    to: string;
    isSelecting: boolean;
  }>({
    from: '',
    to: '',
    isSelecting: false
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Funzione helper per convertire Date in stringa YYYY-MM-DD senza problemi di timezone
  // IMPORTANTE: Usa getFullYear(), getMonth(), getDate() invece di toISOString()
  // per evitare conversioni UTC che possono far slittare la data di un giorno
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Chiudi il calendario quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setTempSelection({ from: '', to: '', isSelecting: false });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formatta la data per la visualizzazione
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  // Genera il testo da mostrare nel campo input
  const getDisplayText = () => {
    if (!value.from && !value.to) return '';
    
    if (value.from && !value.to) {
      return formatDisplayDate(value.from);
    }
    
    if (value.from && value.to) {
      if (value.from === value.to) {
        return formatDisplayDate(value.from);
      }
      return `${formatDisplayDate(value.from)} - ${formatDisplayDate(value.to)}`;
    }
    
    return '';
  };

  // Genera i giorni del mese corrente
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Gestisce il click su un giorno
  const handleDayClick = (date: Date) => {
    const dateStr = formatDateToString(date);
    
    // Debug: verifica che la data sia corretta
    console.log(`🗓️ DateRangePicker: Selected date ${dateStr} (original Date: ${date.toDateString()})`);
    
    if (!tempSelection.isSelecting) {
      // Prima selezione
      setTempSelection({
        from: dateStr,
        to: '',
        isSelecting: true
      });
    } else {
      // Seconda selezione
      const fromDate = new Date(tempSelection.from);
      const toDate = new Date(dateStr);
      
      if (toDate < fromDate) {
        // Se la seconda data è precedente alla prima, scambia
        onChange({ from: dateStr, to: tempSelection.from });
      } else if (toDate.getTime() === fromDate.getTime()) {
        // Se è la stessa data, seleziona solo quella
        onChange({ from: dateStr, to: '' });
      } else {
        // Range normale
        onChange({ from: tempSelection.from, to: dateStr });
      }
      
      setTempSelection({ from: '', to: '', isSelecting: false });
      setIsOpen(false);
    }
  };

  // Controlla se una data è selezionata
  const isDateSelected = (date: Date) => {
    const dateStr = formatDateToString(date);
    
    // Selezione definitiva
    if (value.from === dateStr || value.to === dateStr) return true;
    
    // Selezione temporanea
    if (tempSelection.from === dateStr) return true;
    
    return false;
  };

  // Controlla se una data è nel range
  const isDateInRange = (date: Date) => {
    const dateStr = formatDateToString(date);
    
    // Range definitivo
    if (value.from && value.to) {
      return dateStr > value.from && dateStr < value.to;
    }
    
    // Range temporaneo (durante la selezione)
    if (tempSelection.isSelecting && tempSelection.from) {
      const fromDate = new Date(tempSelection.from);
      const currentDate = new Date(dateStr);
      
      if (currentDate > fromDate) {
        return dateStr > tempSelection.from;
      } else {
        return dateStr < tempSelection.from;
      }
    }
    
    return false;
  };

  // Controlla se una data è oggi
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Controlla se una data è nel mese corrente
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ from: '', to: '' });
    setTempSelection({ from: '', to: '', isSelecting: false });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const days = generateCalendarDays();
  const displayText = getDisplayText();

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Field */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <span className={displayText ? 'text-gray-700' : 'text-gray-400'}>
            {displayText || placeholder}
          </span>
        </div>
        {displayText && (
          <button
            onClick={clearSelection}
            className="text-gray-400 hover:text-gray-600"
            type="button"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 min-w-[280px]">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              ←
            </button>
            <h3 className="font-medium text-gray-900">
              {currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              →
            </button>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map(day => (
              <div key={day} className="text-xs text-gray-500 text-center py-1 font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              const isSelected = isDateSelected(date);
              const inRange = isDateInRange(date);
              const today = isToday(date);
              const currentMonthDay = isCurrentMonth(date);

              return (
                <button
                  key={index}
                  onClick={() => handleDayClick(date)}
                  className={`
                    p-2 text-sm rounded hover:bg-gray-100 transition-colors
                    ${!currentMonthDay ? 'text-gray-300' : 'text-gray-700'}
                    ${isSelected ? 'bg-teal-600 text-white hover:bg-teal-700' : ''}
                    ${inRange ? 'bg-teal-100 text-teal-800' : ''}
                    ${today && !isSelected ? 'bg-gray-100 font-medium' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Instructions */}
          <div className="mt-3 text-xs text-gray-500 text-center">
            {!tempSelection.isSelecting 
              ? "Clicca su una data per selezionarla"
              : "Clicca su un'altra data per creare un range"
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
