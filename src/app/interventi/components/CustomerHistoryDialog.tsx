'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, User, FileText, Clock, ChevronRight } from 'lucide-react';
import { getStatusColor, toStatusKey } from '../../../utils/intervention-status';
import { useAuth } from '../../../contexts/AuthContext';
import { AssistanceIntervention, AssistanceInterventionsApiResponse } from '../../../types/assistance-interventions';

interface CustomerHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
}

export default function CustomerHistoryDialog({
  isOpen,
  onClose,
  customerId,
  customerName
}: CustomerHistoryDialogProps) {
  const auth = useAuth();
  const [interventions, setInterventions] = useState<AssistanceIntervention[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  //const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Funzione per caricare gli interventi
  const fetchInterventions = async (page: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const params = new URLSearchParams({
        customer_id: customerId.toString(),
        page: page.toString(),
        skip: ITEMS_PER_PAGE.toString(),
        sort_by: 'date',
        sort_order: 'desc'
      });

      const response = await fetch(`/api/assistance-interventions?${params}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento degli interventi');
      }

      const data: AssistanceInterventionsApiResponse = await response.json();
      
      if (append) {
        setInterventions(prev => [...prev, ...data.data]);
      } else {
        setInterventions(data.data);
      }

      setCurrentPage(page);
      //setTotalPages(data.meta.totalPages);
      setTotalItems(data.meta.total);
      setHasMore(page < data.meta.totalPages);

    } catch (err) {
      console.error('Errore nel caricamento degli interventi:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  // Carica gli interventi quando si apre il dialog
  useEffect(() => {
    if (isOpen && customerId) {
      fetchInterventions(1, false);
    }
  }, [isOpen, customerId]);

  // Funzione per caricare più interventi
  const loadMore = () => {
    if (hasMore && !loading) {
      fetchInterventions(currentPage + 1, true);
    }
  };

  // Funzione per formattare la data
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Data non specificata';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Funzione per formattare l'orario
  const formatTimeSlot = (timeSlot: string | null) => {
    if (!timeSlot) return '';
    
    switch (timeSlot) {
      case 'tutto_il_giorno':
        return 'Tutto il giorno';
      case 'mattina':
        return 'Mattina';
      case 'pomeriggio':
        return 'Pomeriggio';
      default:
        return timeSlot;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Dialog laterale */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Cronologia Interventi
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Cliente: {customerName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Contenuto */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-120px)]">
          {/* Loading iniziale */}
          {loading && interventions.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">Caricamento cronologia...</span>
              </div>
            </div>
          )}

          {/* Errore */}
          {error && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Nessun intervento */}
          {!loading && !error && interventions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText size={48} className="text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">Nessun intervento trovato</p>
              <p className="text-gray-500 text-sm mt-2">
                Non ci sono interventi registrati per questo cliente
              </p>
            </div>
          )}

          {/* Lista interventi */}
          {interventions.length > 0 && (
            <div className="p-6 space-y-4">
              {/* Contatore totale */}
              <div className="text-sm text-gray-600 mb-4">
                Totale interventi: {totalItems}
              </div>

              {interventions.map((intervention) => (
                <div
                  key={intervention.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {/* Header intervento */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          #{intervention.call_code}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(toStatusKey(intervention.status_label))}`}
                        >
                          {intervention.status_label}
                        </span>
                        {intervention.manual_check === false && (
                          <span className="px-2 py-1 text-[10px] font-semibold rounded-full bg-red-100 text-red-800">
                            non verificato!
                          </span>
                        )}
                        {intervention.manual_check === true && (
                          <span className="px-2 py-1 text-[10px] font-semibold rounded-full bg-green-100 text-green-800">
                            Verificato.
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {intervention.type_label}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 mt-1" />
                  </div>

                  {/* Dettagli intervento */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {/* Data e orario */}
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      <span className="text-gray-700">
                        {formatDate(intervention.date)}
                        {intervention.time_slot && (
                          <span className="text-gray-500 ml-2">
                            ({formatTimeSlot(intervention.time_slot)})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Ubicazione */}
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="text-gray-700">
                        {intervention.location_address ? 
                          `${intervention.location_address}, ${intervention.location_city}` :
                          intervention.location_city
                        }
                      </span>
                    </div>

                    {/* Tecnico assegnato */}
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <span className="text-gray-700">
                        {intervention.assigned_to_name ? 
                          `${intervention.assigned_to_name} ${intervention.assigned_to_surname || ''}`.trim() :
                          'Non assegnato'
                        }
                      </span>
                    </div>

                    {/* Zona */}
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="text-gray-700">
                        Zona: {intervention.zone_label}
                      </span>
                    </div>
                  </div>

                  {/* Rapportino */}
                  {intervention.report_id && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-700">
                          Rapportino presente
                          {intervention.report_is_failed && (
                            <span className="text-red-600 ml-2">(Fallito)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Note calendario */}
                  {intervention.calendar_notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-start gap-2">
                        <Clock size={16} className="text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Note:</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {intervention.calendar_notes}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Pulsante carica di più */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Caricamento...
                      </>
                    ) : (
                      <>
                        Carica altri interventi
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Indicatore fine lista */}
              {!hasMore && interventions.length > 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    Hai visualizzato tutti gli interventi ({totalItems})
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 