'use client';

import React, { useState, useEffect } from 'react';
import { Package, FileText, X, Check, Loader2, ExternalLink, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  InventoryActivity, 
  InventoryActivitiesResponse,
  CompleteActivityRequest,
  CompleteActivityResponse 
} from '../../types/inventory';
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
}

interface Warehouse {
  id: string;
  description: string;
}



export default function ActivitiesView() {
  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Gamma sync lock: block full page from -1 to +5 minutes every hour
  const [isGammaSyncLock, setIsGammaSyncLock] = useState(false);
  
  // Stati per il popup delle attività
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ActivityGroup | null>(null);
  const [processingActivities, setProcessingActivities] = useState<Set<string>>(new Set());
  
  // Cache per articoli caricati
  const [articlesCache, setArticlesCache] = useState<Map<string, Article>>(new Map());
  const [loadingArticles, setLoadingArticles] = useState<Set<string>>(new Set());
  
  // Stati per gestione operativa attività
  const [activityInEdit, setActivityInEdit] = useState<string | null>(null);
  const [warehouseAllocations, setWarehouseAllocations] = useState<{
    [activityId: string]: Array<{
      warehouseId: string;
      quantity: number;
      maxAvailable?: number;
    }>;
  }>({});

  const auth = useAuth();

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Evaluate and refresh Gamma sync lock window periodically (-1 to +5 minutes of each hour)
  useEffect(() => {
    const updateLock = () => {
      const now = new Date();
      const minute = now.getMinutes();
      setIsGammaSyncLock(minute >= 59 || minute <= 5);
    };
    updateLock();
    const id = setInterval(updateLock, 5000);
    return () => clearInterval(id);
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

      // Fetch inventory activities
      await fetchInventoryActivities();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryActivities = async () => {
    if (!auth.token) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

      // Fetch solo attività in stato "to_do" per vedere solo quelle da completare
      const response = await fetch('/api/inventory/activities?status=to_do&limit=100', { headers });
      
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle attività');
      }

      const data: InventoryActivitiesResponse = await response.json();
      console.log('📋 Inventory activities fetched:', data);

      // Raggruppa le attività per assistance_intervention_id
      const groupsMap = new Map<number, ActivityGroup>();

      for (const activity of data.activities) {
        if (!activity.assistance_intervention_id) continue;

        const key = activity.assistance_intervention_id;
        
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            assistance_intervention_id: key,
            activities: [],
            totalActivities: 0,
            pendingActivities: 0,
            report_id: activity.report_id || undefined
          });
        }

        const group = groupsMap.get(key)!;
        group.activities.push(activity);
        group.totalActivities++;
        if (activity.status === 'to_do') {
          group.pendingActivities++;
        }
      }

      // Filtra solo i gruppi che hanno almeno una attività "to_do"
      const filteredGroups = Array.from(groupsMap.values())
        .filter(group => group.pendingActivities > 0)
        .sort((a, b) => b.assistance_intervention_id - a.assistance_intervention_id);

      setActivityGroups(filteredGroups);
      console.log('📊 Activity groups created:', filteredGroups);

    } catch (error) {
      console.error('Error fetching inventory activities:', error);
      throw error;
    }
  };

  const handleOpenActivities = (group: ActivityGroup) => {
    setSelectedGroup(group);
    setShowActivitiesModal(true);
    
    // Carica gli articoli per le attività del gruppo
    group.activities.forEach(activity => {
      if (activity.data && typeof activity.data === 'object') {
        const data = activity.data as ActivityData;
        if (data.article_id && !articlesCache.has(data.article_id)) {
          fetchArticleData(data.article_id);
        }
      }
    });
  };

  const fetchArticleData = async (articleId: string) => {
    if (!auth.token || loadingArticles.has(articleId) || articlesCache.has(articleId)) {
      return;
    }

    try {
      setLoadingArticles(prev => new Set(prev).add(articleId));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

      const response = await fetch(`/api/articles/${articleId}`, { headers });
      
      if (response.ok) {
        const articleData: Article = await response.json();
        setArticlesCache(prev => new Map(prev).set(articleId, articleData));
      } else {
        console.error(`Failed to fetch article ${articleId}:`, response.status);
      }
    } catch (error) {
      console.error(`Error fetching article ${articleId}:`, error);
    } finally {
      setLoadingArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(articleId);
        return newSet;
      });
    }
  };

  const handleCompleteActivity = async (activityId: string) => {
    if (!auth.token) return;

    try {
      setProcessingActivities(prev => new Set(prev).add(activityId));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

      // Trova l'attività per ottenere i dati attuali
      const activity = selectedGroup?.activities.find(a => a.id === activityId);
      if (!activity) {
        throw new Error('Attività non trovata');
      }

      const quantityStatus = getQuantityStatus(activity);

      // Prepara i dati per la richiesta di completamento
      const completeRequest: CompleteActivityRequest = {
        activity_id: activityId
      };

      // Aggiungi i dati specifici in base al tipo di casistica
      if (quantityStatus.status === 'ECCESSO') {
        // Caso ECCESSO: serve warehouse_transfers (prelievi dai magazzini)
        const allocations = warehouseAllocations[activityId] || [];
        if (allocations.length === 0) {
          throw new Error('Devi specificare da quali magazzini prelevare gli articoli');
        }
        
        completeRequest.warehouse_transfers = allocations.map(allocation => ({
          warehouse_id: allocation.warehouseId,
          quantity: allocation.quantity
        }));
        
      } else if (quantityStatus.status === 'USO_PARZIALE') {
        // Caso USO_PARZIALE: serve distribution_warehouses (dove mettere la quantità non utilizzata)
        const allocations = warehouseAllocations[activityId] || [];
        if (allocations.length === 0) {
          throw new Error('Devi specificare in quali magazzini mettere la quantità non utilizzata');
        }
        
        completeRequest.distribution_warehouses = allocations.map(allocation => ({
          warehouse_id: allocation.warehouseId,
          quantity: allocation.quantity
        }));
      }
      // Per PARI non serve aggiungere nulla

      console.log('🎯 Completing activity with request:', completeRequest);

      // Chiama il nuovo endpoint di completamento
      const response = await fetch('/api/inventory/complete-activity', {
        method: 'POST',
        headers,
        body: JSON.stringify(completeRequest)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details || errorData.message || 'Errore nel completamento dell\'attività';
        throw new Error(errorMessage);
      }

      const completionResult: CompleteActivityResponse = await response.json();
      console.log('✅ Activity completed successfully:', completionResult);

      // Mostra un messaggio di successo con i dettagli
      const successMessage = `
        Attività completata con successo!
        
        Caso: ${completionResult.case_type}
        Movimenti eseguiti: ${completionResult.movements_executed.length}
        
        ${completionResult.summary ? `
        Articolo: ${completionResult.summary.article_id}
        Quantità report: ${completionResult.summary.report_quantity}
        Quantità intervento: ${completionResult.summary.intervention_quantity}
        ` : ''}
      `.trim();

      alert(successMessage);

      // Pulisci le allocazioni per questa attività
      setWarehouseAllocations(prev => {
        const updated = { ...prev };
        delete updated[activityId];
        return updated;
      });
      
      setActivityInEdit(null);

      // Ricarica i dati
      await fetchInventoryActivities();
      
      // Aggiorna anche il gruppo selezionato se la modal è aperta
      if (selectedGroup) {
        const updatedGroup = activityGroups.find(g => g.assistance_intervention_id === selectedGroup.assistance_intervention_id);
        if (updatedGroup) {
          setSelectedGroup(updatedGroup);
        }
      }

    } catch (error) {
      console.error('❌ Error completing activity:', error);
      
      // Mostra un messaggio di errore più dettagliato
      let errorMessage = 'Errore durante il completamento dell\'attività';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`${errorMessage}\n\nControlla i dati inseriti e riprova.`);
    } finally {
      setProcessingActivities(prev => {
        const newSet = new Set(prev);
        newSet.delete(activityId);
        return newSet;
      });
    }
  };

  const handleStartEdit = (activityId: string) => {
    setActivityInEdit(activityId);
    // Inizializza le allocazioni se non esistono
    if (!warehouseAllocations[activityId]) {
      setWarehouseAllocations(prev => ({
        ...prev,
        [activityId]: []
      }));
    }
  };

  const addWarehouseAllocation = (activityId: string) => {
    setWarehouseAllocations(prev => ({
      ...prev,
      [activityId]: [
        ...(prev[activityId] || []),
        { warehouseId: '', quantity: 0 }
      ]
    }));
  };

  const updateWarehouseAllocation = (activityId: string, index: number, field: 'warehouseId' | 'quantity', value: string | number) => {
    setWarehouseAllocations(prev => ({
      ...prev,
      [activityId]: (prev[activityId] || []).map((allocation, i) => 
        i === index ? { ...allocation, [field]: value } : allocation
      )
    }));
  };

  const removeWarehouseAllocation = (activityId: string, index: number) => {
    setWarehouseAllocations(prev => ({
      ...prev,
      [activityId]: (prev[activityId] || []).filter((_, i) => i !== index)
    }));
  };

  const getRequiredQuantity = (activity: InventoryActivity): number => {
    if (activity.data && typeof activity.data === 'object') {
      const data = activity.data as ActivityData;
      if (data.report_quantity !== undefined && data.intervention_quantity !== undefined) {
        const reportQty = data.report_quantity;
        const interventionQty = data.intervention_quantity;
        return Math.abs(reportQty - interventionQty);
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
      return true; // Può completare direttamente
    }
    
    if (quantityStatus.status === 'ECCESSO' || quantityStatus.status === 'USO_PARZIALE') {
      const requiredQty = getRequiredQuantity(activity);
      const allocatedQty = getTotalAllocated(activity.id);
      const allocations = warehouseAllocations[activity.id] || [];
      
      // Verifica che la quantità sia corretta e che tutte le allocazioni siano complete
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
    
    // Restituisce solo i magazzini con stock > 0
    return article.inventory
      .filter(inv => (inv.quantity_stock || 0) > 0)
      .map(inv => ({
        id: inv.warehouse_id.toString(),
        description: inv.warehouse_description,
        stock: inv.quantity_stock || 0
      }));
  };


  const getStatusBadgeColor = (pendingCount: number, totalCount: number) => {
    if (pendingCount === 0) return 'bg-green-100 text-green-800 border-green-200';
    if (pendingCount === totalCount) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-orange-100 text-orange-800 border-orange-200';
  };

  const getQuantityStatus = (activity: InventoryActivity): { 
    status: 'PARI' | 'ECCESSO' | 'USO_PARZIALE' | 'VERIFICA'; 
    description: string; 
    article?: Article;
  } => {
    if (activity.data && typeof activity.data === 'object') {
      const data = activity.data as ActivityData;
      
      // Controlla se ci sono le informazioni delle quantità nel formato richiesto
      if (data.article_id && data.report_quantity !== undefined && data.intervention_quantity !== undefined) {
        const reportQty = data.report_quantity;
        const interventionQty = data.intervention_quantity;
        const article = articlesCache.get(data.article_id);
        
        if (reportQty === interventionQty) {
          return {
            status: 'PARI',
            description: `Le quantità sono uguali tra report e intervento`,
            article
          };
        } else if (reportQty > interventionQty) {
          return {
            status: 'ECCESSO',
            description: `La quantità del report è superiore a quella dell'intervento`,
            article
          };
        } else {
          return {
            status: 'USO_PARZIALE',
            description: `La quantità del report è inferiore a quella dell'intervento`,
            article
          };
        }
      }
    }
    
    // Default per verifiche e controlli senza dati specifici
    return {
      status: 'VERIFICA',
      description: 'Verifica da completare per determinare la situazione'
    };
  };



  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen relative">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <span className="ml-2 text-gray-600">Caricamento attività...</span>
        </div>
        {isGammaSyncLock && (
          <div className="absolute inset-0 z-50 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 shadow-lg border text-center max-w-md mx-4">
              <div className="text-lg font-semibold text-gray-900">Sincronizzazione in corso</div>
              <div className="text-sm text-gray-600 mt-1">Pagina bloccata tra -1 e +5 minuti di ogni ora.</div>
              <div className="mt-3 text-xs text-gray-500">Attendi qualche minuto e riprova.</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white min-h-screen relative">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchInitialData}
            className="mt-2 text-red-600 hover:text-red-700 underline"
          >
            Riprova
          </button>
        </div>
        {isGammaSyncLock && (
          <div className="absolute inset-0 z-50 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 shadow-lg border text-center max-w-md mx-4">
              <div className="text-lg font-semibold text-gray-900">Sincronizzazione in corso</div>
              <div className="text-sm text-gray-600 mt-1">Pagina bloccata tra -1 e +5 minuti di ogni ora.</div>
              <div className="mt-3 text-xs text-gray-500">Attendi qualche minuto e riprova.</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen relative">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Attività da completare</h2>
        <p className="text-gray-600 text-sm">
          Gestisci le anomalie di inventario e le attività di sanificazione dei dati
        </p>
      </div>

      {/* Lista Gruppi Attività */}
      {activityGroups.length > 0 ? (
        <div className="mb-6">
          <div className="space-y-3">
            {(showAllGroups ? activityGroups : activityGroups.slice(0, 5)).map((group) => (
              <div 
                key={group.assistance_intervention_id} 
                className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleOpenActivities(group)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Activity className="text-blue-600" size={20} />
                      <span className="font-medium text-gray-900">
                        Intervento #{group.assistance_intervention_id}
                      </span>
                      <div className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadgeColor(group.pendingActivities, group.totalActivities)}`}>
                        {group.pendingActivities} di {group.totalActivities} da completare
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      {group.report_id && (
                        <div className="flex items-center gap-2">
                          <FileText size={14} />
                          <span>Report #{group.report_id}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/interventi/rapportino/${group.report_id}`, '_blank');
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Apri rapportino in nuova tab"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Package size={14} />
                        <span>Intervento #{group.assistance_intervention_id}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/interventi?ai=${group.assistance_intervention_id}`, '_blank');
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Apri intervento in nuova tab"
                        >
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      Attività di inventario in sospeso per questo intervento
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenActivities(group);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
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
          {activityGroups.length > 5 && (
            <button
              onClick={() => setShowAllGroups(!showAllGroups)}
              className="mt-4 text-sm text-gray-700 hover:text-gray-800 underline font-medium"
            >
              {showAllGroups ? 'Mostra meno' : `Mostra tutti i ${activityGroups.length} gruppi`}
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



      {/* Modal Attività */}
      {showActivitiesModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="text-blue-600" size={24} />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Attività Inventario - Intervento #{selectedGroup.assistance_intervention_id}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      {selectedGroup.report_id && (
                        <div className="flex items-center gap-1">
                          <FileText size={14} />
                          <span>Report #{selectedGroup.report_id}</span>
                          <button
                            onClick={() => window.open(`/interventi/rapportino/${selectedGroup.report_id}`, '_blank')}
                            className="text-blue-600 hover:text-blue-800 ml-1"
                            title="Apri rapportino"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Package size={14} />
                        <span>Intervento #{selectedGroup.assistance_intervention_id}</span>
                        <button
                          onClick={() => window.open(`/interventi?ai=${selectedGroup.assistance_intervention_id}`, '_blank')}
                          className="text-blue-600 hover:text-blue-800 ml-1"
                          title="Apri intervento"
                        >
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowActivitiesModal(false);
                    setActivityInEdit(null);
                    setWarehouseAllocations({});
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-4">
                {selectedGroup.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`bg-white rounded-lg p-4 border-2 shadow-sm`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">                        
                        {/* Indicazione stato quantità */}
                        {(() => {
                          const quantityStatus = getQuantityStatus(activity);
                          return (
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
                                  {quantityStatus.status}
                                </span>
                              </div>
                              
                                                            {/* Quantità evidenziate */}
                              {(() => {
                                const data = activity.data as ActivityData;
                                return data && data.report_quantity !== undefined && data.intervention_quantity !== undefined && (
                                  <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div className="bg-white p-3 rounded border">
                                      <div className="text-xs text-gray-500 mb-1">Quantità Report</div>
                                      <div className="text-2xl font-bold text-gray-900">{data.report_quantity}</div>
                                    </div>
                                    <div className="bg-white p-3 rounded border">
                                      <div className="text-xs text-gray-500 mb-1">Quantità Intervento</div>
                                      <div className="text-2xl font-bold text-gray-900">{data.intervention_quantity}</div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Gestione magazzini per ECCESSO e USO PARZIALE */}
                              {activityInEdit === activity.id && (quantityStatus.status === 'ECCESSO' || quantityStatus.status === 'USO_PARZIALE') && (
                                <div className="mb-4 p-4 bg-white rounded border">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium text-gray-900">
                                      {quantityStatus.status === 'ECCESSO' 
                                        ? `Preleva ${getRequiredQuantity(activity)} pezzi da magazzini`
                                        : `Assegna ${getRequiredQuantity(activity)} pezzi a magazzini`
                                      }
                                    </h4>
                                    <button
                                      onClick={() => addWarehouseAllocation(activity.id)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
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
                                          onChange={(e) => updateWarehouseAllocation(activity.id, index, 'warehouseId', e.target.value)}
                                          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                                        >
                                          <option value="">Seleziona magazzino...</option>
                                          {(() => {
                                            const data = activity.data as ActivityData;
                                            if (quantityStatus.status === 'ECCESSO' && data?.article_id) {
                                              // Per ECCESSO: mostra solo magazzini con stock > 0
                                              return getAvailableWarehouses(data.article_id).map((warehouse) => (
                                                <option key={warehouse.id} value={warehouse.id}>
                                                  {warehouse.description} (Stock: {warehouse.stock})
                                                </option>
                                              ));
                                            } else {
                                              // Per USO PARZIALE: mostra tutti i magazzini tranne "PRESTITI AI CLIENTI" (ID "CL")
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
                                              
                                              // Limita il valore al massimo consentito
                                              const validValue = Math.min(newValue, maxAllowed);
                                              updateWarehouseAllocation(activity.id, index, 'quantity', validValue);
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
                                          onClick={() => removeWarehouseAllocation(activity.id, index)}
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
                                      <div className="font-medium mb-1">{quantityStatus.article.id}</div>
                                      <div className="text-xs text-gray-600 mb-1">{quantityStatus.article.short_description}</div>
                                      {quantityStatus.article.description && (
                                        <div className="text-xs text-gray-600 mb-1">{quantityStatus.article.description}</div>
                                      )}
                                      {quantityStatus.article.pnc_code && (
                                        <div className="text-xs text-gray-500">PNC: {quantityStatus.article.pnc_code}</div>
                                      )}
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
                          );
                        })()}

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
                          {(() => {
                            const quantityStatus = getQuantityStatus(activity);
                            const isEditing = activityInEdit === activity.id;
                            const canComplete = canCompleteActivity(activity);

                            if (quantityStatus.status === 'PARI') {
                              // Caso PARI: completamento diretto
                              return (
                                <button
                                  onClick={() => handleCompleteActivity(activity.id)}
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
                              );
                            } else if (quantityStatus.status === 'ECCESSO' || quantityStatus.status === 'USO_PARZIALE') {
                              // Casi ECCESSO e USO PARZIALE: richiedono gestione magazzini
                              return (
                                <div className="flex flex-col gap-2">
                                  {!isEditing ? (
                                    <button
                                      onClick={() => handleStartEdit(activity.id)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                      
                                      Gestisci
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleCompleteActivity(activity.id)}
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
                                        onClick={() => setActivityInEdit(null)}
                                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                      >
                                        Annulla
                                      </button>
                                    </>
                                  )}
                                </div>
                              );
                            } else {
                              // Caso VERIFICA: pulsante disabilitato
                              return (
                                <button
                                  disabled
                                  className="bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                                >
                                  <Activity size={16} />
                                  Verifica
                                </button>
                              );
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
                  onClick={() => {
                    setShowActivitiesModal(false);
                    setActivityInEdit(null);
                    setWarehouseAllocations({});
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isGammaSyncLock && (
        <div className="absolute inset-0 z-50 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-lg border text-center max-w-md mx-4">
            <div className="text-lg font-semibold text-gray-900">Sincronizzazione in corso</div>
            <div className="text-sm text-gray-600 mt-1">Pagina bloccata tra -1 e +5 minuti di ogni ora.</div>
            <div className="mt-3 text-xs text-gray-500">Attendi qualche minuto e riprova.</div>
          </div>
        </div>
      )}
    </div>
  );
}

