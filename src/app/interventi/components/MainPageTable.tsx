'use client';

import React from 'react';
import { Search, MapPin, X, Filter } from 'lucide-react';
import { AssistanceIntervention } from '../../../types/assistance-interventions';
import { calculateStatus, getStatusColor, statusOptions } from '../../../utils/intervention-status';

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
  meta: { page: number; totalPages: number; total: number; };
  loading: boolean;
  initialLoading: boolean;
  
  // Stati dei filtri
  searchTerm: string;
  selectedDate: string;
  selectedZone: string;
  selectedStatus: string;
  showMobileFilters: boolean;

  // Gestori di eventi
  handleSearch: (value: string) => void;
  handleStatusFilter: (status: string) => void;
  handleRowClick: (id: number) => void;
  handlePageChange: (page: number) => void;
  setSelectedDate: (date: string) => void;
  setSelectedZone: (zone: string) => void;
  setShowMobileFilters: (show: boolean) => void;
  formatDate: (date: string) => string;
  formatTechnician: (name: string, surname: string | null) => string;
}

const MainPageTable: React.FC<MainPageTableProps> = ({
  interventionsData,
  zonesData,
  meta,
  loading,
  initialLoading,
  searchTerm,
  selectedDate,
  selectedZone,
  selectedStatus,
  showMobileFilters,
  handleSearch,
  handleStatusFilter,
  handleRowClick,
  handlePageChange,
  setSelectedDate,
  setSelectedZone,
  setShowMobileFilters,
  formatDate,
  formatTechnician,
}) => {
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
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          calculateStatus({
                            invoiced_by: intervention.invoiced_by ?? null,
                            cancelled_by: intervention.cancelled_by ?? null,
                            assigned_to: null, // non disponibile in AssistanceIntervention
                            date: intervention.date ?? null,
                            time_slot: intervention.time_slot ?? null,
                            from_datetime: intervention.from_datetime ?? null,
                            to_datetime: intervention.to_datetime ?? null,
                            report_id: intervention.report_id ?? null,
                            approved_by: null, // non disponibile in AssistanceIntervention
                            report_is_failed: intervention.report_is_failed ?? null,
                          }).key
                        )}`}
                      >
                        {calculateStatus({
                          invoiced_by: intervention.invoiced_by ?? null,
                          cancelled_by: intervention.cancelled_by ?? null,
                          assigned_to: null, // non disponibile in AssistanceIntervention
                          date: intervention.date ?? null,
                          time_slot: intervention.time_slot ?? null,
                          from_datetime: intervention.from_datetime ?? null,
                          to_datetime: intervention.to_datetime ?? null,
                          report_id: intervention.report_id ?? null,
                          approved_by: null, // non disponibile in AssistanceIntervention
                          report_is_failed: intervention.report_is_failed ?? null,
                        }).label}
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
    </>
  );
};

export default MainPageTable;
