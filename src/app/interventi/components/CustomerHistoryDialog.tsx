'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  MapPin,
  User,
  FileText,
  Clock,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  Filter,
} from 'lucide-react';
import {
  getStatusColor,
  toStatusKey,
  statusOptions,
  getStatusId,
} from '../../../utils/intervention-status';
import { useAuth } from '../../../contexts/AuthContext';
import {
  AssistanceIntervention,
  AssistanceInterventionsApiResponse,
} from '../../../types/assistance-interventions';

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
  customerName,
}: CustomerHistoryDialogProps) {
  const auth = useAuth();
  const [interventions, setInterventions] = useState<AssistanceIntervention[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  //const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Stati per i filtri
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [showStatusMultiSelect, setShowStatusMultiSelect] = useState(false);
  const [showLocationSelect, setShowLocationSelect] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Opzioni stati senza "Tutti gli stati"
  const statusFilterOptions = statusOptions.filter((s) => s.key !== '');

  // Funzione per caricare gli interventi
  const fetchInterventions = async (
    page: number = 1,
    append: boolean = false
  ) => {
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
        sort_order: 'desc',
      });

      // Aggiungi filtri stato (multipli parametri per supportare OR)
      if (selectedStatuses.length > 0) {
        const statusIds = selectedStatuses
          .map((key) => getStatusId(key))
          .filter((id): id is number => id !== null);
        statusIds.forEach((id) => {
          params.append('status_id', id.toString());
        });
      }

      const response = await fetch(`/api/assistance-interventions?${params}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento degli interventi');
      }

      const data: AssistanceInterventionsApiResponse = await response.json();

      if (append) {
        setInterventions((prev) => [...prev, ...data.data]);
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

  // Ricarica quando cambiano i filtri
  useEffect(() => {
    if (isOpen && customerId) {
      fetchInterventions(1, false);
    }
  }, [selectedStatuses]);

  // Gestisci click fuori dai dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest('.status-filter-dropdown') &&
        !target.closest('.location-filter-dropdown')
      ) {
        setShowStatusMultiSelect(false);
        setShowLocationSelect(false);
      }
    };

    if (showStatusMultiSelect || showLocationSelect) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStatusMultiSelect, showLocationSelect]);

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
      year: 'numeric',
    });
  };

  // Funzione per formattare data+ora
  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    const d = date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const t = date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${d} ${t}`;
  };

  // Estrarre un'anteprima di contenuto (prime righe)
  const getPreviewText = (text?: string | null, maxLen: number = 180) => {
    if (!text) return '';
    const trimmed = text.trim();
    if (!trimmed) return '';
    // Prendi al massimo le prime due righe
    const lines = trimmed.split(/\r?\n/).slice(0, 2).join(' ');
    if (lines.length <= maxLen) return lines;
    return lines.slice(0, maxLen).trimEnd() + '…';
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

  // Funzione per estrarre solo il nome della destinazione da location_label
  const getLocationName = (intervention: AssistanceIntervention) => {
    if (!intervention.location_label) {
      return intervention.company_name;
    }

    // Rimuovi l'indirizzo e la città se sono presenti in location_label
    let locationName = intervention.location_label;

    // Se contiene l'indirizzo, rimuovilo
    if (intervention.location_address) {
      locationName = locationName
        .replace(intervention.location_address, '')
        .trim();
    }

    // Se contiene la città, rimuovila
    if (intervention.location_city) {
      locationName = locationName
        .replace(intervention.location_city, '')
        .trim();
    }

    // Rimuovi tutte le virgole e spazi multipli
    locationName = locationName
      .replace(/,/g, '') // Rimuovi tutte le virgole
      .replace(/\s+/g, ' ') // Sostituisci spazi multipli con uno singolo
      .trim();

    // Se dopo la pulizia è vuoto, usa company_name
    return locationName || intervention.company_name;
  };

  if (!isOpen) return null;

  // Raccogli destinazioni uniche dagli interventi
  const uniqueLocations = Array.from(
    new Set(
      interventions
        .map((i) => i.location_label)
        .filter((label): label is string => !!label)
    )
  ).sort();

  // Filtra gli interventi in base alla destinazione selezionata
  const filteredInterventions = selectedLocation
    ? interventions.filter((i) => i.location_label === selectedLocation)
    : interventions;

  // Calcola numero filtri attivi
  const activeFiltersCount =
    (selectedStatuses.length > 0 ? 1 : 0) + (selectedLocation ? 1 : 0);

  // Funzione per azzerare tutti i filtri
  const clearAllFilters = () => {
    setSelectedStatuses([]);
    setSelectedLocation('');
  };

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

        {/* Sezione Filtri */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Filter size={16} />
              <span>Filtri:</span>
            </div>

            {/* Filtro Stato Multi-Select */}
            <div className="relative status-filter-dropdown">
              <button
                type="button"
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 flex items-center justify-between gap-2 min-w-[150px]"
                onClick={() => setShowStatusMultiSelect((prev) => !prev)}
              >
                <span className="truncate">
                  {selectedStatuses.length === 0
                    ? 'Tutti gli stati'
                    : selectedStatuses.length === 1
                      ? statusFilterOptions.find(
                          (s) => s.key === selectedStatuses[0]
                        )?.label || selectedStatuses[0]
                      : `${selectedStatuses.length} stati`}
                </span>
                <ChevronDown
                  size={16}
                  className="text-gray-400 flex-shrink-0"
                />
              </button>
              {showStatusMultiSelect && (
                <div className="absolute left-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg min-w-[200px] max-h-80 overflow-y-auto">
                  <div
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2 border-b border-gray-100"
                    onClick={() => {
                      setSelectedStatuses([]);
                      setShowStatusMultiSelect(false);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.length === 0}
                      readOnly
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Tutti</span>
                  </div>
                  {statusFilterOptions.map((status) => {
                    const isSelected = selectedStatuses.includes(status.key);
                    return (
                      <div
                        key={status.key}
                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedStatuses((prev) =>
                              prev.filter((s) => s !== status.key)
                            );
                          } else {
                            setSelectedStatuses((prev) => [
                              ...prev,
                              status.key,
                            ]);
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="rounded"
                        />
                        <span
                          className={`text-xs font-medium rounded-full px-2 py-1 ${getStatusColor(status.key)}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Filtro Destinazione */}
            <div className="relative location-filter-dropdown">
              <button
                type="button"
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 flex items-center justify-between gap-2 min-w-[180px]"
                onClick={() => setShowLocationSelect((prev) => !prev)}
              >
                <span className="truncate">
                  {selectedLocation
                    ? getLocationName({
                        location_label: selectedLocation,
                        location_address: '',
                        location_city: '',
                        company_name: '',
                      } as AssistanceIntervention)
                    : 'Tutte le destinazioni'}
                </span>
                <ChevronDown
                  size={16}
                  className="text-gray-400 flex-shrink-0"
                />
              </button>
              {showLocationSelect && (
                <div className="absolute right-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg min-w-[220px] max-h-80 overflow-y-auto">
                  <div
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2 border-b border-gray-100"
                    onClick={() => {
                      setSelectedLocation('');
                      setShowLocationSelect(false);
                    }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        !selectedLocation
                          ? 'border-teal-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {!selectedLocation && (
                        <div className="w-2 h-2 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <span className="text-sm text-gray-700">Tutte</span>
                  </div>
                  {uniqueLocations.map((location) => {
                    const locationName = getLocationName({
                      location_label: location,
                      location_address: '',
                      location_city: '',
                      company_name: '',
                    } as AssistanceIntervention);
                    return (
                      <div
                        key={location}
                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                        onClick={() => {
                          setSelectedLocation(location);
                          setShowLocationSelect(false);
                        }}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedLocation === location
                              ? 'border-teal-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedLocation === location && (
                            <div className="w-2 h-2 rounded-full bg-teal-600" />
                          )}
                        </div>
                        <span className="text-sm text-gray-700 truncate">
                          {locationName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Badge e pulsante azzera filtri */}
            {activeFiltersCount > 0 && (
              <>
                <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs font-medium rounded-full">
                  {activeFiltersCount}{' '}
                  {activeFiltersCount === 1 ? 'filtro attivo' : 'filtri attivi'}
                </span>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium underline"
                >
                  Azzera filtri
                </button>
              </>
            )}
          </div>
        </div>

        {/* Contenuto */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-220px)]">
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
                {activeFiltersCount > 0
                  ? 'Nessun intervento corrisponde ai filtri selezionati'
                  : 'Non ci sono interventi registrati per questo cliente'}
              </p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Azzera filtri
                </button>
              )}
            </div>
          )}

          {/* Nessun intervento con filtro destinazione */}
          {!loading &&
            !error &&
            interventions.length > 0 &&
            filteredInterventions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText size={48} className="text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg">
                  Nessun intervento trovato
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Nessun intervento per la destinazione selezionata
                </p>
                <button
                  onClick={() => setSelectedLocation('')}
                  className="mt-4 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Mostra tutte le destinazioni
                </button>
              </div>
            )}

          {/* Lista interventi */}
          {filteredInterventions.length > 0 && (
            <div className="p-6 space-y-4">
              {/* Contatore totale */}
              <div className="text-sm text-gray-600 mb-4">
                {selectedLocation
                  ? `${filteredInterventions.length} ${filteredInterventions.length === 1 ? 'intervento' : 'interventi'} per questa destinazione`
                  : activeFiltersCount > 0
                    ? `${totalItems} ${totalItems === 1 ? 'intervento trovato' : 'interventi trovati'}`
                    : `Totale interventi: ${totalItems}`}
              </div>

              {filteredInterventions.map((intervention) => {
                const createdAtFormatted = formatDateTime(
                  intervention.created_at
                );
                const preview = getPreviewText(
                  intervention.internal_notes || intervention.calendar_notes
                );
                const openDetail = () => {
                  const url = `/interventi?ai=${intervention.id}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                };
                return (
                  <div
                    key={intervention.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={openDetail}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDetail();
                      }
                    }}
                    title="Apri dettaglio in una nuova scheda"
                  >
                    {/* Header intervento */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-gray-900">
                            {getLocationName(intervention)}
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
                      <ExternalLink size={16} className="text-gray-400 mt-1" />
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
                          {intervention.location_address
                            ? `${intervention.location_address}, ${intervention.location_city}`
                            : intervention.location_city}
                        </span>
                      </div>

                      {/* Tecnico assegnato */}
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="text-gray-700">
                          {intervention.assigned_to_name
                            ? `${intervention.assigned_to_name} ${intervention.assigned_to_surname || ''}`.trim()
                            : 'Non assegnato'}
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

                    {/* Attrezzature coinvolte */}
                    {intervention.connected_equipment &&
                      intervention.connected_equipment.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-xs font-medium text-gray-700 mb-2">
                            Attrezzature ({intervention.equipment_count}):
                          </div>
                          <div className="space-y-1">
                            {intervention.connected_equipment
                              .slice(0, 3)
                              .map((equipment) => (
                                <div
                                  key={equipment.id}
                                  className="text-xs text-gray-600"
                                >
                                  <span className="font-medium">
                                    {equipment.description || ''}
                                    {' - '}
                                    {equipment.model || equipment.description}
                                  </span>
                                  {equipment.serial_number && (
                                    <span className="text-gray-500 ml-1">
                                      (SN: {equipment.serial_number})
                                    </span>
                                  )}
                                </div>
                              ))}
                            {intervention.equipment_count > 3 && (
                              <div className="text-xs text-gray-500 italic">
                                +{intervention.equipment_count - 3}{' '}
                                {intervention.equipment_count - 3 === 1
                                  ? 'altra'
                                  : 'altre'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Anteprima contenuto */}
                    {preview && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-sm text-gray-600">{preview}</div>
                      </div>
                    )}

                    {/* Rapportino */}
                    {intervention.report_id && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-700">
                            Rapportino presente
                            {intervention.report_is_failed && (
                              <span className="text-red-600 ml-2">
                                (Fallito)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                    {/*createdAtFormatted && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-4">
                        <Clock size={14} className="text-gray-400" />
                        <span>Creata il {createdAtFormatted}</span>
                      </div>
                    )*/}
                  </div>
                );
              })}

              {/* Pulsante carica di più */}
              {hasMore && !selectedLocation && (
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
              {!hasMore && !selectedLocation && interventions.length > 0 && (
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
