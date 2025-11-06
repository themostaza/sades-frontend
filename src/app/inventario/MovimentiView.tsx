'use client';

import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, ArrowLeft, Loader2, X,  Package, MapPin, FileText, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { InventoryMovement, InventoryMovementsResponse, InventoryMovementsFilters } from '../../types/inventory';

interface MovimentiViewProps {
  onMovementClick?: (movementId: string) => void;
}

export default function MovimentiView({ onMovementClick }: MovimentiViewProps) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stati per la paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(20);
  
  // Stati per i filtri
  const [filters, setFilters] = useState<InventoryMovementsFilters>({
    page: 1,
    limit: 20,
    type: undefined,
    search: '',
    from_date: '',
    to_date: '',
    warehouse_id: '',
    article_id: ''
  });
  
  // Stati per il dialog dettaglio
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<InventoryMovement | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  const auth = useAuth();

  // Fetch movimenti
  useEffect(() => {
    fetchMovements();
  }, [filters.page, filters.limit, filters.type, filters.search, filters.from_date, filters.to_date, filters.warehouse_id]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      // Costruisci i parametri query
      const queryParams = new URLSearchParams();
      queryParams.append('page', String(filters.page || 1));
      queryParams.append('limit', String(filters.limit || 20));
      
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.from_date) queryParams.append('from_date', filters.from_date);
      if (filters.to_date) queryParams.append('to_date', filters.to_date);
      if (filters.warehouse_id) queryParams.append('warehouse_id', filters.warehouse_id);
      if (filters.article_id) queryParams.append('article_id', filters.article_id);

      const response = await fetch(`/api/inventory/movements?${queryParams.toString()}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento dei movimenti');
      }

      const data: InventoryMovementsResponse = await response.json();
      setMovements(data.data);
      setTotalPages(data.meta.totalPages);
      setTotalItems(data.meta.total);
      setCurrentPage(data.meta.page);
    } catch (err) {
      console.error('Errore nel fetch dei movimenti:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  // Fetch dettaglio movimento
  const fetchMovementDetail = async (movementId: string) => {
    try {
      setDetailLoading(true);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/inventory/movements/${movementId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento del dettaglio movimento');
      }

      const data = await response.json();
      setSelectedMovement(data.data);
      setShowDetailDialog(true);
    } catch (err) {
      console.error('Errore nel fetch del dettaglio movimento:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFilterChange = (key: keyof InventoryMovementsFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset alla prima pagina quando cambiano i filtri
    }));
  };

  const handleMovementClick = (movement: InventoryMovement) => {
    fetchMovementDetail(movement.id);
    if (onMovementClick) {
      onMovementClick(movement.id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'intra': return 'Trasferimento';
      case 'loading': return 'Caricamento';
      case 'unloading': return 'Scaricamento';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'intra': return 'bg-blue-100 text-blue-800';
      case 'loading': return 'bg-orange-100 text-orange-800';
      case 'unloading': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="space-y-6">
      {/* Filtri */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Ricerca */}
          <div className="relative flex-1 min-w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cerca articoli, codici, note..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-700"
            />
          </div>
          
          {/* Filtro tipo */}
          <select
            value={filters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-700"
          >
            <option value="">Tutti i tipi</option>
            <option value="intra">Trasferimenti</option>
            <option value="loading">Caricamenti</option>
            <option value="unloading">Scaricamenti</option>
          </select>
          
          {/* Filtro data da */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Da:</label>
            <input
              type="date"
              value={filters.from_date || ''}
              onChange={(e) => handleFilterChange('from_date', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-700"
            />
          </div>
          
          {/* Filtro data a */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">A:</label>
            <input
              type="date"
              value={filters.to_date || ''}
              onChange={(e) => handleFilterChange('to_date', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Tabella movimenti */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Movimenti Inventario
            </h2>
            <span className="text-sm text-gray-500">
              {totalItems} movimenti totali
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            <span className="ml-2 text-gray-600">Caricamento movimenti...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-600">
            <span>Errore: {error}</span>
          </div>
        ) : movements.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <span>Nessun movimento trovato</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Ora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Articolo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sorgente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Destinazione
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantità
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movements.map((movement) => (
                    <tr
                      key={movement.id}
                      onClick={() => handleMovementClick(movement)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-gray-400 mr-2" />
                          {formatDate(movement.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(movement.type)}`}>
                          {getTypeLabel(movement.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center">
                          <Package className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="font-medium">{movement.article_description}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                              {movement.pnc_code && (
                                <>
                                  <span>PNC: {movement.pnc_code}</span>
                                  <span>•</span>
                                </>
                              )}
                              <span>ID: {movement.article_id}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {movement.from_warehouse_description ? (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                            {movement.from_warehouse_description}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {movement.to_warehouse_description ? (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                            {movement.to_warehouse_description}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {movement.quantity}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {movement.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginazione */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Precedente
                    </button>
                    <button
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Successivo
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostra <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * itemsPerPage, totalItems)}
                        </span>{' '}
                        di <span className="font-medium">{totalItems}</span> risultati
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowLeft className="h-5 w-5" />
                        </button>
                        
                        {/* Numeri pagina */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                pageNum === currentPage
                                  ? 'z-10 bg-teal-50 border-teal-500 text-teal-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog Dettaglio Movimento */}
      {showDetailDialog && selectedMovement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl min-w-[60vw] min-h-[95vh] max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Dettaglio Movimento
              </h2>
              <button
                onClick={() => setShowDetailDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                  <span className="ml-2 text-gray-600">Caricamento dettagli...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Informazioni generali */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Informazioni Generali</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">ID Movimento</label>
                        <p className="mt-1 text-sm text-gray-900 font-mono">{selectedMovement.id}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tipo</label>
                        <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(selectedMovement.type)}`}>
                          {getTypeLabel(selectedMovement.type)}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Data/Ora Creazione</label>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(selectedMovement.created_at)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Quantità</label>
                        <p className="mt-1 text-sm text-gray-900 font-semibold">{selectedMovement.quantity}</p>
                      </div>
                    </div>
                  </div>

                  {/* Informazioni articolo */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Package className="w-5 h-5 mr-2" />
                      Articolo
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">ID Articolo</label>
                        <p className="mt-1 text-sm text-gray-900 font-mono">{selectedMovement.article_id}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Codice PNC</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedMovement.pnc_code || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Articolo</label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{selectedMovement.article_description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                          {selectedMovement.pnc_code && (
                            <>
                              <span>PNC: {selectedMovement.pnc_code}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>ID: {selectedMovement.article_id}</span>
                        </div>
                      </div>
                      {selectedMovement.article_full_description && selectedMovement.article_full_description !== selectedMovement.article_description && (
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Descrizione Completa</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedMovement.article_full_description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informazioni magazzini */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <MapPin className="w-5 h-5 mr-2" />
                      Magazzini
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Magazzino Sorgente</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedMovement.from_warehouse_description || 'Non specificato'}
                        </p>
                        {selectedMovement.from_warehouse_id && (
                          <p className="mt-1 text-xs text-gray-500 font-mono">ID: {selectedMovement.from_warehouse_id}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Magazzino Destinazione</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedMovement.to_warehouse_description || 'Non specificato'}
                        </p>
                        {selectedMovement.to_warehouse_id && (
                          <p className="mt-1 text-xs text-gray-500 font-mono">ID: {selectedMovement.to_warehouse_id}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Note */}
                  {selectedMovement.notes && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2" />
                        Note
                      </h3>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedMovement.notes}</p>
                    </div>
                  )}

                  {/* Informazioni aggiuntive */}
                  {(selectedMovement.report_id || selectedMovement.intervention_call_code) && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Informazioni Aggiuntive</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedMovement.report_id_joined && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">ID Report</label>
                            <p className="mt-1 text-sm text-gray-900 font-mono">{selectedMovement.report_id_joined}</p>
                          </div>
                        )}
                        {selectedMovement.intervention_call_code && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Codice Intervento</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedMovement.intervention_call_code}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
