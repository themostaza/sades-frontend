'use client';

import React from 'react';
import { Package, FileText, X, Check, Loader2, ExternalLink, Activity } from 'lucide-react';
import { InventoryActivity } from '../../types/inventory';
import { Article } from '../../types/article';

interface ActivityData {
  article_id?: string;
  report_quantity?: number;
  intervention_quantity?: number;
  completed_at?: string;
  completed_by?: string;
  warehouse_allocations?: Array<{
    warehouseId: string;
    quantity: number;
    maxAvailable?: number;
  }>;
}

interface ActivityGroup {
  assistance_intervention_id: number;
  activities: InventoryActivity[];
  totalActivities: number;
  pendingActivities: number;
  report_id?: number;
  customer_name?: string;
  date?: string;
  internal_notes?: string;
  report_created_at?: string;
}

interface Warehouse {
  id: string;
  description: string;
}

interface InventoryActivityModalProps {
  show: boolean;
  onClose: () => void;
  selectedGroup: ActivityGroup | null;
  warehouses: Warehouse[];
  articlesCache: Map<string, Article>;
  loadingArticles: Set<string>;
  processingActivities: Set<string>;
  activityInEdit: string | null;
  warehouseAllocations: {
    [activityId: string]: Array<{
      warehouseId: string;
      quantity: number;
      maxAvailable?: number;
    }>;
  };
  onStartEdit: (activityId: string) => void;
  onCompleteActivity: (activityId: string) => Promise<void>;
  onAddWarehouseAllocation: (activityId: string) => void;
  onUpdateWarehouseAllocation: (activityId: string, index: number, field: 'warehouseId' | 'quantity', value: string | number) => void;
  onRemoveWarehouseAllocation: (activityId: string, index: number) => void;
  onCancelEdit: () => void;
}

export default function InventoryActivityModal({
  show,
  onClose,
  selectedGroup,
  warehouses,
  articlesCache,
  loadingArticles,
  processingActivities,
  activityInEdit,
  warehouseAllocations,
  onStartEdit,
  onCompleteActivity,
  onAddWarehouseAllocation,
  onUpdateWarehouseAllocation,
  onRemoveWarehouseAllocation,
  onCancelEdit
}: InventoryActivityModalProps) {
  
  if (!show || !selectedGroup) return null;

  const getQuantityStatus = (activity: InventoryActivity): { 
    status: 'PARI' | 'ECCESSO' | 'USO_PARZIALE' | 'VERIFICA'; 
    statusLabel: string;
    description: string; 
    article?: Article;
  } => {
    if (activity.data && typeof activity.data === 'object') {
      const data = activity.data as ActivityData;
      
      if (data.article_id && data.report_quantity !== undefined && data.intervention_quantity !== undefined) {
        const reportQty = data.report_quantity;
        const interventionQty = data.intervention_quantity;
        const article = articlesCache.get(data.article_id);
        
        if (reportQty === interventionQty) {
          return {
            status: 'PARI',
            statusLabel: '✓ Quantità Allineate',
            description: `Le quantità utilizzate e pianificate coincidono`,
            article
          };
        } else if (reportQty > interventionQty) {
          return {
            status: 'ECCESSO',
            statusLabel: '↑ Eccesso Utilizzato',
            description: `Utilizzati più pezzi di quanto pianificato`,
            article
          };
        } else {
          return {
            status: 'USO_PARZIALE',
            statusLabel: '↓ Uso Parziale',
            description: `Utilizzati meno pezzi di quanto pianificato`,
            article
          };
        }
      }
    }
    
    return {
      status: 'VERIFICA',
      statusLabel: '⚠ Verifica Necessaria',
      description: 'Verifica da completare per determinare la situazione'
    };
  };

  const getRequiredQuantity = (activity: InventoryActivity): number => {
    if (activity.data && typeof activity.data === 'object') {
      const data = activity.data as ActivityData;
      if (data.report_quantity !== undefined && data.intervention_quantity !== undefined) {
        return Math.abs(data.report_quantity - data.intervention_quantity);
      }
    }
    return 0;
  };

  const getTotalAllocated = (activityId: string): number => {
    const allocations = warehouseAllocations[activityId] || [];
    return allocations.reduce((total, allocation) => total + allocation.quantity, 0);
  };

  const canCompleteActivity = (activity: InventoryActivity): boolean => {
    const quantityStatus = getQuantityStatus(activity);
    
    if (quantityStatus.status === 'PARI') {
      return true;
    }
    
    if (quantityStatus.status === 'ECCESSO' || quantityStatus.status === 'USO_PARZIALE') {
      const requiredQty = getRequiredQuantity(activity);
      const allocatedQty = getTotalAllocated(activity.id);
      const allocations = warehouseAllocations[activity.id] || [];
      
      return requiredQty === allocatedQty && 
             allocations.length > 0 && 
             allocations.every(a => a.warehouseId && a.quantity > 0);
    }
    
    return false;
  };

  const getWarehouseStock = (warehouseId: string, articleId: string): number => {
    const article = articlesCache.get(articleId);
    if (!article) return 0;
    
    const inventory = article.inventory.find(inv => inv.warehouse_id.toString() === warehouseId);
    return inventory?.quantity_stock || 0;
  };

  const getAvailableWarehouses = (articleId: string) => {
    const article = articlesCache.get(articleId);
    if (!article) return [];
    
    return article.inventory
      .filter(inv => (inv.quantity_stock || 0) > 0)
      .map(inv => ({
        id: inv.warehouse_id.toString(),
        description: inv.warehouse_description,
        stock: inv.quantity_stock || 0
      }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-teal-50 border-b border-teal-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Activity className="text-teal-600" size={24} />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedGroup.customer_name || `INT-${selectedGroup.assistance_intervention_id}`}
                </h2>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap mb-2">
                  {selectedGroup.date && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 text-xs">Intervento:</span>
                      <span className="font-medium">
                        {new Date(selectedGroup.date).toLocaleDateString('it-IT', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                  {selectedGroup.report_created_at && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 text-xs">Completato:</span>
                      <span className="font-medium text-teal-700">
                        {new Date(selectedGroup.report_created_at).toLocaleDateString('it-IT', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                  {selectedGroup.report_id && (
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded">
                      <FileText size={14} className="text-teal-600" />
                      <span className="font-medium">RAP-{selectedGroup.report_id}</span>
                      <button
                        onClick={() => window.open(`/interventi/rapportino/${selectedGroup.report_id}`, '_blank')}
                        className="text-teal-600 hover:text-teal-800"
                        title="Apri rapportino"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => window.open(`/interventi?ai=${selectedGroup.assistance_intervention_id}`, '_blank')}
                    className="flex items-center gap-2 bg-white px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                    title="Apri intervento"
                  >
                    <Package size={14} className="text-teal-600" />
                    <span className="font-medium">Vedi Intervento</span>
                    <ExternalLink size={12} className="text-teal-600" />
                  </button>
                  <span className="text-xs text-gray-500">ID: {selectedGroup.assistance_intervention_id}</span>
                </div>

                {selectedGroup.internal_notes && (
                  <div className="text-sm text-gray-700 bg-white px-3 py-2 rounded border-l-2 border-teal-400">
                    {selectedGroup.internal_notes}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-4">
            {selectedGroup.activities.map((activity) => {
              const quantityStatus = getQuantityStatus(activity);
              const isEditing = activityInEdit === activity.id;
              const canComplete = canCompleteActivity(activity);

              return (
                <div
                  key={activity.id}
                  className="bg-white rounded-lg p-4 border-2 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">                        
                      <div className="bg-gray-50">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`px-3 py-1 rounded text-sm font-medium ${
                            activity.status === 'done' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {activity.status === 'done' ? 'Completata' : 'Da completare'}
                          </div>
                          <span className="font-medium text-gray-900">
                            {quantityStatus.statusLabel}
                          </span>
                        </div>
                        
                        {/* Quantità evidenziate */}
                        {(() => {
                          const data = activity.data as ActivityData;
                          return data && data.report_quantity !== undefined && data.intervention_quantity !== undefined && (
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div className="bg-white p-3 rounded border">
                                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                  <FileText size={12} />
                                  Quantità Utilizzata
                                </div>
                                <div className="text-2xl font-bold text-teal-900">{data.report_quantity}</div>
                                <div className="text-xs text-gray-500 mt-1">nel rapportino</div>
                              </div>
                              <div className="bg-white p-3 rounded border">
                                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                  <Package size={12} />
                                  Quantità Pianificata
                                </div>
                                <div className="text-2xl font-bold text-blue-900">{data.intervention_quantity}</div>
                                <div className="text-xs text-gray-500 mt-1">nell&apos;intervento</div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Gestione magazzini per ECCESSO e USO PARZIALE */}
                        {isEditing && (quantityStatus.status === 'ECCESSO' || quantityStatus.status === 'USO_PARZIALE') && (
                          <div className="mb-4 p-4 bg-white rounded border">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">
                                {quantityStatus.status === 'ECCESSO' 
                                  ? `Preleva ${getRequiredQuantity(activity)} pezzi da magazzini`
                                  : `Assegna ${getRequiredQuantity(activity)} pezzi a magazzini`
                                }
                              </h4>
                              <button
                                onClick={() => onAddWarehouseAllocation(activity.id)}
                                className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                              >
                                + Aggiungi Magazzino
                              </button>
                            </div>

                            {/* Lista allocazioni */}
                            <div className="space-y-3">
                              {(warehouseAllocations[activity.id] || []).map((allocation, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                                  <select
                                    value={allocation.warehouseId}
                                    onChange={(e) => onUpdateWarehouseAllocation(activity.id, index, 'warehouseId', e.target.value)}
                                    className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                                  >
                                    <option value="">Seleziona magazzino...</option>
                                    {(() => {
                                      const data = activity.data as ActivityData;
                                      if (quantityStatus.status === 'ECCESSO' && data?.article_id) {
                                        return getAvailableWarehouses(data.article_id).map((warehouse) => (
                                          <option key={warehouse.id} value={warehouse.id}>
                                            {warehouse.description} (Stock: {warehouse.stock})
                                          </option>
                                        ));
                                      } else {
                                        return warehouses
                                          .filter(warehouse => warehouse.id !== "CL")
                                          .map((warehouse) => (
                                            <option key={warehouse.id} value={warehouse.id}>
                                              {warehouse.description}
                                            </option>
                                          ));
                                      }
                                    })()}
                                  </select>
                                  
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <span className="text-sm text-gray-600">Qtà:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      max={(() => {
                                        const data = activity.data as ActivityData;
                                        if (quantityStatus.status === 'ECCESSO' && allocation.warehouseId && data?.article_id) {
                                          return getWarehouseStock(allocation.warehouseId, data.article_id);
                                        }
                                        return getRequiredQuantity(activity);
                                      })()}
                                      value={allocation.quantity || ''}
                                      onChange={(e) => {
                                        const newValue = parseInt(e.target.value) || 0;
                                        const data = activity.data as ActivityData;
                                        const maxAllowed = quantityStatus.status === 'ECCESSO' && allocation.warehouseId && data?.article_id
                                          ? getWarehouseStock(allocation.warehouseId, data.article_id)
                                          : getRequiredQuantity(activity);
                                        
                                        const validValue = Math.min(newValue, maxAllowed);
                                        onUpdateWarehouseAllocation(activity.id, index, 'quantity', validValue);
                                      }}
                                      className="w-20 px-2 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center text-gray-700"
                                    />
                                    {(() => {
                                      const data = activity.data as ActivityData;
                                      return quantityStatus.status === 'ECCESSO' && allocation.warehouseId && data?.article_id && (
                                        <span className="text-xs text-gray-500">
                                          /{getWarehouseStock(allocation.warehouseId, data.article_id)}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                  
                                  <button
                                    onClick={() => onRemoveWarehouseAllocation(activity.id, index)}
                                    className="text-red-600 hover:text-red-800 p-1 flex-shrink-0"
                                    title="Rimuovi"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Indicatore progresso */}
                            {(warehouseAllocations[activity.id] || []).length > 0 && (
                              <div className="mt-3 text-sm">
                                {(() => {
                                  const required = getRequiredQuantity(activity);
                                  const allocated = getTotalAllocated(activity.id);
                                  const remaining = required - allocated;
                                  
                                  return (
                                    <div className="flex items-center justify-between p-2 bg-gray-100 rounded">
                                      <span className="text-gray-700">
                                        Allocati: {allocated}/{required}
                                      </span>
                                      {remaining > 0 ? (
                                        <span className="text-orange-600 font-medium">Mancanti: {remaining}</span>
                                      ) : remaining === 0 ? (
                                        <span className="text-green-600 font-medium">✓ Completo</span>
                                      ) : (
                                        <span className="text-red-600 font-medium">Eccesso: {Math.abs(remaining)}</span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                            {(warehouseAllocations[activity.id] || []).length === 0 && (
                              <div className="text-center py-4 text-gray-500 text-sm">
                                Clicca &quot;Aggiungi Magazzino&quot; per iniziare
                              </div>
                            )}
                          </div>
                        )} 

                        
                        {/* Informazioni articolo */}
                        {(() => {
                          const data = activity.data as ActivityData;
                          return quantityStatus.article && data?.article_id && (
                            <div className="">
                              <div className="text-sm text-gray-700">
                                <div className="font-medium text-gray-900 mb-1">{quantityStatus.article.short_description}</div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  {quantityStatus.article.pnc_code && (
                                    <>
                                      <span>PNC: {quantityStatus.article.pnc_code}</span>
                                      <span>•</span>
                                    </>
                                  )}
                                  <span>ID: {quantityStatus.article.id}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        
                        {/* Loading articolo */}
                        {(() => {
                          const data = activity.data as ActivityData;
                          return data?.article_id && loadingArticles.has(data.article_id) && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="animate-spin" size={14} />
                                Caricamento informazioni articolo...
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-4 text-xs border-t border-gray-200 pt-3 text-gray-600">
                        <div className="flex items-center gap-1">
                          <span>ID: {activity.id}</span>
                        </div>
                        {activity.report_id && (
                          <div className="flex items-center gap-1">
                            <span>Report: {activity.report_id}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span>Creata: {new Date(activity.created_at).toLocaleDateString('it-IT')}</span>
                        </div>
                        {activity.done_at && (
                          <div className="flex items-center gap-1">
                            <span>Completata: {new Date(activity.done_at).toLocaleDateString('it-IT')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {activity.status === 'to_do' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {quantityStatus.status === 'PARI' ? (
                          <button
                            onClick={() => onCompleteActivity(activity.id)}
                            disabled={processingActivities.has(activity.id)}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                          >
                            {processingActivities.has(activity.id) ? (
                              <>
                                <Loader2 className="animate-spin" size={16} />
                                Completando...
                              </>
                            ) : (
                              <>
                                <Check size={16} />
                                Completa
                              </>
                            )}
                          </button>
                        ) : quantityStatus.status === 'ECCESSO' || quantityStatus.status === 'USO_PARZIALE' ? (
                          <div className="flex flex-col gap-2">
                            {!isEditing ? (
                              <button
                                onClick={() => onStartEdit(activity.id)}
                                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                              >
                                Gestisci
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => onCompleteActivity(activity.id)}
                                  disabled={!canComplete || processingActivities.has(activity.id)}
                                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                  {processingActivities.has(activity.id) ? (
                                    <>
                                      <Loader2 className="animate-spin" size={16} />
                                      Completando...
                                    </>
                                  ) : (
                                    <>
                                      <Check size={16} />
                                      Completa
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={onCancelEdit}
                                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                  Annulla
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <button
                            disabled
                            className="bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                          >
                            <Activity size={16} />
                            Verifica
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedGroup.pendingActivities > 0 ? (
                <span className="text-orange-600">
                  {selectedGroup.pendingActivities} attività ancora da completare
                </span>
              ) : (
                <span className="text-green-600">
                  ✅ Tutte le attività sono state completate
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
