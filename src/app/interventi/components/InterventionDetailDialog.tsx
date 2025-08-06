'use client';

import React, { useRef, useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
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

interface InterventionDetailDialogProps {
  isOpen: boolean;
  intervention: Intervento | null;
  onClose: () => void;
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
  onClose 
}: InterventionDetailDialogProps) {
  const [calendarNotes, setCalendarNotes] = useState<string>('');
  const [savingCalendarNotes, setSavingCalendarNotes] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const auth = useAuth();

  // Quando si seleziona un intervento, carica le note
  useEffect(() => {
    if (isOpen && intervention) {
      const fetchNotes = async () => {
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
          } else {
            setCalendarNotes('');
          }
        } catch {
          setCalendarNotes('');
        }
      };
      fetchNotes();
    }
  }, [isOpen, intervention, auth.token]);

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

  // Cleanup del timeout quando il componente si smonta
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  if (!isOpen || !intervention) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-3xl min-w-[70vw] p-0 relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 rounded-t-xl">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Dettaglio intervento
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
        <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CAMPO NOTE CALENDARIO */}
          <div className="col-span-2 mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Note calendario</label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-h-[60px]"
              value={calendarNotes}
              onChange={handleCalendarNotesChange}
              placeholder="Aggiungi note per questo intervento..."
            />
            {savingCalendarNotes && (
              <span className="text-xs text-gray-400 ml-2">Salvataggio...</span>
            )}
          </div>
          
          <div className="space-y-3">
            <div>
              <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Tecnico</span>
              <span className="text-lg font-bold text-gray-800">{intervention.tecnico}</span>
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
                {intervention.from_datetime ? new Date(intervention.from_datetime).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                {intervention.to_datetime && (
                  <>
                    <span className="mx-1">→</span>
                    {new Date(intervention.to_datetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </>
                )}
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Durata</span>
              <span className="text-base text-gray-800 font-semibold">
                {intervention.from_datetime && intervention.to_datetime ?
                  (() => {
                    const start = new Date(intervention.from_datetime);
                    const end = new Date(intervention.to_datetime);
                    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    return `${diff}h`;
                  })() : '-'}
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">Fascia oraria</span>
              <span className="text-base text-gray-700">{intervention.orario}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 font-semibold uppercase mb-1">ID Intervento</span>
              <span className="text-base text-gray-700">#{intervention.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
