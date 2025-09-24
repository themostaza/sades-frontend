'use client';

import React from 'react';
import { Calendar, ExternalLink } from 'lucide-react';
import { getStatusColor, toStatusKey } from '../../../utils/intervention-status';

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

interface Zone {
  id: number;
  label: string;
}

interface InterventionsListProps {
  interventions: Intervento[];
  zones: Zone[];
  selectedZone: string;
  onZoneChange: (zoneId: string) => void;
  onOpenDateTimeDialog: (interventionId: string) => void;
  onRetry: () => void;
  loading: boolean;
  error: string | null;
}

export default function InterventionsList({
  interventions,
  zones,
  selectedZone,
  onZoneChange,
  onOpenDateTimeDialog,
  onRetry,
  loading,
  error
}: InterventionsListProps) {
  // Filtra gli interventi in base alla zona selezionata
  const filteredInterventions = interventions.filter(intervento => 
    !selectedZone || intervento.zona === (zones.find(z => z.id.toString() === selectedZone)?.label || '')
  );

  return (
    <div className="h-full bg-white rounded-lg border border-gray-200 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
        {/* Filtro zona */}
        <select
          value={selectedZone}
          onChange={e => onZoneChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
        >
          <option value="">Tutte le zone</option>
          {zones.map(zone => (
            <option key={zone.id} value={zone.id}>{zone.label}</option>
          ))}
        </select>
      </div>
      
      {/* Righe tabella senza header */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-6 text-center text-gray-500">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs">Caricamento...</p>
            </div>
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-center text-red-500">
            <div className="text-xs mb-2">
              {error}
            </div>
            <button 
              onClick={onRetry}
              className="px-2 py-1 text-xs text-teal-600 hover:text-teal-700 border border-teal-300 rounded hover:bg-teal-50"
            >
              Riprova
            </button>
          </div>
        ) : filteredInterventions.length > 0 ? (
          filteredInterventions.map((intervento) => (
            <div
              key={intervento.id}
              className="px-3 py-2 border-b border-gray-200 hover:bg-gray-50 transition-all duration-300"
            >
              {/* Prima riga: ID e Ragione sociale (compatta) */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-900">#{intervento.id}</span>
                    {/* Icona apertura nuova tab */}
                    <div
                      title="Apri dettagli"
                      className="cursor-pointer flex-shrink-0"
                      onClick={() => window.open(`/interventi?ai=${intervento.id}`, '_blank')}
                    >
                      <ExternalLink 
                        size={12} 
                        className="text-gray-400 hover:text-teal-600 transition" 
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-900 font-medium truncate mb-1" title={intervento.ragioneSociale}>
                    {intervento.ragioneSociale}
                  </div>
                  
                  {/* Badge status */}
                  {intervento.statusLabel && (
                    <span 
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(toStatusKey(intervento.statusLabel))}`}
                    >
                      {intervento.statusLabel}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Info aggiuntive compatte */}
              <div className="space-y-1 mb-2">
                <div className="text-[10px] text-gray-500">
                  <span className="font-medium">Zona:</span> {intervento.zona}
                </div>
                <div className="text-[10px] text-gray-500">
                  <span className="font-medium">Data:</span> {intervento.data}
                </div>
                <div className="text-[10px] text-gray-500">
                  <span className="font-medium">Tecnico:</span> {intervento.tecnico}
                </div>
                {intervento.callCode && (
                  <div className="text-[10px] text-blue-600 font-medium">
                    <span>Codice:</span> {intervento.callCode}
                  </div>
                )}
              </div>
              
              {/* Pulsante per aprire dialog (compatto) */}
              <button
                onClick={() => onOpenDateTimeDialog(intervento.id)}
                className="w-full text-xs text-gray-600 bg-white border border-gray-300 rounded px-2 py-1.5 text-left hover:bg-gray-50 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 flex items-center justify-between"
              >
                <span className="truncate">Seleziona data/orario</span>
                <Calendar size={12} className="text-gray-400 flex-shrink-0 ml-1" />
              </button>
            </div>
          ))
        ) : (
          <div className="px-4 py-6 text-center text-gray-500">
            <div className="text-xs">Nessun intervento da assegnare</div>
          </div>
        )}
      </div>
    </div>
  );
}
