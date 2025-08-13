'use client';

import React, { useState, useEffect } from 'react';
import { Plus, InfoIcon, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NuovoIntervento from './NuovoIntervento';
import DettaglioIntervento from './DettaglioIntervento';
import CalendarioView from './CalendarioView';
import RichiediAssenza from './RichiediAssenza';
import { useRouter, useSearchParams } from 'next/navigation';
import { AssistanceIntervention, AssistanceInterventionsApiResponse, UpdateAssistanceInterventionRequest } from '../../types/assistance-interventions';
import { getStatusColor, statusOptions, getStatusId } from '../../utils/intervention-status';
import { updateAssistanceIntervention, fetchAssistanceInterventionDetail } from '../../utils/assistance-interventions-api';
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
  const [pageSize] = useState(50);
  
  // Stati per i dati API
  const [interventionsData, setInterventionsData] = useState<AssistanceIntervention[]>([]);
  const [zonesData, setZonesData] = useState<{id: number, label: string}[]>([]);
  const [techniciansData, setTechniciansData] = useState<{id: number, name: string, surname: string | null}[]>([]);
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
  const [dateRange, setDateRange] = useState<{from: string; to: string}>({from: '', to: ''});
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
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

  // Stati per la selezione multipla
  const [selectedInterventions, setSelectedInterventions] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkActionProgress, setBulkActionProgress] = useState({
    current: 0,
    total: 0,
    currentInterventionId: null as number | null
  });

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

  // Funzione per recuperare i tecnici dall'API (solo per admin)
  const fetchTechniciansData = async () => {
    if (!isAdmin()) return;
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch('/api/users?role_id=2&skip=1000', { headers }); // role_id=2 per i tecnici, skip alto per prendere tutti
      
      if (!response.ok) {
        throw new Error('Failed to fetch technicians data');
      }
      
      const data = await response.json();
      setTechniciansData(data.data || []);
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
      if (dateRange.from && !dateRange.to) {
        // Single date selection
        params.append('date', dateRange.from);
      } else if (dateRange.from && dateRange.to) {
        // Date range selection
        params.append('from_date', dateRange.from);
        params.append('to_date', dateRange.to);
      }
      if (selectedZone) {
        params.append('zone_id', selectedZone);
      }
      if (selectedStatus) {
        const statusId = getStatusId(selectedStatus);
        params.append('status_id', statusId?.toString() || '');
      }
      if (selectedTechnician && isAdmin()) {
        params.append('assigned_to_id', selectedTechnician);
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
  }, [currentPage, searchTerm, dateRange, selectedZone, selectedStatus, selectedTechnician, auth.token, urlParamsRead, userInfo]);

  // Effetto per pulire la selezione quando cambiano i filtri o la pagina
  useEffect(() => {
    clearSelection();
  }, [currentPage, searchTerm, dateRange, selectedZone, selectedStatus, selectedTechnician]);

  // Effetto per caricare le zone al mount del componente
  useEffect(() => {
    fetchZonesData();
  }, [auth.token]);

  // Effetto per caricare i tecnici al mount del componente (solo per admin)
  useEffect(() => {
    if (userInfo && isAdmin()) {
      fetchTechniciansData();
    }
  }, [auth.token, userInfo]);

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

  const handleTechnicianFilter = (technicianId: string) => {
    setSelectedTechnician(technicianId);
    setCurrentPage(1);
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

  // Funzione per verificare se un intervento può essere annullato
  const canInterventionBeCancelled = (intervention: AssistanceIntervention): boolean => {
    const statusKey = (intervention.status_label || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');
    // Stati non annullabili: da_confermare, completato, non_completato, annullato, fatturato
    const nonCancellableStatuses = ['da_confermare', 'completato', 'non_completato', 'annullato', 'fatturato'];
    return !nonCancellableStatuses.includes(statusKey);
  };

  // Funzioni per gestire la selezione multipla
  const handleSelectIntervention = (interventionId: number, selected: boolean) => {
    if (selected) {
      setSelectedInterventions(prev => [...prev, interventionId]);
    } else {
      setSelectedInterventions(prev => prev.filter(id => id !== interventionId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedInterventions(interventionsData.map(intervention => intervention.id));
    } else {
      setSelectedInterventions([]);
    }
  };

  const clearSelection = () => {
    setSelectedInterventions([]);
  };

  // Funzione per duplicazione massiva
  const handleBulkDuplicate = async (cancelOriginals: boolean = true, targetDate?: string) => {
    if (selectedInterventions.length === 0) return;
    
    // Filtra solo gli interventi che possono essere duplicati
    const selectedInterventionsData = interventionsData.filter(intervention => 
      selectedInterventions.includes(intervention.id)
    );
    
    // Stati dinamici che permettono la duplicazione
    const duplicableStatuses = ['da_assegnare', 'attesa_preventivo', 'attesa_ricambio', 'in_carico'];
    
    const duplicableInterventions = selectedInterventionsData.filter(intervention => {
      const statusKey = (intervention.status_label || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_');
      return duplicableStatuses.includes(statusKey);
    });
    
    if (duplicableInterventions.length === 0) {
      alert('Nessuno degli interventi selezionati può essere duplicato. Solo gli interventi con stati dinamici (da assegnare, attesa preventivo, attesa ricambio, in carico) possono essere duplicati.');
      return;
    }
    
    if (duplicableInterventions.length < selectedInterventions.length) {
      const nonDuplicableCount = selectedInterventions.length - duplicableInterventions.length;
      if (!confirm(`${nonDuplicableCount} intervento${nonDuplicableCount !== 1 ? 'i' : ''} selezionat${nonDuplicableCount !== 1 ? 'i' : 'o'} non può essere duplicat${nonDuplicableCount !== 1 ? 'i' : 'o'} (stato non dinamico). Vuoi procedere con la duplicazione dei rimanenti ${duplicableInterventions.length} intervento${duplicableInterventions.length !== 1 ? 'i' : ''}?`)) {
        return;
      }
    }
    
    setBulkActionLoading(true);
    setBulkActionProgress({
      current: 0,
      total: duplicableInterventions.length,
      currentInterventionId: null
    });
    
    try {
      const duplicableIds = duplicableInterventions.map(intervention => intervention.id);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      // Chiamata all'API di duplicazione massiva
      const response = await fetch('/api/assistance-interventions/bulk-duplicate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          intervention_ids: duplicableIds,
          cancel_originals: cancelOriginals,
          user_id: userInfo?.id || '',
          target_date: targetDate
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to duplicate interventions: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Duplicazione completata: ${result.results.duplicated.length} interventi duplicati`);
        if (result.results.cancelled.length > 0) {
          console.log(`✅ Annullamento completato: ${result.results.cancelled.length} interventi annullati`);
        }
        
        // Ricarica i dati e pulisci la selezione
        fetchInterventionsData();
        clearSelection();
      } else {
        console.error('❌ Errori durante la duplicazione:', result.results.errors);
        // Mostra gli errori all'utente
        if (result.results.errors.length > 0) {
          const errorMessages = result.results.errors.map((err: {intervention_id: number, error: string}) => `ID ${err.intervention_id}: ${err.error}`).join('\n');
          alert(`Errori durante la duplicazione:\n${errorMessages}`);
        }
        
        // Se alcune duplicazioni sono riuscite, ricarica comunque i dati
        if (result.results.duplicated.length > 0) {
          fetchInterventionsData();
          clearSelection();
        }
      }
      
    } catch (error) {
      console.error('💥 Errore durante la duplicazione massiva:', error);
      alert('Errore durante la duplicazione degli interventi. Riprova.');
    } finally {
      setBulkActionLoading(false);
      setBulkActionProgress({
        current: 0,
        total: 0,
        currentInterventionId: null
      });
    }
  };

  // Funzione per annullamento massivo
  const handleBulkCancel = async () => {
    if (selectedInterventions.length === 0) return;
    
    // Filtra solo gli interventi che possono essere annullati
    const selectedInterventionsData = interventionsData.filter(intervention => 
      selectedInterventions.includes(intervention.id)
    );
    
    const cancellableInterventions = selectedInterventionsData.filter(intervention => 
      canInterventionBeCancelled(intervention)
    );
    
    if (cancellableInterventions.length === 0) {
      alert('Nessuno degli interventi selezionati può essere annullato. Gli interventi in stato "Da confermare", "Completato", "Non completato", "Annullato" o "Fatturato" non possono essere annullati.');
      return;
    }
    
    if (cancellableInterventions.length < selectedInterventions.length) {
      const nonCancellableCount = selectedInterventions.length - cancellableInterventions.length;
      if (!confirm(`${nonCancellableCount} intervento${nonCancellableCount !== 1 ? 'i' : ''} selezionat${nonCancellableCount !== 1 ? 'i' : 'o'} non può essere annullat${nonCancellableCount !== 1 ? 'i' : 'o'} (stato non annullabile). Vuoi procedere con l'annullamento dei rimanenti ${cancellableInterventions.length} intervento${cancellableInterventions.length !== 1 ? 'i' : ''}?`)) {
        return;
      }
    }
    
    setBulkActionLoading(true);
    setBulkActionProgress({
      current: 0,
      total: cancellableInterventions.length,
      currentInterventionId: null
    });
    
    let successCount = 0;
    let errorCount = 0;
    const cancellableIds = cancellableInterventions.map(intervention => intervention.id);

    try {
      for (let i = 0; i < cancellableIds.length; i++) {
        const interventionId = cancellableIds[i];
        
        // Aggiorna il progresso
        setBulkActionProgress({
          current: i + 1,
          total: cancellableIds.length,
          currentInterventionId: interventionId
        });

        try {
          // Prima recuperiamo i dettagli dell'intervento
          const interventionDetail = await fetchAssistanceInterventionDetail(interventionId, auth.token || '');
          
          // Prepariamo i dati per l'aggiornamento mantenendo tutti i valori esistenti
          const requestData: UpdateAssistanceInterventionRequest = {
            customer_id: interventionDetail.customer_id || 0,
            type_id: interventionDetail.type_id || 0,
            zone_id: interventionDetail.zone_id || 0,
            customer_location_id: interventionDetail.customer_location_id || '',
            flg_home_service: interventionDetail.flg_home_service || false,
            flg_discount_home_service: interventionDetail.flg_discount_home_service || false,
            date: interventionDetail.date || null,
            time_slot: interventionDetail.time_slot || null,
            from_datetime: interventionDetail.from_datetime || null,
            to_datetime: interventionDetail.to_datetime || null,
            quotation_price: parseFloat(interventionDetail.quotation_price) || 0,
            opening_hours: interventionDetail.opening_hours || '',
            assigned_to: interventionDetail.assigned_to || '',
            call_code: interventionDetail.call_code || '',
            internal_notes: interventionDetail.internal_notes || '',
            status_id: 8, // Status "annullato" ha ID 8
            cancelled_by: userInfo?.id || '', // Campo cancelled_by con ID utente corrente
            equipments: interventionDetail.connected_equipment?.map(eq => eq.id) || [],
            articles: interventionDetail.connected_articles?.map(art => ({
              article_id: art.id,
              quantity: art.quantity
            })) || []
          };

          // Chiamata API per aggiornare l'intervento
          await updateAssistanceIntervention(interventionId, requestData, auth.token || '');
          successCount++;
          
        } catch (error) {
          console.error(`Errore nell'annullamento dell'intervento ${interventionId}:`, error);
          errorCount++;
        }
      }

      // Mostra risultato
      if (successCount > 0) {
        // Ricarica i dati
        fetchInterventionsData();
        clearSelection();
      }

      // Potresti aggiungere qui un toast notification per mostrare il risultato
      // Per ora logghiamo il risultato
      console.log(`Operazione completata: ${successCount} successi, ${errorCount} errori`);
      
    } finally {
      setBulkActionLoading(false);
      setBulkActionProgress({
        current: 0,
        total: 0,
        currentInterventionId: null
      });
    }
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
            techniciansData={techniciansData}
            meta={meta}
            loading={loading}
            initialLoading={initialLoading}
            searchTerm={searchTerm}
            dateRange={dateRange}
            selectedZone={selectedZone}
            selectedStatus={selectedStatus}
            selectedTechnician={selectedTechnician}
            showMobileFilters={showMobileFilters}
            isAdmin={isAdmin()}
            selectedInterventions={selectedInterventions}
            bulkActionLoading={bulkActionLoading}
            bulkActionProgress={bulkActionProgress}
            handleSearch={handleSearch}
            handleStatusFilter={handleStatusFilter}
            handleTechnicianFilter={handleTechnicianFilter}
            handleRowClick={handleRowClick}
            handlePageChange={handlePageChange}
            setDateRange={setDateRange}
            setSelectedZone={setSelectedZone}
            setShowMobileFilters={setShowMobileFilters}
            formatDate={formatDate}
            formatTechnician={formatTechnician}
            handleSelectIntervention={handleSelectIntervention}
            handleSelectAll={handleSelectAll}
            clearSelection={clearSelection}
            handleBulkCancel={handleBulkCancel}
            handleBulkDuplicate={handleBulkDuplicate}
            canInterventionBeCancelled={canInterventionBeCancelled}
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
