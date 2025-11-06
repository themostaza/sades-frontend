'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Filter, User, Package, FileText, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AssistanceIntervention, AssistanceInterventionsApiResponse } from '../../types/assistance-interventions';
import { InterventionReportDetail } from '../../types/intervention-reports';
import { getStatusColor, statusOptions, getStatusId, toStatusKey } from '../../utils/intervention-status';
import DateRangePicker from '../../components/DateRangePicker';

interface InterventionsViewProps {
  onInterventionClick?: (interventionId: number) => void;
}

// Componente di Paginazione semplificato
interface SimplePaginationProps {
  meta: {
    page: number;
    totalPages: number;
    total: number;
  };
  loading: boolean;
  currentPage: number;
  onPageChange: (newPage: number) => void;
}

const SimplePagination: React.FC<SimplePaginationProps> = ({
  meta,
  loading,
  currentPage,
  onPageChange,
}) => {
  return (
    <div className="px-3 sm:px-6 py-3 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200">
      <div className="text-sm text-gray-700 text-center sm:text-left">
        Pagina {meta.page} di {meta.totalPages} - Totale: {meta.total} interventi
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Indietro
        </button>
        <span className="px-3 py-1 text-sm text-gray-600 bg-white rounded border">
          {currentPage}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= meta.totalPages || loading}
          className="px-3 py-1 text-sm text-teal-600 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Avanti
        </button>
      </div>
    </div>
  );
};

export default function InterventionsView({ onInterventionClick }: InterventionsViewProps) {
  const [interventionsData, setInterventionsData] = useState<AssistanceIntervention[]>([]);
  const [zonesData, setZonesData] = useState<{id: number, label: string}[]>([]);
  const [techniciansData, setTechniciansData] = useState<{id: number, name: string, surname: string | null}[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stato per i rapportini
  const [reportsData, setReportsData] = useState<Record<number, InterventionReportDetail>>({});
  
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    skip: 20,
    totalPages: 1
  });

  // Stati per i filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{from: string; to: string}>(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    return {
      from: today.toISOString().split('T')[0], // Oggi
      to: tomorrow.toISOString().split('T')[0]  // Domani
    };
  });
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('in_carico');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [selectedManualCheck, setSelectedManualCheck] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  const auth = useAuth();
  const isAdmin = auth.user?.role === 'admin';

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchInterventionsData();
  }, [currentPage, searchTerm, dateRange, selectedZone, selectedStatus, selectedTechnician, selectedManualCheck]);

  const fetchInitialData = async () => {
    if (!auth.token) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

      // Fetch zones
      const zonesResponse = await fetch('/api/zones', { headers });
      if (zonesResponse.ok) {
        const zonesData = await zonesResponse.json();
        setZonesData(zonesData);
      }

      // Fetch technicians (only for admin)
      if (isAdmin) {
        const techniciansResponse = await fetch('/api/users?role=tecnico', { headers });
        if (techniciansResponse.ok) {
          const techniciansData = await techniciansResponse.json();
          setTechniciansData(techniciansData);
        }
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchInterventionsData = async () => {
    if (!auth.token) return;

    try {
      setLoading(true);
      if (initialLoading) setError(null);
      
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
        params.append('date', dateRange.from);
      } else if (dateRange.from && dateRange.to) {
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
      if (selectedTechnician && isAdmin) {
        params.append('assigned_to_id', selectedTechnician);
      }
      if (selectedManualCheck === 'true' || selectedManualCheck === 'false') {
        params.append('manual_check', selectedManualCheck);
      }

      // Se non è admin, filtra solo per i propri interventi
      if (!isAdmin && auth.user?.id) {
        params.append('assigned_to_id', auth.user.id);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

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
      
      // Fetch rapportini per gli interventi che li hanno
      fetchReportsForInterventions(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching interventions:', err);
    } finally {
      setLoading(false);
      if (initialLoading) setInitialLoading(false);
    }
  };

  // Funzione per fetchare i rapportini degli interventi
  const fetchReportsForInterventions = async (interventions: AssistanceIntervention[]) => {
    if (!auth.token) return;

    const interventionsWithReports = interventions.filter(i => i.report_id);
    
    if (interventionsWithReports.length === 0) return;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    };

    // Imposta loading per tutti i report che stiamo per fetchare
    const loadingState: Record<number, boolean> = {};
    interventionsWithReports.forEach(i => {
      if (i.report_id) loadingState[i.report_id] = true;
    });

    // Fetch in parallelo
    const reportPromises = interventionsWithReports.map(async (intervention) => {
      if (!intervention.report_id) return null;
      
      try {
        const response = await fetch(`/api/intervention-reports/${intervention.report_id}`, { headers });
        
        if (!response.ok) {
          console.error(`Failed to fetch report ${intervention.report_id}`);
          return null;
        }
        
        const reportData: InterventionReportDetail = await response.json();
        return { reportId: intervention.report_id, data: reportData };
      } catch (error) {
        console.error(`Error fetching report ${intervention.report_id}:`, error);
        return null;
      }
    });

    const results = await Promise.all(reportPromises);
    
    // Aggiorna lo stato con i rapportini fetchati
    const newReportsData: Record<number, InterventionReportDetail> = {};
    const newLoadingState: Record<number, boolean> = {};
    
    results.forEach(result => {
      if (result) {
        newReportsData[result.reportId] = result.data;
        newLoadingState[result.reportId] = false;
      }
    });
    
    setReportsData(prev => ({ ...prev, ...newReportsData }));
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handleTechnicianFilter = (technicianId: string) => {
    setSelectedTechnician(technicianId);
    setCurrentPage(1);
  };

  const handleManualCheckFilter = (value: string) => {
    setSelectedManualCheck(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowClick = (id: number) => {
    if (onInterventionClick) {
      onInterventionClick(id);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTechnician = (name: string, surname: string | null) => {
    return surname ? `${name} ${surname}` : name;
  };

  if (initialLoading) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <span className="ml-2 text-gray-600">Caricamento interventi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Filtri */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca per azienda, descrizione, tecnico..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700 placeholder-gray-400"
            />
          </div>
          
          {/* Date Range filter */}
          <div className="flex-1 sm:flex-none sm:min-w-[200px]">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Filtra per data"
              className="w-full"
            />
          </div>
          
          {/* Zona filter */}
          <div className="relative flex-1 sm:flex-none sm:min-w-[180px]">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 appearance-none bg-white text-gray-700"
            >
              <option value="" className="text-gray-400">Filtra per zona</option>
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
          
          {/* Tecnico filter - visible only to admin */}
          {isAdmin && (
            <div className="flex-1 sm:flex-none grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tecnico */}
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <select
                  value={selectedTechnician}
                  onChange={(e) => handleTechnicianFilter(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 appearance-none bg-white text-gray-700"
                >
                  <option value="" className="text-gray-400">Filtra per tecnico</option>
                  {techniciansData.map(technician => (
                    <option key={technician.id} value={technician.id} className="text-gray-700">
                      {technician.surname ? `${technician.name} ${technician.surname}` : technician.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Verifica manuale */}
              <div>
                <select
                  value={selectedManualCheck}
                  onChange={(e) => handleManualCheckFilter(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 appearance-none bg-white text-gray-700"
                >
                  <option value="">Verificati e non</option>
                  <option value="true">Solo verificati</option>
                  <option value="false">Solo non verificati</option>
                </select>
              </div>
            </div>
          )}
          
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="sm:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Filter size={16} />
            Filtri
          </button>
        </div>

        {/* Mobile filters */}
        {showMobileFilters && (
          <div className="flex flex-col gap-3 mt-3 sm:hidden">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Filtra per data"
              className="w-full"
            />
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 appearance-none bg-white text-gray-700"
              >
                <option value="" className="text-gray-400">Filtra per zona</option>
                {zonesData.map(zone => (
                  <option key={zone.id} value={zone.id} className="text-gray-700">{zone.label}</option>
                ))}
              </select>
            </div>
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
            {isAdmin && (
              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    value={selectedTechnician}
                    onChange={(e) => handleTechnicianFilter(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 appearance-none bg-white text-gray-700"
                  >
                    <option value="" className="text-gray-400">Filtra per tecnico</option>
                    {techniciansData.map(technician => (
                      <option key={technician.id} value={technician.id} className="text-gray-700">
                        {technician.surname ? `${technician.name} ${technician.surname}` : technician.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={selectedManualCheck}
                    onChange={(e) => handleManualCheckFilter(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 appearance-none bg-white text-gray-700"
                  >
                    <option value="">Verificati e non</option>
                    <option value="true">Solo verificati</option>
                    <option value="false">Solo non verificati</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchInterventionsData}
            className="mt-2 text-red-600 hover:text-red-700 underline"
          >
            Riprova
          </button>
        </div>
      )}

      {/* Tabella Interventi */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Top Pagination */}
        <SimplePagination
          meta={meta}
          loading={loading}
          currentPage={meta.page}
          onPageChange={handlePageChange}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Azienda
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                  Data
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Ora calendario
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
                <th className="px-3 sm:px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && !initialLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p className="text-sm text-gray-600">Aggiornamento in corso...</p>
                    </div>
                  </td>
                </tr>
              ) : interventionsData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Nessun intervento trovato
                  </td>
                </tr>
              ) : (
                interventionsData.map((intervention) => (
                  <React.Fragment key={intervention.id}>
                    {/* Prima riga: dati principali dell'intervento */}
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-900 cursor-pointer" onClick={() => handleRowClick(intervention.id)}>
                        <div>
                          <div className="font-medium break-words">{intervention.company_name}</div>
                          <div className="text-xs text-gray-500">#{intervention.call_code} ({intervention.id})</div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 cursor-pointer" onClick={() => handleRowClick(intervention.id)}>
                        {formatDate(intervention.date)}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 cursor-pointer" onClick={() => handleRowClick(intervention.id)}>
                        {intervention.from_datetime && intervention.to_datetime ? (
                          `${intervention.from_datetime.substring(11, 16)} -> ${intervention.to_datetime.substring(11, 16)}`
                        ) : (
                          intervention.time_slot || '-'
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-600 cursor-pointer" onClick={() => handleRowClick(intervention.id)}>
                        <div className="break-words">{intervention.zone_label}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-600 cursor-pointer" onClick={() => handleRowClick(intervention.id)}>
                        <div className="break-words">{formatTechnician(intervention.assigned_to_name, intervention.assigned_to_surname)}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-600 cursor-pointer" onClick={() => handleRowClick(intervention.id)}>
                        <div className="break-words">{intervention.type_label}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => handleRowClick(intervention.id)}>
                        <span
                          className={`inline-flex w-fit px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(toStatusKey(intervention.status_label))}`}
                        >
                          {intervention.status_label}
                        </span>
                      </td>
                      <td className="px-3 sm:px-3 py-4 text-center">
                        {intervention.report_id ? (
                          <a
                            href={`/interventi/rapportino/${intervention.report_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-teal-600 hover:text-teal-800 inline-flex items-center justify-center"
                            title="Apri rapportino"
                          >
                            <FileText size={18} />
                          </a>
                        ) : null}
                      </td>
                    </tr>
                    
                    {/* Seconda riga: equipment e articoli - confronto pianificato vs effettivo */}
                    <tr className="bg-gray-25">
                      <td colSpan={8} className="px-3 sm:px-6 py-3 border-t-0">
                        {intervention.report_id && reportsData[intervention.report_id] ? (
                          // Mostra confronto se esiste rapportino
                          <div className="space-y-6">
                            {/* Header con legenda */}
                            <div className="flex items-center justify-between bg-gradient-to-r from-teal-50 to-blue-50 p-3 rounded-lg border border-teal-200">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="text-teal-600" size={16} />
                                <span className="font-semibold text-teal-900 text-sm">Confronto: Pianificato vs Utilizzato</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 size={14} className="text-green-600" />
                                  <span className="text-gray-700">Corrispondente</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <AlertTriangle size={14} className="text-amber-600" />
                                  <span className="text-gray-700">Differenze</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <AlertCircle size={14} className="text-red-600" />
                                  <span className="text-gray-700">Mancante</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                              {/* EQUIPMENT */}
                              <div className="space-y-3">
                                {/* Pianificato */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Package className="text-blue-600" size={14} />
                                    <span className="font-semibold text-blue-900 uppercase tracking-wide">
                                      Equipment Pianificato ({intervention.equipment_count || 0})
                                    </span>
                                  </div>
                                  {intervention.connected_equipment && intervention.connected_equipment.length > 0 ? (
                                    <div className="space-y-2">
                                      {intervention.connected_equipment.map((equipment, index) => {
                                        const usedInReport = reportsData[intervention.report_id!].items.some(
                                          item => item.equipment_id === equipment.id
                                        );
                                        return (
                                          <div key={index} className={`rounded p-2 border ${
                                            usedInReport 
                                              ? 'bg-green-50 border-green-300' 
                                              : 'bg-red-50 border-red-300'
                                          }`}>
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <div className="font-medium text-gray-900">
                                                  {equipment.model} (ID: {equipment.id})
                                                </div>
                                                <div className="text-gray-700 mt-1">
                                                  {equipment.description}
                                                </div>
                                                {equipment.serial_number && (
                                                  <div className="text-gray-600 mt-1 text-xs">
                                                    S/N: {equipment.serial_number}
                                                  </div>
                                                )}
                                              </div>
                                              {usedInReport ? (
                                                <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 ml-2" />
                                              ) : (
                                                <AlertCircle size={16} className="text-red-600 flex-shrink-0 ml-2" />
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-gray-500 italic bg-gray-50 rounded p-2">Nessun equipment pianificato</div>
                                  )}
                                </div>
                                
                                {/* Utilizzato */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="text-teal-600" size={14} />
                                    <span className="font-semibold text-teal-900 uppercase tracking-wide">
                                      Equipment Utilizzato ({reportsData[intervention.report_id!].items.length || 0})
                                    </span>
                                  </div>
                                  {reportsData[intervention.report_id!].items.length > 0 ? (
                                    <div className="space-y-2">
                                      {reportsData[intervention.report_id!].items.map((item, index) => {
                                        const wasPlanned = intervention.connected_equipment?.some(
                                          eq => eq.id === item.equipment_id
                                        );
                                        return (
                                          <div key={index} className={`rounded p-2 border ${
                                            wasPlanned 
                                              ? 'bg-green-50 border-green-300' 
                                              : 'bg-amber-50 border-amber-300'
                                          }`}>
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <div className="font-medium text-gray-900">
                                                  Equipment ID: {item.equipment_id}
                                                </div>
                                                {item.note && (
                                                  <div className="text-gray-600 mt-1 text-xs">
                                                    Note: {item.note}
                                                  </div>
                                                )}
                                              </div>
                                              {wasPlanned ? (
                                                <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 ml-2" />
                                              ) : (
                                                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 ml-2" />
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-gray-500 italic bg-gray-50 rounded p-2">Nessun equipment nel rapportino</div>
                                  )}
                                </div>
                              </div>

                              {/* ARTICOLI */}
                              <div className="space-y-3">
                                {/* Pianificato */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Package className="text-green-600" size={14} />
                                    <span className="font-semibold text-green-900 uppercase tracking-wide">
                                      Articoli Pianificati ({intervention.articles_count || 0})
                                    </span>
                                  </div>
                                  {intervention.connected_articles && intervention.connected_articles.length > 0 ? (
                                    <div className="space-y-2">
                                      {intervention.connected_articles.map((article, index) => {
                                        const usedArticles = reportsData[intervention.report_id!].items.flatMap(
                                          item => item.articles || []
                                        );
                                        const usedInReport = usedArticles.find(a => a.article_id === article.id);
                                        const qtyMatch = usedInReport && usedInReport.quantity === article.quantity;
                                        
                                        return (
                                          <div key={index} className={`rounded p-2 border ${
                                            usedInReport && qtyMatch
                                              ? 'bg-green-50 border-green-300'
                                              : usedInReport
                                              ? 'bg-amber-50 border-amber-300'
                                              : 'bg-red-50 border-red-300'
                                          }`}>
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                  <div className="font-medium text-gray-900">
                                                    {article.id}
                                                  </div>
                                                  <div className="bg-gray-700 text-white px-2 py-0.5 rounded text-xs font-medium">
                                                    Qtà: {article.quantity}
                                                    {usedInReport && !qtyMatch && (
                                                      <span className="ml-1 text-amber-300">→ {usedInReport.quantity}</span>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="text-gray-700 mt-1">
                                                  {article.short_description}
                                                </div>
                                                {article.pnc_code && (
                                                  <div className="text-gray-600 mt-1 text-xs">
                                                    PNC: {article.pnc_code}
                                                  </div>
                                                )}
                                              </div>
                                              {usedInReport && qtyMatch ? (
                                                <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 ml-2" />
                                              ) : usedInReport ? (
                                                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 ml-2" />
                                              ) : (
                                                <AlertCircle size={16} className="text-red-600 flex-shrink-0 ml-2" />
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-gray-500 italic bg-gray-50 rounded p-2">Nessun articolo pianificato</div>
                                  )}
                                </div>
                                
                                {/* Utilizzato */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="text-teal-600" size={14} />
                                    <span className="font-semibold text-teal-900 uppercase tracking-wide">
                                      Articoli Utilizzati (
                                      {reportsData[intervention.report_id!].items.reduce(
                                        (total, item) => total + (item.articles?.length || 0), 0
                                      )})
                                    </span>
                                  </div>
                                  {(() => {
                                    const allUsedArticles = reportsData[intervention.report_id!].items.flatMap(
                                      item => item.articles || []
                                    );
                                    return allUsedArticles.length > 0 ? (
                                      <div className="space-y-2">
                                        {allUsedArticles.map((article, index) => {
                                          const wasPlanned = intervention.connected_articles?.find(
                                            a => a.id === article.article_id
                                          );
                                          const qtyMatch = wasPlanned && wasPlanned.quantity === article.quantity;
                                          
                                          return (
                                            <div key={index} className={`rounded p-2 border ${
                                              wasPlanned && qtyMatch
                                                ? 'bg-green-50 border-green-300'
                                                : wasPlanned
                                                ? 'bg-amber-50 border-amber-300'
                                                : 'bg-amber-50 border-amber-300'
                                            }`}>
                                              <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                  <div className="flex items-center justify-between">
                                                    <div className="font-medium text-gray-900">
                                                      {article.article_id}
                                                    </div>
                                                    <div className="bg-teal-700 text-white px-2 py-0.5 rounded text-xs font-medium">
                                                      Qtà: {article.quantity}
                                                      {wasPlanned && !qtyMatch && (
                                                        <span className="ml-1 text-amber-300">(era {wasPlanned.quantity})</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  {article.article_name && (
                                                    <div className="text-gray-700 mt-1">
                                                      {article.article_name}
                                                    </div>
                                                  )}
                                                </div>
                                                {wasPlanned && qtyMatch ? (
                                                  <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 ml-2" />
                                                ) : wasPlanned ? (
                                                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 ml-2" />
                                                ) : (
                                                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 ml-2" />
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-gray-500 italic bg-gray-50 rounded p-2">Nessun articolo nel rapportino</div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Vista normale senza rapportino
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                            {/* Equipment */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="text-blue-600" size={14} />
                                <span className="font-medium text-gray-700">
                                  Equipment ({intervention.equipment_count || 0})
                                </span>
                              </div>
                              {intervention.connected_equipment && intervention.connected_equipment.length > 0 ? (
                                <div className="space-y-2">
                                  {intervention.connected_equipment.map((equipment, index) => (
                                    <div key={index} className="bg-blue-50 rounded p-2 border border-blue-100">
                                      <div className="font-medium text-blue-900">
                                        {equipment.model} (ID: {equipment.id})
                                      </div>
                                      <div className="text-blue-700 mt-1">
                                        {equipment.description}
                                      </div>
                                      {equipment.serial_number && (
                                        <div className="text-blue-600 mt-1 text-xs">
                                          S/N: {equipment.serial_number}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-gray-500 italic">Nessun equipment collegato</div>
                              )}
                            </div>
                            
                            {/* Articoli/Pezzi di ricambio */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="text-green-600" size={14} />
                                <span className="font-medium text-gray-700">
                                  Pezzi di ricambio ({intervention.articles_count || 0})
                                </span>
                              </div>
                              {intervention.connected_articles && intervention.connected_articles.length > 0 ? (
                                <div className="space-y-2">
                                  {intervention.connected_articles.map((article, index) => (
                                    <div key={index} className="bg-green-50 rounded p-2 border border-green-100">
                                      <div className="flex items-center justify-between">
                                        <div className="font-medium text-green-900">
                                          {article.id}
                                        </div>
                                        <div className="bg-green-600 text-white px-2 py-0.5 rounded text-xs font-medium">
                                          Qtà: {article.quantity}
                                        </div>
                                      </div>
                                      <div className="text-green-700 mt-1">
                                        {article.short_description}
                                      </div>
                                      {article.description && (
                                        <div className="text-green-600 mt-1 text-xs">
                                          {article.description}
                                        </div>
                                      )}
                                      {article.pnc_code && (
                                        <div className="text-green-600 mt-1 text-xs">
                                          PNC: {article.pnc_code}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-gray-500 italic">Nessun pezzo di ricambio utilizzato</div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Bottom Pagination */}
        <SimplePagination
          meta={meta}
          loading={loading}
          currentPage={meta.page}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
