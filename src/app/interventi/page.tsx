'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, InfoIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NuovoIntervento from './NuovoIntervento';
import CalendarioView from './CalendarioView';

interface AssistanceIntervention {
  id: number;
  date: string;
  time_slot: string;
  from_datetime: string;
  to_datetime: string;
  customer_location_id: string;
  call_code: string;
  company_name: string;
  assigned_to_name: string;
  assigned_to_surname: string | null;
  zone_label: string;
  status_label: string;
  status_color: string;
  location_address: string;
  location_city: string;
  type_label: string;
}

interface ApiResponse {
  data: AssistanceIntervention[];
  meta: {
    total: number;
    page: number;
    skip: number;
    totalPages: number;
  };
}

// Interfaccia per compatibilità con CalendarioView
interface InterventoCalendario {
  id: string;
  ragioneSociale: string;
  data: string;
  orario: string;
  zona: string;
  tecnico: string;
  status: string;
}

export default function InterventiPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Stati per i dati API
  const [interventionsData, setInterventionsData] = useState<AssistanceIntervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    skip: 20,
    totalPages: 1
  });

  // Stati per i filtri
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTechnician] = useState('');

  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista');
  const [showNuovoIntervento, setShowNuovoIntervento] = useState(false);

  const auth = useAuth();

  // Funzione per recuperare i dati dall'API
  const fetchInterventionsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        skip: pageSize.toString(),
      });
      
      if (searchTerm.trim()) {
        params.append('query', searchTerm.trim());
      }
      
      if (selectedDate) {
        params.append('date', selectedDate);
      }
      
      if (selectedZone) {
        params.append('zone_id', selectedZone);
      }
      
      if (selectedStatus) {
        params.append('status_id', selectedStatus);
      }
      
      if (selectedTechnician) {
        params.append('assigned_to_name', selectedTechnician);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/assistance-interventions?${params.toString()}`, {
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Sessione scaduta, effettuando logout');
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch interventions data');
      }
      
      const data: ApiResponse = await response.json();
      setInterventionsData(data.data);
      setMeta(data.meta);
      console.log('✅ Interventi caricati:', data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching interventions data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Effetto per caricare i dati iniziali e quando cambiano i filtri
  useEffect(() => {
    fetchInterventionsData();
  }, [currentPage, searchTerm, selectedDate, selectedZone, selectedStatus, selectedTechnician, auth.token]);

  // Funzione per mappare i colori dello status
  const getStatusColor = (statusColor: string, statusLabel: string) => {
    // Se abbiamo un colore dal backend, lo usiamo
    if (statusColor && statusColor.startsWith('#')) {
      return `bg-gray-100 text-gray-800`; // Fallback per ora
    }
    
    // Mappatura basata sul label
    switch (statusLabel.toLowerCase()) {
      case 'in carico':
        return 'bg-teal-100 text-teal-800';
      case 'completato':
        return 'bg-green-100 text-green-800';
      case 'da assegnare':
        return 'bg-orange-100 text-orange-800';
      case 'attesa preventivo':
        return 'bg-yellow-100 text-yellow-800';
      case 'attesa ricambio':
        return 'bg-blue-100 text-blue-800';
      case 'da confermare':
        return 'bg-purple-100 text-purple-800';
      case 'non completato':
        return 'bg-gray-100 text-gray-800';
      case 'annullato':
        return 'bg-red-100 text-red-800';
      case 'fatturato':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Funzione per formattare la data
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short'
      });
    } catch {
      return dateString;
    }
  };

  // Funzione per formattare il tecnico
  const formatTechnician = (name: string, surname: string | null) => {
    if (!name) return '-';
    return surname ? `${name} ${surname}` : name;
  };

  // Funzione per convertire i dati per CalendarioView
  const convertToCalendarioFormat = (interventions: AssistanceIntervention[]): InterventoCalendario[] => {
    return interventions.map(intervention => ({
      id: intervention.id.toString(),
      ragioneSociale: intervention.company_name,
      data: formatDate(intervention.date),
      orario: intervention.time_slot,
      zona: intervention.zone_label,
      tecnico: formatTechnician(intervention.assigned_to_name, intervention.assigned_to_surname),
      status: intervention.status_label as unknown as string
    }));
  };

  // Funzione per ottenere zone uniche per il filtro
  const getUniqueZones = () => {
    const zones = interventionsData.map(item => item.zone_label).filter(Boolean);
    return [...new Set(zones)];
  };

  // Funzione per ottenere status unici per il filtro
  const getUniqueStatuses = () => {
    const statuses = interventionsData.map(item => item.status_label).filter(Boolean);
    return [...new Set(statuses)];
  };

  if (loading && interventionsData.length === 0) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento interventi...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">Errore nel caricamento degli interventi</p>
            <button 
              onClick={fetchInterventionsData}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg"
            >
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Interventi</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Totale: {meta.total}</span>
            <InfoIcon size={16} />
          </div>
          <button 
            onClick={() => setShowNuovoIntervento(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Nuovo Intervento
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Search and filters row */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca azienda, tecnico, indirizzo, codice chiamata"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          
          <div className="relative">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 appearance-none bg-white min-w-[150px]"
            >
              <option value="">Tutte le date</option>
              {/* Qui potresti aggiungere opzioni di date specifiche */}
            </select>
          </div>
          
          <div className="relative">
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 appearance-none bg-white min-w-[150px]"
            >
              <option value="">Tutte le zone</option>
              {getUniqueZones().map(zone => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 appearance-none bg-white min-w-[150px]"
            >
              <option value="">Tutti gli status</option>
              {getUniqueStatuses().map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setViewMode('lista')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'lista'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendario')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendario'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Calendario
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {viewMode === 'lista' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azienda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zona
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tecnico
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipologia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {interventionsData.map((intervention) => (
                  <tr key={intervention.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{intervention.company_name}</div>
                        <div className="text-xs text-gray-500">#{intervention.call_code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(intervention.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {intervention.time_slot}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {intervention.zone_label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatTechnician(intervention.assigned_to_name, intervention.assigned_to_surname)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {intervention.type_label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          intervention.status_color,
                          intervention.status_label
                        )}`}
                      >
                        {intervention.status_label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Pagina {meta.page} di {meta.totalPages} - Totale: {meta.total} interventi
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Indietro
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {currentPage}
              </span>
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= meta.totalPages || loading}
                className="px-3 py-1 text-sm text-teal-600 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Avanti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar view */}
      {viewMode === 'calendario' && (
        <CalendarioView interventi={convertToCalendarioFormat(interventionsData)} />
      )}

      {/* Componente Nuovo Intervento */}
      <NuovoIntervento
        isOpen={showNuovoIntervento}
        onClose={() => {
          setShowNuovoIntervento(false);
          fetchInterventionsData(); // Ricarica i dati dopo aver chiuso
        }}
      />
    </div>
  );
} 