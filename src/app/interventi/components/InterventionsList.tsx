'use client';

import React from 'react';
import { Calendar, ExternalLink } from 'lucide-react';

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
    <div className="w-fit min-w-[40vw] bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
        {/* Filtro zona */}
        <select
          value={selectedZone}
          onChange={e => onZoneChange(e.target.value)}
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
        {loading ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm">Caricamento interventi da assegnare...</p>
            </div>
          </div>
        ) : error ? (
          <div className="px-6 py-8 text-center text-red-500">
            <div className="text-sm">
              {error}
            </div>
            <button 
              onClick={onRetry}
              className="mt-2 px-3 py-1 text-sm text-teal-600 hover:text-teal-700 border border-teal-300 rounded hover:bg-teal-50"
            >
              Riprova
            </button>
          </div>
        ) : filteredInterventions.length > 0 ? (
          filteredInterventions.map((intervento) => (
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
                    onClick={() => onOpenDateTimeDialog(intervento.id)}
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
  );
}
