'use client';

import React, { useState } from 'react';
import { Search, MapPin, Filter, User, X, AlertCircle, Copy } from 'lucide-react';
import { AssistanceIntervention } from '../../../types/assistance-interventions';
import { getStatusColor, statusOptions } from '../../../utils/intervention-status';
import DateRangePicker from '../../../components/DateRangePicker';

// --- Componente di Paginazione Riutilizzabile ---
interface PaginationControlsProps {
  meta: {
    page: number;
    totalPages: number;
    total: number;
  };
  loading: boolean;
  currentPage: number;
  onPageChange: (newPage: number) => void;
  className?: string;
  showLoadingIndicator?: boolean;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  meta,
  loading,
  currentPage,
  onPageChange,
  className = '',
  showLoadingIndicator = false,
}) => {
  return (
    <div className={`px-3 sm:px-6 py-3 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}>
      <div className="text-sm text-gray-700 text-center sm:text-left">
        Pagina {meta.page} di {meta.totalPages} - Totale: {meta.total} interventi
        {showLoadingIndicator && loading && (
          <span className="ml-2 text-teal-600">
            <div className="inline-block w-3 h-3 border border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          </span>
        )}
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
          {showLoadingIndicator && loading ? '...' : currentPage}
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


interface MainPageTableProps {
  // Dati
  interventionsData: AssistanceIntervention[];
  zonesData: { id: number; label: string }[];
  techniciansData: { id: number; name: string; surname: string | null }[];
  meta: { page: number; totalPages: number; total: number; };
  loading: boolean;
  initialLoading: boolean;
  
  // Stati dei filtri
  searchTerm: string;
  dateRange: {from: string; to: string};
  selectedZone: string;
  selectedStatus: string;
  selectedTechnician: string;
  showMobileFilters: boolean;
  isAdmin: boolean;

  // Stati per selezione multipla
  selectedInterventions: number[];
  bulkActionLoading: boolean;
  bulkActionProgress: {
    current: number;
    total: number;
    currentInterventionId: number | null;
  };

  // Gestori di eventi
  handleSearch: (value: string) => void;
  handleStatusFilter: (status: string) => void;
  handleTechnicianFilter: (technicianId: string) => void;
  handleRowClick: (id: number) => void;
  handlePageChange: (page: number) => void;
  setDateRange: (dateRange: {from: string; to: string}) => void;
  setSelectedZone: (zone: string) => void;
  setShowMobileFilters: (show: boolean) => void;
  formatDate: (date: string) => string;
  formatTechnician: (name: string, surname: string | null) => string;
  
  // Gestori per selezione multipla
  handleSelectIntervention: (interventionId: number, selected: boolean) => void;
  handleSelectAll: (selected: boolean) => void;
  clearSelection: () => void;
  handleBulkCancel: () => void;
  handleBulkDuplicate: (cancelOriginals?: boolean, targetDate?: string) => void;
  canInterventionBeCancelled: (intervention: AssistanceIntervention) => boolean;
}

const MainPageTable: React.FC<MainPageTableProps> = ({
  interventionsData,
  zonesData,
  techniciansData,
  meta,
  loading,
  initialLoading,
  searchTerm,
  dateRange,
  selectedZone,
  selectedStatus,
  selectedTechnician,
  showMobileFilters,
  isAdmin,
  selectedInterventions,
  bulkActionLoading,
  bulkActionProgress,
  handleSearch,
  handleStatusFilter,
  handleTechnicianFilter,
  handleRowClick,
  handlePageChange,
  setDateRange,
  setSelectedZone,
  setShowMobileFilters,
  formatDate,
  formatTechnician,
  handleSelectIntervention,
  handleSelectAll,
  clearSelection,
  handleBulkCancel,
  handleBulkDuplicate,
  canInterventionBeCancelled,
}) => {
  const toStatusKey = (label?: string | null) =>
    (label || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');
  const [showBulkCancelConfirm, setShowBulkCancelConfirm] = useState(false);
  const [showBulkDuplicateConfirm, setShowBulkDuplicateConfirm] = useState(false);
  const [duplicateWithCancel, setDuplicateWithCancel] = useState(true);
  const [duplicateDate, setDuplicateDate] = useState(() => {
    // Default: domani
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  // Verifica se tutti gli interventi selezionati possono essere annullati
  const selectedInterventionsData = interventionsData.filter(intervention => 
    selectedInterventions.includes(intervention.id)
  );
  
  const canCancelAnySelected = selectedInterventions.length > 0 && 
    selectedInterventionsData.length > 0 &&
    selectedInterventionsData.every(intervention => canInterventionBeCancelled(intervention));

  const handleBulkCancelClick = () => {
    setShowBulkCancelConfirm(true);
  };

  const handleBulkCancelConfirm = () => {
    setShowBulkCancelConfirm(false);
    handleBulkCancel();
  };

  const handleBulkCancelCancel = () => {
    setShowBulkCancelConfirm(false);
  };

  const handleBulkDuplicateClick = () => {
    // Reset della data a domani ogni volta che si apre il dialog
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDuplicateDate(tomorrow.toISOString().split('T')[0]);
    setShowBulkDuplicateConfirm(true);
  };

  const handleBulkDuplicateConfirm = () => {
    setShowBulkDuplicateConfirm(false);
    handleBulkDuplicate(duplicateWithCancel, duplicateDate);
  };

  const handleBulkDuplicateCancel = () => {
    setShowBulkDuplicateConfirm(false);
  };

  // Stati dinamici che permettono la duplicazione
  const duplicableStatuses = ['da_assegnare', 'attesa_preventivo', 'attesa_ricambio', 'in_carico'];

  // Verifica se un intervento può essere duplicato (solo stati dinamici)
  const canInterventionBeDuplicated = (intervention: AssistanceIntervention): boolean => {
    const statusKey = toStatusKey(intervention.status_label);
    return duplicableStatuses.includes(statusKey);
  };

  // Verifica se tutti gli interventi selezionati possono essere duplicati
  const canDuplicateAnySelected = selectedInterventions.length > 0 && 
    selectedInterventionsData.length > 0 &&
    selectedInterventionsData.every(intervention => canInterventionBeDuplicated(intervention));

  return (
    <>
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
            <div className="relative flex-1 sm:flex-none sm:min-w-[180px]">
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
          )}
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
            {/* Date Range filter */}
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Filtra per data"
              className="w-full"
            />
            {/* Zona filter */}
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
            {/* Tecnico filter - visible only to admin */}
            {isAdmin && (
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
            )}
          </div>
        )}
      </div>

      {/* Barra delle azioni massive - solo per admin */}
      {isAdmin && selectedInterventions.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900">
                {selectedInterventions.length} intervento{selectedInterventions.length !== 1 ? 'i' : ''} selezionat{selectedInterventions.length !== 1 ? 'i' : 'o'}
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Deseleziona tutto
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDuplicateClick}
                disabled={bulkActionLoading || !canDuplicateAnySelected}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                title={!canDuplicateAnySelected ? 'Solo gli interventi con stati dinamici (da assegnare, attesa preventivo, attesa ricambio, in carico) possono essere duplicati' : 'Duplica gli interventi selezionati per una data futura'}
              >
                {bulkActionLoading ? (
                  <>
                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                    {bulkActionProgress.total > 0 
                      ? `Duplicando ${bulkActionProgress.current}/${bulkActionProgress.total}...`
                      : 'Duplicando...'
                    }
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Duplica interventi
                  </>
                )}
              </button>
              <button
                onClick={handleBulkCancelClick}
                disabled={bulkActionLoading || !canCancelAnySelected}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                title={!canCancelAnySelected ? 'Nessuno degli interventi selezionati può essere annullato' : 'Annulla gli interventi selezionati'}
              >
                {bulkActionLoading ? (
                  <>
                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                    {bulkActionProgress.total > 0 
                      ? `Annullando ${bulkActionProgress.current}/${bulkActionProgress.total}...`
                      : 'Annullando...'
                    }
                  </>
                ) : (
                  <>
                    <X size={16} />
                    Annulla selezionati
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Barra di progresso */}
          {bulkActionLoading && bulkActionProgress.total > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
                <span>Progresso annullamento</span>
                <span>{Math.round((bulkActionProgress.current / bulkActionProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(bulkActionProgress.current / bulkActionProgress.total) * 100}%` }}
                ></div>
              </div>
              {bulkActionProgress.currentInterventionId && (
                <div className="text-xs text-blue-600 mt-1">
                  Elaborando intervento ID: {bulkActionProgress.currentInterventionId}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Top Pagination */}
        <PaginationControls
          meta={meta}
          loading={loading}
          currentPage={meta.page}
          onPageChange={handlePageChange}
          className="hidden sm:flex border-b border-gray-200"
          showLoadingIndicator={!initialLoading}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {isAdmin && (
                  <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={selectedInterventions.length === interventionsData.length && interventionsData.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 focus:ring-2"
                    />
                  </th>
                )}
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && !initialLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p className="text-sm text-gray-600">Aggiornamento in corso...</p>
                    </div>
                  </td>
                </tr>
              ) : interventionsData.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-6 py-8 text-center text-gray-500">
                    Nessun intervento trovato
                  </td>
                </tr>
              ) : (
                interventionsData.map((intervention) => (
                  <tr key={intervention.id} className="hover:bg-gray-50 transition-colors">
                    {isAdmin && (
                      <td className="px-3 sm:px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedInterventions.includes(intervention.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectIntervention(intervention.id, e.target.checked);
                          }}
                          className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 focus:ring-2"
                        />
                      </td>
                    )}
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
                        `${new Date(intervention.from_datetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} -> ${new Date(intervention.to_datetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
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
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(toStatusKey(intervention.status_label))}`}
                      >
                        {intervention.status_label}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Bottom Pagination */}
        <PaginationControls
          meta={meta}
          loading={loading}
          currentPage={meta.page}
          onPageChange={handlePageChange}
          className="border-t border-gray-200"
        />
      </div>

      {/* Dialog di conferma per duplicazione massiva */}
      {showBulkDuplicateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Copy className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Duplica interventi selezionati
                </h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-4">
                Sei sicuro di voler duplicare {selectedInterventions.length} intervento{selectedInterventions.length !== 1 ? 'i' : ''}? 
                Tutti gli interventi selezionati verranno duplicati con stato &quot;Da assegnare&quot;.
              </p>
              
              {/* Selettore data */}
              <div className="mb-4">
                <label htmlFor="duplicateDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Data di duplicazione:
                </label>
                <input
                  type="date"
                  id="duplicateDate"
                  value={duplicateDate}
                  min={new Date().toISOString().split('T')[0]} // Minimo oggi
                  onChange={(e) => setDuplicateDate(e.target.value)}
                  className="text-gray-700 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Checkbox annullamento */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="duplicateWithCancel"
                  checked={duplicateWithCancel}
                  onChange={(e) => setDuplicateWithCancel(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="duplicateWithCancel" className="ml-2 text-sm text-gray-700">
                  Annulla automaticamente gli interventi originali
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleBulkDuplicateCancel}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleBulkDuplicateConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Conferma duplicazione
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog di conferma per annullamento massivo */}
      {showBulkCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Annulla interventi selezionati
                </h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Sei sicuro di voler annullare {selectedInterventions.length} intervento{selectedInterventions.length !== 1 ? 'i' : ''}? 
                Questa operazione non può essere annullata. Tutti gli interventi selezionati passeranno allo status &quot;Annullato&quot;.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleBulkCancelCancel}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleBulkCancelConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Conferma annullamento
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MainPageTable;
