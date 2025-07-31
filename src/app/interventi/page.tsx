'use client';

import React, { useState, useEffect } from 'react';
import { Plus, InfoIcon, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NuovoIntervento from './NuovoIntervento';
import DettaglioIntervento from './DettaglioIntervento';
import CalendarioView from './CalendarioView';
import RichiediAssenza from './RichiediAssenza';
import { useRouter, useSearchParams } from 'next/navigation';
import { AssistanceIntervention, AssistanceInterventionsApiResponse } from '../../types/assistance-interventions';
import { getStatusColor, statusOptions, getStatusId } from '../../utils/intervention-status';
import MainPageTable from './components/MainPageTable';


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
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch user info');
      }
      
      const userData: UserInfo = await response.json();
      setUserInfo(userData);
    } catch {
    } finally {
      setUserLoading(false);
    }
  };

  // Effect to handle URL search parameters for status filtering and deep linking
  useEffect(() => {
    const statusFromUrl = searchParams.get('status');
    const interventionIdFromUrl = searchParams.get('ai'); // assistance intervention ID
    
    if (statusFromUrl) {
      setSelectedStatus(statusFromUrl);
    }
    
    // Deep link: se c'è il parametro "ai", apri direttamente il dettaglio
    if (interventionIdFromUrl) {
      const interventionId = parseInt(interventionIdFromUrl, 10);
      if (!isNaN(interventionId)) {
        setSelectedInterventionId(interventionId);
        setShowDettaglioIntervento(true);
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
    
    const currentParams = new URLSearchParams(searchParams.toString());
    if (currentParams.has('ai')) {
      currentParams.delete('ai');
      const newUrl = currentParams.toString() 
        ? `/interventi?${currentParams.toString()}` 
        : '/interventi';
      router.replace(newUrl);
    }
    
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

      const response = await fetch('/api/zones', { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch zones data');
      }
      
      const data = await response.json();
      setZonesData(data);
    } catch {
    }
  };

  // Funzione per recuperare i dati dall'API
  const fetchInterventionsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        skip: pageSize.toString(),
        sort_by: 'id',
        sort_order: 'desc',
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
        const statusId = getStatusId(selectedStatus);
        params.append('status_id', statusId?.toString() || '');
      }

      if (userInfo && !isAdmin()) {
        params.append('assigned_to_id', userInfo.id);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/assistance-interventions?${params.toString()}`, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch interventions data');
      }
      
      const data: AssistanceInterventionsApiResponse = await response.json();
      
      setInterventionsData(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Effetto per caricare i dati iniziali e quando cambiano i filtri
  useEffect(() => {
    if (!urlParamsRead) return;
    if (!isAdmin() && !userInfo) return;
    
    fetchInterventionsData();
  }, [currentPage, searchTerm, selectedDate, selectedZone, selectedStatus, auth.token, urlParamsRead, userInfo]);

  // Effetto per caricare le zone al mount del componente
  useEffect(() => {
    fetchZonesData();
  }, [auth.token]);

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
    
    if (status === '') {
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      router.replace(url.pathname + (url.search ? url.search : ''), { scroll: false });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString.trim() === '') return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      if (date.getFullYear() <= 1970) return '-';
      return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    } catch {
      return '-';
    }
  };

  const formatTechnician = (name: string, surname: string | null) => {
    if (!name) return '-';
    return surname ? `${name} ${surname}` : name;
  };

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
          {isAdmin() && (
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('lista')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'lista' ? 'bg-teal-600 text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Lista
              </button>
              <button
                onClick={() => setViewMode('calendario')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'calendario' ? 'bg-teal-600 text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Calendario
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Totale: {meta.total}</span>
            <InfoIcon size={16} />
          </div>
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

      {selectedStatus && (
        <div className="mt-1 flex items-center gap-2 flex-wrap mb-4">
          <span className="text-sm text-gray-600">Filtrato per stato:</span>
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedStatus)}`}>
            {statusOptions.find(s => s.key === selectedStatus)?.label}
          </span>
          <button onClick={() => handleStatusFilter('')} className="text-gray-400 hover:text-gray-600 ml-1" title="Rimuovi filtro">
            <X size={14} />
          </button>
        </div>
      )}

      {viewMode === 'lista' && (
        <MainPageTable
            interventionsData={interventionsData}
            zonesData={zonesData}
            meta={meta}
            loading={loading}
            initialLoading={initialLoading}
            searchTerm={searchTerm}
            selectedDate={selectedDate}
            selectedZone={selectedZone}
            selectedStatus={selectedStatus}
            showMobileFilters={showMobileFilters}
            handleSearch={handleSearch}
            handleStatusFilter={handleStatusFilter}
            handleRowClick={handleRowClick}
            handlePageChange={handlePageChange}
            setSelectedDate={setSelectedDate}
            setSelectedZone={setSelectedZone}
            setShowMobileFilters={setShowMobileFilters}
            formatDate={formatDate}
            formatTechnician={formatTechnician}
        />
      )}

      {viewMode === 'calendario' && (
        <div className="w-full">
          <CalendarioView />
        </div>
      )}

      {isAdmin() && (
        <NuovoIntervento
          isOpen={showNuovoIntervento}
          onClose={() => {
            setShowNuovoIntervento(false);
            fetchInterventionsData();
          }}
        />
      )}

      {!isAdmin() && userInfo && (
        <RichiediAssenza
          isOpen={showRichiediAssenza}
          onClose={() => setShowRichiediAssenza(false)}
          userInfo={userInfo}
        />
      )}

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
