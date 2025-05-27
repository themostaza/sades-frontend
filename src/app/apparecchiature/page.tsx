'use client';

import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { useEquipments } from '../../hooks/useEquipments';
import { useAuth } from '../../contexts/AuthContext';
import DettaglioApparecchiatura from './DettaglioApparecchiatura';

export default function ApparecchiaturePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    equipments,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    fetchEquipments,
    refetch
  } = useEquipments();

  // Local state for UI
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const itemsPerPage = 20;

  // Stati per la navigazione
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);

  // Initial load
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchEquipments({ page: '1', skip: itemsPerPage.toString() });
    }
  }, [isAuthenticated, authLoading, fetchEquipments]);

  // Handle search with debouncing
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      fetchEquipments({
        page: '1',
        skip: itemsPerPage.toString(),
        query: value.trim() || undefined
      });
    }, 500);

    setSearchTimeout(timeout);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchEquipments({
        page: newPage.toString(),
        skip: itemsPerPage.toString(),
        query: searchTerm.trim() || undefined
      });
    }
  };

  // Handle equipment detail navigation
  const handleOpenEquipmentDetail = (equipmentId: number) => {
    setSelectedEquipmentId(equipmentId);
    setCurrentView('detail');
  };

  const handleCloseEquipmentDetail = () => {
    setCurrentView('list');
    setSelectedEquipmentId(null);
  };

  const handleEquipmentUpdated = () => {
    // Ricarica la lista quando un'apparecchiatura viene aggiornata
    fetchEquipments({
      page: currentPage.toString(),
      skip: itemsPerPage.toString(),
      query: searchTerm.trim() || undefined
    });
  };

  // Format serial numbers display
  const formatSerialNumbers = (serialNumber: string | null, linkedSerials: string | null) => {
    const serials = [];
    if (serialNumber) serials.push(serialNumber);
    if (linkedSerials) serials.push(linkedSerials);
    return serials.length > 0 ? serials.join(', ') : '-';
  };

  // Truncate text for display
  const truncateText = (text: string, maxLength: number = 25) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Show equipment detail if in detail view
  if (currentView === 'detail' && selectedEquipmentId) {
    return (
      <DettaglioApparecchiatura
        equipmentId={selectedEquipmentId}
        onBack={handleCloseEquipmentDetail}
        onEquipmentUpdated={handleEquipmentUpdated}
      />
    );
  }

  // Show loading if auth is still loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-teal-600" size={32} />
        <span className="ml-2 text-gray-600">Caricamento...</span>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-600 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Accesso richiesto</h2>
          <p className="text-gray-600">Effettua il login per visualizzare le apparecchiature.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Apparecchiature</h1>
      </div>

      {/* Search and filters */}
      <div className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca seriale, marchio, categoria, modello o nome apparecchiatura"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          
          {/* Filter buttons - For now, these are placeholders */}
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span>Apparecchiatura</span>
              <ChevronDown size={16} />
            </button>
          </div>
          
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span>Proprietà</span>
              <ChevronDown size={16} />
            </button>
          </div>
          
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span>Marchio</span>
              <ChevronDown size={16} />
            </button>
          </div>
          
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span>Modello</span>
              <ChevronDown size={16} />
            </button>
          </div>
          
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span>Sottofamiglia</span>
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-teal-600" size={32} />
          <span className="ml-2 text-gray-600">Caricamento apparecchiature...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="text-red-600" size={20} />
            <span className="ml-2 text-red-800">{error}</span>
          </div>
          <button 
            onClick={refetch}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Riprova
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Apparecchiatura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proprietà
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marchio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modello
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sottofamiglia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Numeri seriali associati
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {equipments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm ? 'Nessuna apparecchiatura trovata per la ricerca corrente' : 'Nessuna apparecchiatura disponibile'}
                    </td>
                  </tr>
                ) : (
                  equipments.map((equipment) => (
                    <tr key={equipment.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleOpenEquipmentDetail(equipment.id)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">
                          {truncateText(equipment.description)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {truncateText(equipment.customer_name)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {equipment.brand_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {equipment.model || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {equipment.subfamily_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatSerialNumbers(equipment.serial_number, equipment.linked_serials)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Pagina {currentPage} di {totalPages} - Totale: {totalItems} apparecchiature
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
                  disabled={currentPage >= totalPages || loading}
                  className="px-3 py-1 text-sm text-teal-600 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Avanti
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
