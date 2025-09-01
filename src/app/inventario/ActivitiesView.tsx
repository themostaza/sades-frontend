'use client';

import React, { useState, useEffect } from 'react';
import { Package, MapPin, AlertTriangle, FileText, X, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Anomaly {
  id: string;
  type: 'report_discrepancy' | 'physical_digital_mismatch';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  warehouseId?: string;
  warehouseName?: string;
  articleId?: string;
  articleCode?: string;
  quantity?: number;
  reportId?: string;
}

interface AnomalyResolutionItem {
  articleId: string;
  articleCode: string;
  articleDescription: string;
  totalQuantityToRemove: number;
  warehouseAllocations: {
    warehouseId: string;
    quantity: number;
  }[];
}

interface Warehouse {
  id: string;
  description: string;
}



export default function ActivitiesView() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showAllAnomalies, setShowAllAnomalies] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stati per la risoluzione anomalie
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [resolutionItems, setResolutionItems] = useState<AnomalyResolutionItem[]>([]);
  const [resolutionLoading, setResolutionLoading] = useState(false);

  const auth = useAuth();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    if (!auth.token) return;

    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

      // Fetch warehouses
      const warehousesEndpoint = auth.user?.role === 'tecnico' || auth.user?.role === 'ufficio_tecnico' ? '/api/assigned-warehouses' : '/api/warehouses';
      const warehousesResponse = await fetch(warehousesEndpoint, { headers });
      
      if (warehousesResponse.ok) {
        const warehousesData = await warehousesResponse.json();
        setWarehouses(warehousesData);
      }

      // Fetch anomalies (per ora simuliamo i dati)
      await fetchAnomalies();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnomalies = async () => {
    // Per ora simuliamo le anomalie - in futuro verranno da API dedicata
    const mockAnomalies: Anomaly[] = [
      {
        id: '1',
        type: 'report_discrepancy',
        title: 'Discrepanza da Report #2024-001',
        description: 'Utilizzati 5 pezzi in più del previsto per TERMO001',
        severity: 'high',
        warehouseId: 'MAG001',
        warehouseName: 'MAGAZZINO SADES',
        articleId: 'TERMO001',
        articleCode: 'TERMO001',
        quantity: 5,
        reportId: '2024-001'
      },
      {
        id: '2',
        type: 'report_discrepancy',
        title: 'Discrepanza da Report #2024-003',
        description: 'Utilizzati 2 pezzi in più del previsto per MANOP003',
        severity: 'medium',
        warehouseId: 'MAG001',
        warehouseName: 'MAGAZZINO SADES',
        articleId: 'MANOP003',
        articleCode: 'MANOP003',
        quantity: 2,
        reportId: '2024-003'
      },
      {
        id: '3',
        type: 'physical_digital_mismatch',
        title: 'Discrepanza inventario fisico',
        description: 'Trovati 3 pezzi in meno durante il controllo fisico per ART007',
        severity: 'medium',
        warehouseId: 'MAG002',
        warehouseName: 'MAGAZZINO TECNICO',
        articleId: 'ART007',
        articleCode: 'ART007',
        quantity: 3
      }
    ];
    
    setAnomalies(mockAnomalies);
  };

  const handleResolveAnomaly = (anomaly: Anomaly) => {
    setSelectedAnomaly(anomaly);
    
    // Prepara gli items per la risoluzione
    if (anomaly.articleId && anomaly.articleCode && anomaly.quantity) {
      const items: AnomalyResolutionItem[] = [{
        articleId: anomaly.articleId,
        articleCode: anomaly.articleCode,
        articleDescription: `Articolo ${anomaly.articleCode}`, // In futuro verrà dalla API
        totalQuantityToRemove: anomaly.quantity,
        warehouseAllocations: []
      }];
      setResolutionItems(items);
    }
    
    setShowResolutionModal(true);
  };

  const addWarehouseAllocation = (itemIndex: number) => {
    setResolutionItems(prev => prev.map((item, index) => 
      index === itemIndex ? {
        ...item,
        warehouseAllocations: [...item.warehouseAllocations, { warehouseId: '', quantity: 0 }]
      } : item
    ));
  };

  const updateWarehouseAllocation = (itemIndex: number, allocationIndex: number, field: 'warehouseId' | 'quantity', value: string | number) => {
    setResolutionItems(prev => prev.map((item, index) => 
      index === itemIndex ? {
        ...item,
        warehouseAllocations: item.warehouseAllocations.map((allocation, allocIndex) =>
          allocIndex === allocationIndex ? { ...allocation, [field]: value } : allocation
        )
      } : item
    ));
  };

  const removeWarehouseAllocation = (itemIndex: number, allocationIndex: number) => {
    setResolutionItems(prev => prev.map((item, index) => 
      index === itemIndex ? {
        ...item,
        warehouseAllocations: item.warehouseAllocations.filter((_, allocIndex) => allocIndex !== allocationIndex)
      } : item
    ));
  };

  const handleConfirmResolution = async () => {
    if (!selectedAnomaly) return;
    
    // Verifica che tutte le allocazioni siano complete e corrette
    for (const item of resolutionItems) {
      // Verifica che ci siano allocazioni
      if (item.warehouseAllocations.length === 0) {
        alert(`Aggiungi almeno un magazzino per l'articolo ${item.articleCode}`);
        return;
      }
      
      // Verifica che tutte le allocazioni abbiano magazzino e quantità
      const incompleteAllocations = item.warehouseAllocations.filter(
        alloc => !alloc.warehouseId || alloc.quantity <= 0
      );
      if (incompleteAllocations.length > 0) {
        alert(`Completa tutte le allocazioni per l'articolo ${item.articleCode}`);
        return;
      }
      
      // Verifica che la somma delle quantità corrisponda al totale richiesto
      const totalAllocated = item.warehouseAllocations.reduce((sum, alloc) => sum + alloc.quantity, 0);
      if (totalAllocated !== item.totalQuantityToRemove) {
        alert(`La somma delle quantità per ${item.articleCode} deve essere ${item.totalQuantityToRemove}, attualmente è ${totalAllocated}`);
        return;
      }
    }
    
    setResolutionLoading(true);
    
    try {
      // TODO: Chiamata API per risolvere l'anomalia
      console.log('Risoluzione anomalia:', {
        anomalyId: selectedAnomaly.id,
        resolutionItems
      });
      
      // Simula delay API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Rimuovi l'anomalia dalla lista
      setAnomalies(prev => prev.filter(a => a.id !== selectedAnomaly.id));
      
      // Chiudi la modal
      setShowResolutionModal(false);
      setSelectedAnomaly(null);
      setResolutionItems([]);
      
    } catch (error) {
      console.error('Errore nella risoluzione:', error);
      alert('Errore durante la risoluzione dell\'anomalia');
    } finally {
      setResolutionLoading(false);
    }
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <span className="ml-2 text-gray-600">Caricamento attività...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchInitialData}
            className="mt-2 text-red-600 hover:text-red-700 underline"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Attività da completare</h2>
        <p className="text-gray-600 text-sm">
          Gestisci le anomalie di inventario e le attività di sanificazione dei dati
        </p>
      </div>

      {/* Lista Attività */}
      {anomalies.length > 0 ? (
        <div className="mb-6">
          <div className="space-y-3">
            {(showAllAnomalies ? anomalies : anomalies.slice(0, 3)).map((anomaly) => (
              <div 
                key={anomaly.id} 
                className={`bg-white rounded-lg p-4 border-2 ${getSeverityColor(anomaly.severity)} shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {anomaly.type === 'report_discrepancy' && (
                          <FileText className="text-blue-600" size={16} />
                        )}
                        {anomaly.type === 'physical_digital_mismatch' && (
                          <Package className="text-purple-600" size={16} />
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {anomaly.title}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{anomaly.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      {anomaly.warehouseName && (
                        <div className="flex items-center gap-1">
                          <Package size={12} />
                          <span>{anomaly.warehouseName}</span>
                        </div>
                      )}
                      {anomaly.articleCode && (
                        <div className="flex items-center gap-1">
                          <span>🏷️</span>
                          <span>{anomaly.articleCode}</span>
                        </div>
                      )}
                      {anomaly.quantity && (
                        <div className="flex items-center gap-1">
                          <span>📊</span>
                          <span>Qtà: {anomaly.quantity}</span>
                        </div>
                      )}
                      {anomaly.reportId && (
                        <div className="flex items-center gap-1">
                          <span>📋</span>
                          <span>Report: {anomaly.reportId}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Generata il {new Date().toLocaleDateString('it-IT')} alle ore {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleResolveAnomaly(anomaly)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Check size={16} />
                      Esegui
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pulsante Mostra/Nascondi */}
          {anomalies.length > 3 && (
            <button
              onClick={() => setShowAllAnomalies(!showAllAnomalies)}
              className="mt-4 text-sm text-gray-700 hover:text-gray-800 underline font-medium"
            >
              {showAllAnomalies ? 'Mostra meno' : `Mostra tutte le ${anomalies.length} attività`}
            </button>
          )}
        </div>
      ) : (
        <div className="mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="flex flex-col items-center">
              <Check className="text-green-600 mb-3" size={48} />
              <h3 className="text-lg font-medium text-green-800 mb-2">
                Nessuna attività da completare
              </h3>
              <p className="text-sm text-green-700">
                Tutti i dati di inventario sono allineati correttamente. Ottimo lavoro!
              </p>
            </div>
          </div>
        </div>
      )}



      {/* Modal Risoluzione Anomalia */}
      {showResolutionModal && selectedAnomaly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-yellow-600" size={24} />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Risolvi Anomalia
                    </h2>
                    <p className="text-sm text-gray-600">{selectedAnomaly.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResolutionModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lato sinistro: Pezzi da sanare */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="text-blue-600" size={20} />
                    Pezzi in eccesso da sanare
                  </h3>
                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                    <div className="space-y-3">
                      {resolutionItems.map((item, index) => {
                        const totalAllocated = item.warehouseAllocations.reduce((sum, alloc) => sum + alloc.quantity, 0);
                        const remaining = item.totalQuantityToRemove - totalAllocated;
                        
                        return (
                          <div key={index} className="bg-white rounded-md p-3 border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">{item.articleCode}</span>
                              <div className="flex items-center gap-2">
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium">
                                  -{item.totalQuantityToRemove}
                                </span>
                                {remaining > 0 && (
                                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                                    Mancanti: {remaining}
                                  </span>
                                )}
                                {remaining === 0 && (
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                                    ✓ Completo
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">{item.articleDescription}</p>
                            <div className="mt-2 text-xs text-gray-500">
                              Da distribuire tra i magazzini selezionati →
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Lato destro: Selezione magazzini */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="text-green-600" size={20} />
                    Distribuisci tra magazzini
                  </h3>
                  <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                    <div className="space-y-4">
                      {resolutionItems.map((item, itemIndex) => (
                        <div key={itemIndex} className="bg-white rounded-md p-3 border border-green-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">
                              {item.articleCode} ({item.totalQuantityToRemove} pezzi totali)
                            </span>
                            <button
                              onClick={() => addWarehouseAllocation(itemIndex)}
                              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                            >
                              + Aggiungi Magazzino
                            </button>
                          </div>
                          
                          {/* Allocazioni esistenti */}
                          <div className="space-y-2">
                            {item.warehouseAllocations.map((allocation, allocIndex) => (
                              <div key={allocIndex} className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                                <select
                                  value={allocation.warehouseId}
                                  onChange={(e) => updateWarehouseAllocation(itemIndex, allocIndex, 'warehouseId', e.target.value)}
                                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 text-gray-700"
                                >
                                  <option value="">Seleziona magazzino...</option>
                                  {warehouses.map((warehouse) => (
                                    <option key={warehouse.id} value={warehouse.id}>
                                      {warehouse.description}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className="text-sm text-gray-600">Qtà:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max={item.totalQuantityToRemove}
                                    value={allocation.quantity || ''}
                                    onChange={(e) => updateWarehouseAllocation(itemIndex, allocIndex, 'quantity', parseInt(e.target.value) || 0)}
                                    className="w-16 px-2 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 text-center text-gray-700"
                                  />
                                </div>
                                <button
                                  onClick={() => removeWarehouseAllocation(itemIndex, allocIndex)}
                                  className="text-red-600 hover:text-red-800 p-1 flex-shrink-0"
                                  title="Rimuovi"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          {/* Indicatore progresso */}
                          {item.warehouseAllocations.length > 0 && (
                            <div className="mt-2 text-xs">
                              {(() => {
                                const totalAllocated = item.warehouseAllocations.reduce((sum, alloc) => sum + alloc.quantity, 0);
                                const remaining = item.totalQuantityToRemove - totalAllocated;
                                return (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">
                                      Allocati: {totalAllocated}/{item.totalQuantityToRemove}
                                    </span>
                                    {remaining > 0 ? (
                                      <span className="text-orange-600">Mancanti: {remaining}</span>
                                    ) : remaining === 0 ? (
                                      <span className="text-green-600">✓ Completo</span>
                                    ) : (
                                      <span className="text-red-600">Eccesso: {Math.abs(remaining)}</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          
                          {item.warehouseAllocations.length === 0 && (
                            <div className="text-center py-2 text-gray-500 text-xs">
                              Clicca &quot;Aggiungi Magazzino&quot; per iniziare
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowResolutionModal(false)}
                  className="px-3 py-1.5 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirmResolution}
                  disabled={resolutionLoading || resolutionItems.some(item => 
                    item.warehouseAllocations.length === 0 || 
                    item.warehouseAllocations.reduce((sum, alloc) => sum + alloc.quantity, 0) !== item.totalQuantityToRemove ||
                    item.warehouseAllocations.some(alloc => !alloc.warehouseId || alloc.quantity <= 0)
                  )}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 transition-colors text-sm"
                >
                  {resolutionLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      Elaborazione...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Conferma Risoluzione
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
