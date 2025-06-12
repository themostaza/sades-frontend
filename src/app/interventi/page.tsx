'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, InfoIcon, MapPin, X, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NuovoIntervento from './NuovoIntervento';
import DettaglioIntervento from './DettaglioIntervento';
import CalendarioView from './CalendarioView';
import RichiediAssenza from './RichiediAssenza';
import { useRouter, useSearchParams } from 'next/navigation';
import { AssistanceIntervention, AssistanceInterventionsApiResponse } from '../../types/assistance-interventions';


// Interfaccia per le informazioni utente
interface UserInfo {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone_number: string;
  role: string;
}

export default function InterventiPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Stati per i dati API
  const [interventionsData, setInterventionsData] = useState<AssistanceIntervention[]>([]);
  const [zonesData, setZonesData] = useState<{id: number, label: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
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
  const [selectedTechnician] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista');
  const [showNuovoIntervento, setShowNuovoIntervento] = useState(false);
  
  // Stati per il dettaglio intervento
  const [showDettaglioIntervento, setShowDettaglioIntervento] = useState(false);
  const [selectedInterventionId, setSelectedInterventionId] = useState<number | null>(null);

  // Stati per la gestione utente e ruoli
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [showRichiediAssenza, setShowRichiediAssenza] = useState(false);

  // Stato per tracciare se abbiamo letto i parametri URL
  const [urlParamsRead, setUrlParamsRead] = useState(false);

  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Status configurations for the filter dropdown
  const statusOptions = [
    { key: '', label: 'Tutti gli stati' },
    { key: 'da_assegnare', label: 'Da assegnare' },
    { key: 'attesa_preventivo', label: 'Attesa preventivo' },
    { key: 'attesa_ricambio', label: 'Attesa ricambio' },
    { key: 'in_carico', label: 'In carico' },
    { key: 'da_confermare', label: 'Da confermare' },
    { key: 'completato', label: 'Completato' },
    { key: 'non_completato', label: 'Non completato' },
    { key: 'annullato', label: 'Annullato' },
    { key: 'fatturato', label: 'Fatturato' },
    { key: 'collocamento', label: 'Collocamento' },
  ];

  // Funzione per mappare i valori degli stati ai corrispondenti ID numerici
  const getStatusId = (statusKey: string): number | null => {
    const statusMap: Record<string, number> = {
      'da_assegnare': 1,
      'attesa_preventivo': 2,
      'attesa_ricambio': 3,
      'in_carico': 4,
      'da_confermare': 5,
      'completato': 6,
      'non_completato': 7,
      'annullato': 8,
      'fatturato': 9,
      'collocamento': 10
    };
    return statusMap[statusKey] || null;
  };

  // Funzione per recuperare le informazioni dell'utente
  const fetchUserInfo = async () => {
    try {
      setUserLoading(true);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch('/api/auth/me', {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Sessione scaduta, effettuando logout');    
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch user info');
      }
      
      const userData: UserInfo = await response.json();
      setUserInfo(userData);
      console.log('✅ Informazioni utente caricate:', userData);
    } catch (err) {
      console.error('Error fetching user info:', err);
    } finally {
      setUserLoading(false);
    }
  };

  // Effect to handle URL search parameters for status filtering and deep linking
  useEffect(() => {
    const statusFromUrl = searchParams.get('status');
    const interventionIdFromUrl = searchParams.get('ai'); // assistance intervention ID
    
    console.log('🔗 URL status parameter:', statusFromUrl);
    console.log('🔗 URL intervention ID parameter (ai):', interventionIdFromUrl);
    
    if (statusFromUrl) {
      console.log('✅ Setting selectedStatus from URL:', statusFromUrl);
      setSelectedStatus(statusFromUrl);
    }
    
    // Deep link: se c'è il parametro "ai", apri direttamente il dettaglio
    if (interventionIdFromUrl) {
      const interventionId = parseInt(interventionIdFromUrl, 10);
      if (!isNaN(interventionId)) {
        console.log('🎯 Opening intervention detail from URL:', interventionId);
        setSelectedInterventionId(interventionId);
        setShowDettaglioIntervento(true);
      } else {
        console.warn('⚠️ Invalid intervention ID in URL:', interventionIdFromUrl);
      }
    }
    
    setUrlParamsRead(true);
  }, [searchParams]);

  // Effect per caricare le informazioni utente al mount
  useEffect(() => {
    if (auth.token) {
      fetchUserInfo();
    }
  }, [auth.token]);

  // Funzione per gestire il click su una riga della tabella
  const handleRowClick = (interventionId: number) => {
    setSelectedInterventionId(interventionId);
    setShowDettaglioIntervento(true);
    
    // Aggiungi il parametro "ai" all'URL per supportare il deep linking
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.set('ai', interventionId.toString());
    const newUrl = `/interventi?${currentParams.toString()}`;
    router.replace(newUrl);
  };

  // Funzione per chiudere il dettaglio e ricaricare i dati
  const handleDettaglioClose = () => {
    setShowDettaglioIntervento(false);
    setSelectedInterventionId(null);
    
    // Rimuovi il parametro "ai" dall'URL se presente
    const currentParams = new URLSearchParams(searchParams.toString());
    if (currentParams.has('ai')) {
      currentParams.delete('ai');
      const newUrl = currentParams.toString() 
        ? `/interventi?${currentParams.toString()}` 
        : '/interventi';
      router.replace(newUrl);
    }
    
    // Ricarica i dati per vedere eventuali modifiche
    fetchInterventionsData();
  };

  // Funzione per recuperare le zone dall'API
  const fetchZonesData = async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch('/api/zones', {
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch zones data');
      }
      
      const data = await response.json();
      setZonesData(data);
      console.log('✅ Zone caricate:', data.length);
    } catch (err) {
      console.error('Error fetching zones data:', err);
    }
  };

  // Funzione per recuperare i dati dall'API
  const fetchInterventionsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        skip: pageSize.toString()
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
      
      if (selectedTechnician) {
        params.append('assigned_to_name', selectedTechnician);
      }

      if (selectedStatus) {
        const statusId = getStatusId(selectedStatus);
        console.log(`🔄 Mapping status "${selectedStatus}" to ID: ${statusId}`);
        params.append('status_id', statusId?.toString() || '');
      }

      console.log('🚀 API call with params:', params.toString());

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
      
      const data: AssistanceInterventionsApiResponse = await response.json();
      
      setInterventionsData(data.data);
      setMeta(data.meta);
      console.log('✅ Interventi caricati:', data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching interventions data:', err);
    } finally {
      setLoading(false);
      setInitialLoading(false); // Imposta il caricamento iniziale come completato
    }
  };

  // Effetto per caricare i dati iniziali e quando cambiano i filtri
  useEffect(() => {
    // Non caricare i dati finché non abbiamo letto i parametri URL
    if (!urlParamsRead) {
      console.log('⏳ Waiting for URL params to be read...');
      return;
    }
    
    console.log('🔄 fetchInterventionsData triggered with selectedStatus:', selectedStatus);
    fetchInterventionsData();
  }, [currentPage, searchTerm, selectedDate, selectedZone, selectedTechnician, selectedStatus, auth.token, urlParamsRead]);

  // Effetto per caricare le zone al mount del componente
  useEffect(() => {
    fetchZonesData();
  }, [auth.token]);

  // Funzione per calcolare lo stato corretto basato sulla logica frontend
  const calculateStatus = (intervention: AssistanceIntervention): { label: string; key: string } => {
    // Priorità massima: se invoiced_by è valorizzato → fatturato
    if (intervention.invoiced_by) {
      return { label: 'Fatturato', key: 'fatturato' };
    }
    
    // Priorità alta: se cancelled_by è valorizzato → annullato
    if (intervention.cancelled_by) {
      return { label: 'Annullato', key: 'annullato' };
    }
    
    // Controllo dei campi obbligatori per l'assegnazione
    const requiredFields = [
      intervention.assigned_to_name,
      intervention.date,
      intervention.time_slot,
      intervention.from_datetime,
      intervention.to_datetime
    ];
    
    // Se uno dei campi obbligatori non è valorizzato → da_assegnare
    if (requiredFields.some(field => !field || field.trim() === '')) {
      return { label: 'Da assegnare', key: 'da_assegnare' };
    }
    
    // Tutti i campi obbligatori sono valorizzati → in_carico
    let currentStatus = { label: 'In carico', key: 'in_carico' };
    
    // Se c'è un report_id → da_confermare
    if (intervention.report_id !== null) {
      currentStatus = { label: 'Da confermare', key: 'da_confermare' };
      
      // Se c'è anche approved_by → controllo report_is_failed
      if (intervention.approved_by_name) {
        if (intervention.report_is_failed === true) {
          currentStatus = { label: 'Non completato', key: 'non_completato' };
        } else if (intervention.report_is_failed === false || intervention.report_is_failed === null) {
          currentStatus = { label: 'Completato', key: 'completato' };
        }
      }
    }
    
    return currentStatus;
  };

  // Funzione per mappare i colori dello status basato sul status calcolato
  const getStatusColor = (statusKey: string) => {
    // Mappatura basata sulla chiave del status calcolato
    switch (statusKey) {
      case 'da_assegnare':
        return 'bg-orange-100 text-orange-800';
      case 'attesa_preventivo':
        return 'bg-yellow-100 text-yellow-800';
      case 'attesa_ricambio':
        return 'bg-blue-100 text-blue-800';
      case 'in_carico':
        return 'bg-teal-100 text-teal-800';
      case 'da_confermare':
        return 'bg-purple-100 text-purple-800';
      case 'completato':
        return 'bg-green-100 text-green-800';
      case 'non_completato':
        return 'bg-gray-100 text-gray-800';
      case 'annullato':
        return 'bg-red-100 text-red-800';
      case 'fatturato':
        return 'bg-emerald-100 text-emerald-800';
      case 'collocamento':
        return 'bg-indigo-100 text-indigo-800';
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

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
    
    // Update URL without status parameter if "Tutti gli stati" is selected
    if (status === '') {
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      router.replace(url.pathname + (url.search ? url.search : ''), { scroll: false });
    }
  };

  // Funzione per formattare la data
  const formatDate = (dateString: string) => {
    // Se la data è mancante, null, undefined o stringa vuota, non mostrare nulla
    if (!dateString || dateString.trim() === '') {
      return '-';
    }
    
    try {
      const date = new Date(dateString);
      // Verifica se la data è valida
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      // Verifica se è una data "epoch" (1970) che indica data non impostata
      if (date.getFullYear() <= 1970) {
        return '-';
      }
      
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short'
      });
    } catch {
      return '-';
    }
  };

  // Funzione per formattare il tecnico
  const formatTechnician = (name: string, surname: string | null) => {
    if (!name) return '-';
    return surname ? `${name} ${surname}` : name;
  };


  // Funzione per determinare se l'utente è amministratore
  const isAdmin = () => {
    return userInfo?.role === 'amministrazione';
  };

  if (initialLoading && interventionsData.length === 0) {
    return (
      <div className="p-4 sm:p-6 bg-white min-h-screen">
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
      <div className="p-4 sm:p-6 bg-white min-h-screen">
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
    <div className="p-4 sm:p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Interventi</h1>
          </div>
          {/* View mode toggle - accanto al titolo */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('lista')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'lista'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendario')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendario'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Calendario
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Totale: {meta.total}</span>
            <InfoIcon size={16} />
          </div>
          {/* Rendering condizionale del pulsante in base al ruolo */}
          {!userLoading && userInfo && (
            <>
              {isAdmin() ? (
                <button 
                  onClick={() => setShowNuovoIntervento(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
                >
                  <Plus size={16} />
                  Nuovo Intervento
                </button>
              ) : (
                <button 
                  onClick={() => setShowRichiediAssenza(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
                >
                  <Plus size={16} />
                  Richiedi Assenza
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {/* Stato selezionato: badge filtro sotto titolo e toggle */}
      {selectedStatus && (
        <div className="mt-1 flex items-center gap-2 flex-wrap mb-4">
          <span className="text-sm text-gray-600">Filtrato per stato:</span>
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            statusOptions.find(s => s.key === selectedStatus)?.key === 'da_assegnare' ? 'bg-orange-100 text-orange-800' :
            statusOptions.find(s => s.key === selectedStatus)?.key === 'attesa_preventivo' ? 'bg-yellow-100 text-yellow-800' :
            statusOptions.find(s => s.key === selectedStatus)?.key === 'attesa_ricambio' ? 'bg-blue-100 text-blue-800' :
            statusOptions.find(s => s.key === selectedStatus)?.key === 'in_carico' ? 'bg-teal-100 text-teal-800' :
            statusOptions.find(s => s.key === selectedStatus)?.key === 'da_confermare' ? 'bg-purple-100 text-purple-800' :
            statusOptions.find(s => s.key === selectedStatus)?.key === 'completato' ? 'bg-green-100 text-green-800' :
            statusOptions.find(s => s.key === selectedStatus)?.key === 'non_completato' ? 'bg-gray-100 text-gray-800' :
            statusOptions.find(s => s.key === selectedStatus)?.key === 'annullato' ? 'bg-red-100 text-red-800' :
            statusOptions.find(s => s.key === selectedStatus)?.key === 'fatturato' ? 'bg-emerald-100 text-emerald-800' :
            statusOptions.find(s => s.key === selectedStatus)?.key === 'collocamento' ? 'bg-indigo-100 text-indigo-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {statusOptions.find(s => s.key === selectedStatus)?.label}
          </span>
          <button
            onClick={() => handleStatusFilter('')}
            className="text-gray-400 hover:text-gray-600 ml-1"
            title="Rimuovi filtro"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filters */}
      {viewMode === 'lista' && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search bar */}
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cerca Ragione sociale, descrizione, tecnico"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700 placeholder-gray-400"
              />
            </div>
            {/* Data filter */}
            <div className="relative flex-1 sm:flex-none sm:min-w-[180px]">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Filtra per data"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  type="button"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {/* Zona filter */}
            <div className="relative flex-1 sm:flex-none sm:min-w-[180px]">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 appearance-none bg-white text-gray-700"
              >
                <option value="" className="text-gray-700">Filtra per zona</option>
                {zonesData.map(zone => (
                  <option key={zone.id} value={zone.id} className="text-gray-700">{zone.label}</option>
                ))}
              </select>
            </div>
            {/* Stato filter */}
            <div className="relative flex-1 sm:flex-none sm:min-w-[180px]">
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 appearance-none bg-white text-gray-700"
              >
                {statusOptions.map(status => (
                  <option key={status.key} value={status.key} className="text-gray-700">
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Mobile filter toggle, opzionale: puoi nasconderlo su desktop */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="sm:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <Filter size={16} />
              Filtri
            </button>
          </div>
          {/* Mobile: mostra i filtri sotto la search bar se attivo il toggle */}
          {showMobileFilters && (
            <div className="flex flex-col gap-3 mt-3 sm:hidden">
              {/* Data filter */}
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Filtra per data"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    type="button"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {/* Zona filter */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 appearance-none bg-white text-gray-700"
                >
                  <option value="" className="text-gray-700">Filtra per zona</option>
                  {zonesData.map(zone => (
                    <option key={zone.id} value={zone.id} className="text-gray-700">{zone.label}</option>
                  ))}
                </select>
              </div>
              {/* Stato filter */}
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 appearance-none bg-white text-gray-700"
                >
                  {statusOptions.map(status => (
                    <option key={status.key} value={status.key} className="text-gray-700">
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      

      {/* Table */}
      {viewMode === 'lista' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Top Pagination - Hidden on mobile, visible on tablet+ */}
          <div className="hidden sm:flex px-3 sm:px-6 py-3 bg-gray-50 border-b border-gray-200 flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-gray-700 text-center sm:text-left">
              Pagina {meta.page} di {meta.totalPages} - Totale: {meta.total} interventi
              {loading && !initialLoading && (
                <span className="ml-2 text-teal-600">
                  <div className="inline-block w-3 h-3 border border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Indietro
              </button>
              <span className="px-3 py-1 text-sm text-gray-600 bg-white rounded border">
                {loading ? '...' : currentPage}
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

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                    Azienda
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                    Data
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    Orario
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Zona
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                    Tecnico
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Tipologia
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[130px]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && !initialLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="text-sm text-gray-600">Aggiornamento in corso...</p>
                      </div>
                    </td>
                  </tr>
                ) : interventionsData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Nessun intervento trovato
                    </td>
                  </tr>
                ) : (
                  interventionsData.map((intervention) => (
                    <tr key={intervention.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleRowClick(intervention.id)}>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-900">
                        <div>
                          <div className="font-medium break-words">{intervention.company_name}</div>
                          <div className="text-xs text-gray-500">#{intervention.call_code} ({intervention.id})</div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(intervention.date)}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {intervention.time_slot}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-600">
                        <div className="break-words">{intervention.zone_label}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-600">
                        <div className="break-words">{formatTechnician(intervention.assigned_to_name, intervention.assigned_to_surname)}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-600">
                        <div className="break-words">{intervention.type_label}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(calculateStatus(intervention).key)}`}
                        >
                          {calculateStatus(intervention).label}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Bottom Pagination */}
          <div className="px-3 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-gray-700 text-center sm:text-left">
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
              <span className="px-3 py-1 text-sm text-gray-600 bg-white rounded border">
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
        <div className="w-full">
          <CalendarioView />
        </div>
      )}

      {/* Componente Nuovo Intervento - Solo per amministratori */}
      {isAdmin() && (
        <NuovoIntervento
          isOpen={showNuovoIntervento}
          onClose={() => {
            setShowNuovoIntervento(false);
            fetchInterventionsData(); // Ricarica i dati dopo aver chiuso
          }}
        />
      )}

      {/* Componente Richiedi Assenza - Solo per tecnici */}
      {!isAdmin() && userInfo && (
        <RichiediAssenza
          isOpen={showRichiediAssenza}
          onClose={() => setShowRichiediAssenza(false)}
          userInfo={userInfo}
        />
      )}

      {/* Componente Dettaglio Intervento */}
      {selectedInterventionId && (
        <DettaglioIntervento
          isOpen={showDettaglioIntervento}
          onClose={handleDettaglioClose}
          interventionId={selectedInterventionId}
          onInterventionUpdated={fetchInterventionsData}
        />
      )}
    </div>
  );
} 