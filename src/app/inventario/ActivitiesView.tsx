'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Package,
  FileText,
  X,
  Check,
  Loader2,
  ExternalLink,
  Activity,
  Clock,
  Search,
  Pencil,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  InventoryActivity,
  InventoryActivitiesResponse,
  CompleteActivityRequest,
  CompleteActivityResponse,
} from '../../types/inventory';
import { Article } from '../../types/article';
import { ConnectedArticle } from '../../types/assistance-interventions';

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

interface ReportItemSummary {
  equipment_id: number;
  equipment_description?: string;
  equipment_serial_number?: string;
  equipment_model?: string;
  note: string;
  articles: Array<{
    article_id: string;
    quantity: number;
    short_description?: string;
  }>;
}

interface ActivityGroup {
  assistance_intervention_id: number;
  activities: InventoryActivity[];
  totalActivities: number;
  pendingActivities: number;
  report_id?: number;
  // Dati intervento per migliore leggibilità
  customer_name?: string;
  date?: string;
  internal_notes?: string;
  report_created_at?: string; // Data completamento (creazione rapportino)
  // Issue 2+3: connected articles dall'intervento e articles dal report
  connected_articles?: ConnectedArticle[];
  report_articles?: Array<{ article_id: string; quantity: number }>;
  // Issue 5: flag per interventi da confermare (pre-approvazione)
  isPendingConfirmation?: boolean;
  // Note rapportino
  customer_notes?: string; // "Lavoro eseguito"
  report_items?: ReportItemSummary[]; // Note per apparecchiatura
  // Info extra intervento per il magazziniere
  assigned_to_name?: string;
  assigned_to_surname?: string;
  zone_label?: string;
  type_label?: string;
}

interface SparePartCategory {
  article_id: string;
  short_description: string;
  description: string;
  pnc_code?: string | null;
  category: 'used' | 'unused' | 'added';
  planned_quantity: number;
  report_quantity: number;
  prepared_quantity: number;
  source_warehouses: Array<{
    warehouse_id: string;
    warehouse_name: string;
    quantity: number;
  }>;
}

interface PendingIntervention {
  id: number;
  date: string;
  company_name: string;
  internal_notes?: string;
  report_id?: number;
}

interface Warehouse {
  id: string;
  description: string;
}

export default function ActivitiesView() {
  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtri
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'anomaly' | 'pending'>(
    'all'
  );

  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState(20);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Gamma sync lock: block full page from -1 to +5 minutes every hour
  const [isGammaSyncLock, setIsGammaSyncLock] = useState(false);

  // Stati per il popup delle attività
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ActivityGroup | null>(
    null
  );
  const [processingActivities, setProcessingActivities] = useState<Set<string>>(
    new Set()
  );

  // Cache per articoli caricati
  const [articlesCache, setArticlesCache] = useState<Map<string, Article>>(
    new Map()
  );
  const [loadingArticles, setLoadingArticles] = useState<Set<string>>(
    new Set()
  );

  // Stati per gestione operativa attività
  const [activityInEdit, setActivityInEdit] = useState<string | null>(null);
  const [warehouseAllocations, setWarehouseAllocations] = useState<{
    [activityId: string]: Array<{
      warehouseId: string;
      quantity: number;
      maxAvailable?: number;
    }>;
  }>({});

  // Issue 5: Interventi Da confermare
  const [pendingInterventions, setPendingInterventions] = useState<
    PendingIntervention[]
  >([]);

  // Feedback completamento attività (sostituisce alert)
  const [completedActivities, setCompletedActivities] = useState<
    Map<string, CompleteActivityResponse>
  >(new Map());
  const [activityErrors, setActivityErrors] = useState<Map<string, string>>(
    new Map()
  );

  // Stato per correzione deposito ricambi
  const [editingWarehouseArticle, setEditingWarehouseArticle] = useState<
    string | null
  >(null);
  const [warehouseCorrectionData, setWarehouseCorrectionData] = useState<{
    articleId: string;
    originalWarehouseId: string;
    newWarehouseId: string;
    quantity: number;
  } | null>(null);
  const [processingCorrection, setProcessingCorrection] = useState(false);

  const auth = useAuth();

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Conteggi per badge filtri
  const anomalyCount = activityGroups.filter(
    (g) => !g.isPendingConfirmation
  ).length;
  const pendingCount = activityGroups.filter(
    (g) => g.isPendingConfirmation
  ).length;

  // Gruppi filtrati e ordinati: anomalie prima, da confermare dopo
  const filteredGroups = activityGroups
    .filter((group) => {
      if (filterType === 'anomaly' && group.isPendingConfirmation) return false;
      if (filterType === 'pending' && !group.isPendingConfirmation)
        return false;
      if (filterText) {
        const search = filterText.toLowerCase();
        const name = (group.customer_name || '').toLowerCase();
        const id = String(group.assistance_intervention_id);
        if (!name.includes(search) && !id.includes(search)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.isPendingConfirmation === b.isPendingConfirmation) return 0;
      return a.isPendingConfirmation ? 1 : -1;
    });

  // Reset visibleCount quando cambiano i filtri
  useEffect(() => {
    setVisibleCount(20);
  }, [filterText, filterType]);

  // Infinite scroll con IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 20);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredGroups.length]);

  // Evaluate and refresh Gamma sync lock window periodically (-1 to +5 minutes of each hour)
  /*useEffect(() => {
    const updateLock = () => {
      const now = new Date();
      const minute = now.getMinutes();
      setIsGammaSyncLock(minute >= 59 || minute <= 5);
    };
    updateLock();
    const id = setInterval(updateLock, 5000);
    return () => clearInterval(id);
  }, []);*/

  const fetchInitialData = async () => {
    if (!auth.token) return;

    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      };

      // Fetch warehouses
      const warehousesEndpoint =
        auth.user?.role === 'tecnico' || auth.user?.role === 'ufficio_tecnico'
          ? '/api/assigned-warehouses'
          : '/api/warehouses';
      const warehousesResponse = await fetch(warehousesEndpoint, { headers });

      if (warehousesResponse.ok) {
        const warehousesData = await warehousesResponse.json();
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
      } else {
        console.error('Failed to fetch warehouses:', warehousesResponse.status);
      }

      // Fetch inventory activities
      await fetchInventoryActivities();

      // Issue 5: Fetch interventi Da confermare (status_id=5) e integrali come ActivityGroup
      try {
        const pendingResponse = await fetch(
          '/api/assistance-interventions?status_id=5&limit=50',
          { headers }
        );
        if (pendingResponse.ok) {
          const pendingData = await pendingResponse.json();
          const rawInterventions = pendingData.data || pendingData || [];
          const pendingGroups: ActivityGroup[] = rawInterventions.map(
            (int: any) => ({
              assistance_intervention_id: int.id,
              activities: [],
              totalActivities: 0,
              pendingActivities: 0,
              report_id: int.report_id || undefined,
              customer_name: int.company_name,
              date: int.date,
              internal_notes: int.internal_notes,
              isPendingConfirmation: true,
            })
          );

          if (pendingGroups.length > 0) {
            await fetchInterventionDetails(pendingGroups);
            setPendingInterventions(
              pendingGroups.map((g) => ({
                id: g.assistance_intervention_id,
                date: g.date || '',
                company_name: g.customer_name || '',
                internal_notes: g.internal_notes,
                report_id: g.report_id,
              }))
            );
            // Deduplica: escludi pending che hanno già un anomaly group con stesso ID
            setActivityGroups((prev) => {
              const existingIds = new Set(
                prev.map((g) => g.assistance_intervention_id)
              );
              const uniquePending = pendingGroups.filter(
                (g) => !existingIds.has(g.assistance_intervention_id)
              );
              return [...uniquePending, ...prev];
            });
          }
        }
      } catch (err) {
        console.error('Error fetching pending interventions:', err);
      }
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
        Authorization: `Bearer ${auth.token}`,
      };

      // Fetch solo attività in stato "to_do" per vedere solo quelle da completare
      const response = await fetch(
        '/api/inventory/activities?status=to_do&limit=100',
        { headers }
      );

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
            report_id: activity.report_id || undefined,
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
      const activeGroups = Array.from(groupsMap.values())
        .filter((group) => group.pendingActivities > 0)
        .sort(
          (a, b) => b.assistance_intervention_id - a.assistance_intervention_id
        );

      // Fetch dettagli interventi per ogni gruppo
      await fetchInterventionDetails(activeGroups);

      setActivityGroups(activeGroups);
      console.log('📊 Activity groups created:', activeGroups);
    } catch (error) {
      console.error('Error fetching inventory activities:', error);
      throw error;
    }
  };

  const fetchInterventionDetails = async (groups: ActivityGroup[]) => {
    if (!auth.token || groups.length === 0) return;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    };

    // Fetch dettagli in parallelo
    const detailsPromises = groups.map(async (group) => {
      try {
        // Fetch intervento
        const response = await fetch(
          `/api/assistance-interventions/${group.assistance_intervention_id}`,
          { headers }
        );

        if (!response.ok) {
          console.error(
            `Failed to fetch intervention ${group.assistance_intervention_id}`
          );
          return;
        }

        const interventionData = await response.json();

        // Popola i dati del gruppo
        group.customer_name = interventionData.company_name;
        group.date = interventionData.date;
        group.internal_notes = interventionData.internal_notes;
        group.assigned_to_name = interventionData.assigned_to_name;
        group.assigned_to_surname = interventionData.assigned_to_surname;
        group.zone_label = interventionData.zone_label;
        group.type_label = interventionData.type_label;

        // Issue 2: salva connected_articles per calcolo quantità preparata
        if (interventionData.connected_articles) {
          group.connected_articles = interventionData.connected_articles;
        }

        // Se esiste un rapportino, fetch anche quello per la data di completamento e articoli
        if (group.report_id) {
          try {
            const reportResponse = await fetch(
              `/api/intervention-reports/${group.report_id}`,
              { headers }
            );
            if (reportResponse.ok) {
              const reportData = await reportResponse.json();
              group.report_created_at = reportData.created_at;
              group.customer_notes = reportData.customer_notes || '';

              // Issue 3: estrai articoli dal report per categorizzazione
              const reportArticles: Array<{
                article_id: string;
                quantity: number;
              }> = [];
              const reportItems: ReportItemSummary[] = [];
              if (reportData.items && Array.isArray(reportData.items)) {
                for (const item of reportData.items) {
                  const itemArticles: ReportItemSummary['articles'] = [];
                  if (item.articles && Array.isArray(item.articles)) {
                    for (const art of item.articles) {
                      const articleId = art.article_id || art.id;
                      reportArticles.push({
                        article_id: articleId,
                        quantity: art.quantity || 0,
                      });
                      itemArticles.push({
                        article_id: articleId,
                        quantity: art.quantity || 0,
                        short_description:
                          art.short_description ||
                          art.article_name ||
                          art.description ||
                          art.article_description,
                      });
                    }
                  }
                  reportItems.push({
                    equipment_id: item.equipment_id,
                    equipment_description: item.equipment_description,
                    equipment_serial_number: item.equipment_serial_number,
                    equipment_model: item.equipment_model,
                    note: item.note || '',
                    articles: itemArticles,
                  });
                }
              }
              group.report_articles = reportArticles;
              group.report_items = reportItems;
            }
          } catch (error) {
            console.error(`Error fetching report ${group.report_id}:`, error);
          }
        }
      } catch (error) {
        console.error(
          `Error fetching intervention ${group.assistance_intervention_id}:`,
          error
        );
      }
    });

    await Promise.all(detailsPromises);
  };

  const handleOpenActivities = (group: ActivityGroup) => {
    setSelectedGroup(group);
    setShowActivitiesModal(true);

    // Carica gli articoli per le attività del gruppo
    group.activities.forEach((activity) => {
      if (activity.data && typeof activity.data === 'object') {
        const data = activity.data as ActivityData;
        if (data.article_id && !articlesCache.has(data.article_id)) {
          fetchArticleData(data.article_id);
        }
      }
    });
  };

  const fetchArticleData = async (articleId: string) => {
    if (
      !auth.token ||
      loadingArticles.has(articleId) ||
      articlesCache.has(articleId)
    ) {
      return;
    }

    try {
      setLoadingArticles((prev) => new Set(prev).add(articleId));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      };

      const response = await fetch(`/api/articles/${articleId}`, { headers });

      if (response.ok) {
        const articleData: Article = await response.json();
        setArticlesCache((prev) => new Map(prev).set(articleId, articleData));
      } else {
        console.error(`Failed to fetch article ${articleId}:`, response.status);
      }
    } catch (error) {
      console.error(`Error fetching article ${articleId}:`, error);
    } finally {
      setLoadingArticles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(articleId);
        return newSet;
      });
    }
  };

  const handleCompleteActivity = async (activityId: string) => {
    if (!auth.token) return;

    try {
      setProcessingActivities((prev) => new Set(prev).add(activityId));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      };

      // Trova l'attività per ottenere i dati attuali
      const activity = selectedGroup?.activities.find(
        (a) => a.id === activityId
      );
      if (!activity) {
        throw new Error('Attività non trovata');
      }

      const quantityStatus = getQuantityStatus(activity);

      // Prepara i dati per la richiesta di completamento
      const completeRequest: CompleteActivityRequest = {
        activity_id: activityId,
      };

      // Aggiungi i dati specifici in base al tipo di casistica
      if (quantityStatus.status === 'ECCESSO') {
        // Caso ECCESSO: serve warehouse_transfers (prelievi dai magazzini)
        const allocations = warehouseAllocations[activityId] || [];
        if (allocations.length === 0) {
          throw new Error(
            'Devi specificare da quali magazzini prelevare gli articoli'
          );
        }

        completeRequest.warehouse_transfers = allocations.map((allocation) => ({
          warehouse_id: allocation.warehouseId,
          quantity: allocation.quantity,
        }));
      } else if (quantityStatus.status === 'USO_PARZIALE') {
        // Caso USO_PARZIALE: serve distribution_warehouses (dove mettere la quantità non utilizzata)
        const allocations = warehouseAllocations[activityId] || [];
        if (allocations.length === 0) {
          throw new Error(
            'Devi specificare in quali magazzini mettere la quantità non utilizzata'
          );
        }

        completeRequest.distribution_warehouses = allocations.map(
          (allocation) => ({
            warehouse_id: allocation.warehouseId,
            quantity: allocation.quantity,
          })
        );
      }
      // Per PARI non serve aggiungere nulla

      console.log('🎯 Completing activity with request:', completeRequest);

      // Chiama il nuovo endpoint di completamento
      const response = await fetch('/api/inventory/complete-activity', {
        method: 'POST',
        headers,
        body: JSON.stringify(completeRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.details ||
          errorData.message ||
          "Errore nel completamento dell'attività";
        throw new Error(errorMessage);
      }

      const completionResult: CompleteActivityResponse = await response.json();
      console.log('✅ Activity completed successfully:', completionResult);

      // Salva il risultato nello state per feedback inline
      setCompletedActivities((prev) => {
        const updated = new Map(prev);
        updated.set(activityId, completionResult);
        return updated;
      });

      // Pulisci eventuali errori precedenti
      setActivityErrors((prev) => {
        const updated = new Map(prev);
        updated.delete(activityId);
        return updated;
      });

      // Pulisci le allocazioni per questa attività
      setWarehouseAllocations((prev) => {
        const updated = { ...prev };
        delete updated[activityId];
        return updated;
      });

      setActivityInEdit(null);

      // Ricarica i dati in background
      await fetchInventoryActivities();

      // Aggiorna il gruppo selezionato dopo il re-fetch
      if (selectedGroup) {
        setActivityGroups((currentGroups) => {
          const updatedGroup = currentGroups.find(
            (g) =>
              g.assistance_intervention_id ===
              selectedGroup.assistance_intervention_id
          );
          if (updatedGroup) {
            setSelectedGroup(updatedGroup);
          }
          return currentGroups;
        });
      }
    } catch (error) {
      console.error('❌ Error completing activity:', error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Errore durante il completamento dell'attività";

      setActivityErrors((prev) => {
        const updated = new Map(prev);
        updated.set(activityId, errorMessage);
        return updated;
      });
    } finally {
      setProcessingActivities((prev) => {
        const newSet = new Set(prev);
        newSet.delete(activityId);
        return newSet;
      });
    }
  };

  const handleStartEdit = (activityId: string) => {
    // Issue 1: assicurarsi che l'articolo sia caricato prima di entrare in edit mode
    const activity = selectedGroup?.activities.find((a) => a.id === activityId);
    if (activity?.data && typeof activity.data === 'object') {
      const data = activity.data as ActivityData;
      if (data.article_id && !articlesCache.has(data.article_id)) {
        fetchArticleData(data.article_id);
      }
    }

    setActivityInEdit(activityId);
    // Inizializza le allocazioni se non esistono
    if (!warehouseAllocations[activityId]) {
      setWarehouseAllocations((prev) => ({
        ...prev,
        [activityId]: [],
      }));
    }
  };

  // Correzione deposito di provenienza di un ricambio (trasferimento correttivo)
  const handleWarehouseCorrection = async (
    articleId: string,
    originalWarehouseId: string,
    newWarehouseId: string,
    quantity: number
  ) => {
    if (!auth.token || !selectedGroup) return;

    try {
      setProcessingCorrection(true);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      };

      // Trasferimento correttivo: dal deposito sbagliato al deposito corretto
      const response = await fetch('/api/inventory/bulk-transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transfers: [
            {
              article_id: articleId,
              from_warehouse_id: newWarehouseId,
              to_warehouse_id: originalWarehouseId,
              quantity,
              notes: `Correzione deposito provenienza (INT-${selectedGroup.assistance_intervention_id})`,
            },
            {
              article_id: articleId,
              from_warehouse_id: originalWarehouseId,
              to_warehouse_id: newWarehouseId,
              quantity,
              notes: `Correzione deposito provenienza (INT-${selectedGroup.assistance_intervention_id})`,
            },
          ],
          global_notes: `Correzione deposito per intervento ${selectedGroup.assistance_intervention_id}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.details || 'Errore nella correzione del deposito'
        );
      }

      // Ri-fetcha i dettagli dell'intervento per aggiornare i movements
      const intResponse = await fetch(
        `/api/assistance-interventions/${selectedGroup.assistance_intervention_id}`,
        { headers }
      );
      if (intResponse.ok) {
        const intData = await intResponse.json();
        setSelectedGroup((prev) =>
          prev
            ? {
                ...prev,
                connected_articles:
                  intData.connected_articles || prev.connected_articles,
              }
            : prev
        );
        // Aggiorna anche nel gruppo principale
        setActivityGroups((prev) =>
          prev.map((g) =>
            g.assistance_intervention_id ===
            selectedGroup.assistance_intervention_id
              ? {
                  ...g,
                  connected_articles:
                    intData.connected_articles || g.connected_articles,
                }
              : g
          )
        );
      }

      setEditingWarehouseArticle(null);
      setWarehouseCorrectionData(null);
    } catch (error) {
      console.error('Error correcting warehouse:', error);
      const msg =
        error instanceof Error ? error.message : 'Errore nella correzione';
      setActivityErrors((prev) => {
        const updated = new Map(prev);
        updated.set(`correction-${articleId}`, msg);
        return updated;
      });
    } finally {
      setProcessingCorrection(false);
    }
  };

  const addWarehouseAllocation = (activityId: string) => {
    setWarehouseAllocations((prev) => ({
      ...prev,
      [activityId]: [
        ...(prev[activityId] || []),
        { warehouseId: '', quantity: 0 },
      ],
    }));
  };

  const updateWarehouseAllocation = (
    activityId: string,
    index: number,
    field: 'warehouseId' | 'quantity',
    value: string | number
  ) => {
    setWarehouseAllocations((prev) => ({
      ...prev,
      [activityId]: (prev[activityId] || []).map((allocation, i) =>
        i === index ? { ...allocation, [field]: value } : allocation
      ),
    }));
  };

  const removeWarehouseAllocation = (activityId: string, index: number) => {
    setWarehouseAllocations((prev) => ({
      ...prev,
      [activityId]: (prev[activityId] || []).filter((_, i) => i !== index),
    }));
  };

  const getRequiredQuantity = (activity: InventoryActivity): number => {
    if (activity.data && typeof activity.data === 'object') {
      const data = activity.data as ActivityData;
      if (
        data.report_quantity !== undefined &&
        data.intervention_quantity !== undefined
      ) {
        const reportQty = data.report_quantity;
        const interventionQty = data.intervention_quantity;
        return Math.abs(reportQty - interventionQty);
      }
    }
    return 0;
  };

  const getTotalAllocated = (activityId: string): number => {
    const allocations = warehouseAllocations[activityId] || [];
    return allocations.reduce(
      (total, allocation) => total + allocation.quantity,
      0
    );
  };

  const canCompleteActivity = (activity: InventoryActivity): boolean => {
    const quantityStatus = getQuantityStatus(activity);

    if (quantityStatus.status === 'PARI') {
      return true; // Può completare direttamente
    }

    if (
      quantityStatus.status === 'ECCESSO' ||
      quantityStatus.status === 'USO_PARZIALE'
    ) {
      const requiredQty = getRequiredQuantity(activity);
      const allocatedQty = getTotalAllocated(activity.id);
      const allocations = warehouseAllocations[activity.id] || [];

      // Verifica che la quantità sia corretta e che tutte le allocazioni siano complete
      return (
        requiredQty === allocatedQty &&
        allocations.length > 0 &&
        allocations.every((a) => a.warehouseId && a.quantity > 0)
      );
    }

    return false;
  };

  const getWarehouseStock = (
    warehouseId: string,
    articleId: string
  ): number => {
    const article = articlesCache.get(articleId);
    if (!article) return 0;

    const inventory = article.inventory.find(
      (inv) => inv.warehouse_id.toString() === warehouseId
    );
    return inventory?.quantity_stock || 0;
  };

  const getAvailableWarehouses = (articleId: string) => {
    const article = articlesCache.get(articleId);
    if (!article) {
      // Se l'articolo non è ancora in cache, mostra tutti i magazzini come fallback
      return warehouses
        .filter((w) => w.id !== 'CL')
        .map((w) => ({
          id: w.id,
          description: w.description,
          stock: 0,
        }));
    }

    // Mostra tutti i magazzini dall'inventario dell'articolo (anche con stock 0)
    const inventoryWarehouses = article.inventory.map((inv) => ({
      id: inv.warehouse_id.toString(),
      description: inv.warehouse_description || `Magazzino ${inv.warehouse_id}`,
      stock: inv.quantity_stock || 0,
    }));

    // Se non ci sono voci inventario, fallback a tutti i magazzini
    if (inventoryWarehouses.length === 0) {
      return warehouses
        .filter((w) => w.id !== 'CL')
        .map((w) => ({
          id: w.id,
          description: w.description,
          stock: 0,
        }));
    }

    return inventoryWarehouses;
  };

  const getStatusBadgeColor = (pendingCount: number, totalCount: number) => {
    if (pendingCount === 0)
      return 'bg-green-100 text-green-800 border-green-200';
    if (pendingCount === totalCount)
      return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-orange-100 text-orange-800 border-orange-200';
  };

  const getQuantityStatus = (
    activity: InventoryActivity
  ): {
    status: 'PARI' | 'ECCESSO' | 'USO_PARZIALE' | 'VERIFICA';
    statusLabel: string;
    description: string;
    article?: Article;
  } => {
    if (activity.data && typeof activity.data === 'object') {
      const data = activity.data as ActivityData;

      // Controlla se ci sono le informazioni delle quantità nel formato richiesto
      if (
        data.article_id &&
        data.report_quantity !== undefined &&
        data.intervention_quantity !== undefined
      ) {
        const reportQty = data.report_quantity;
        const interventionQty = data.intervention_quantity;
        const article = articlesCache.get(data.article_id);

        if (reportQty === interventionQty) {
          return {
            status: 'PARI',
            statusLabel: '✓ Quantità Allineate',
            description: `Le quantità utilizzate e pianificate coincidono`,
            article,
          };
        } else if (reportQty > interventionQty) {
          return {
            status: 'ECCESSO',
            statusLabel: '↑ Eccesso Utilizzato',
            description: `Utilizzati più pezzi di quanto pianificato`,
            article,
          };
        } else {
          return {
            status: 'USO_PARZIALE',
            statusLabel: '↓ Uso Parziale',
            description: `Utilizzati meno pezzi di quanto pianificato`,
            article,
          };
        }
      }
    }

    // Default per verifiche e controlli senza dati specifici
    return {
      status: 'VERIFICA',
      statusLabel: '⚠ Verifica Necessaria',
      description: 'Verifica da completare per determinare la situazione',
    };
  };

  // Issue 2: Calcola la quantità preparata (movimenti CL netti) per un articolo
  const getPreparedQuantity = (articleId: string): number => {
    if (!selectedGroup?.connected_articles) return 0;
    const connArticle = selectedGroup.connected_articles.find(
      (ca) => ca.id === articleId
    );
    if (!connArticle?.movements) return 0;
    // Somma movimenti IN (verso CL) e sottrai movimenti OUT (da CL)
    const inbound = connArticle.movements
      .filter((m) => m.to_warehouse_id === 'CL')
      .reduce((sum, m) => sum + (m.quantity || 0), 0);
    const outbound = connArticle.movements
      .filter((m) => m.from_warehouse_id === 'CL')
      .reduce((sum, m) => sum + (m.quantity || 0), 0);
    return Math.max(0, inbound - outbound);
  };

  // Issue 3: Categorizza i ricambi (usati, non usati, aggiunti)
  const getSparePartsCategories = (): SparePartCategory[] => {
    if (!selectedGroup) return [];
    const { connected_articles = [], report_articles = [] } = selectedGroup;

    const categories: SparePartCategory[] = [];
    const reportMap = new Map<string, number>();
    for (const ra of report_articles) {
      reportMap.set(
        ra.article_id,
        (reportMap.get(ra.article_id) || 0) + ra.quantity
      );
    }

    const connectedIds = new Set<string>();
    for (const ca of connected_articles) {
      connectedIds.add(ca.id);
      const reportQty = reportMap.get(ca.id) || 0;
      const clMovementsIn = ca.movements
        ? ca.movements.filter((m) => m.to_warehouse_id === 'CL')
        : [];
      const clMovementsOut = ca.movements
        ? ca.movements.filter((m) => m.from_warehouse_id === 'CL')
        : [];
      const preparedQty = Math.max(
        0,
        clMovementsIn.reduce((s, m) => s + (m.quantity || 0), 0) -
          clMovementsOut.reduce((s, m) => s + (m.quantity || 0), 0)
      );

      // Raggruppa depositi di provenienza
      const warehouseMap = new Map<
        string,
        { warehouse_name: string; quantity: number }
      >();
      for (const m of clMovementsIn) {
        if (m.from_warehouse_id) {
          const key = m.from_warehouse_id;
          const existing = warehouseMap.get(key);
          if (existing) {
            existing.quantity += m.quantity || 0;
          } else {
            warehouseMap.set(key, {
              warehouse_name: m.from_warehouse_name || key,
              quantity: m.quantity || 0,
            });
          }
        }
      }

      categories.push({
        article_id: ca.id,
        short_description: ca.short_description || ca.description,
        description: ca.description || ca.short_description,
        pnc_code: ca.pnc_code,
        category: reportQty > 0 ? 'used' : 'unused',
        planned_quantity: ca.quantity,
        report_quantity: reportQty,
        prepared_quantity: preparedQty,
        source_warehouses: Array.from(warehouseMap.entries()).map(
          ([wId, data]) => ({
            warehouse_id: wId,
            warehouse_name: data.warehouse_name,
            quantity: data.quantity,
          })
        ),
      });
    }

    // Articoli nel report ma non nei connected_articles -> aggiunti dal tecnico
    for (const [articleId, qty] of reportMap.entries()) {
      if (!connectedIds.has(articleId)) {
        // Prova a recuperare il nome dalla cache articoli o dai report_items
        const cachedArticle = articlesCache.get(articleId);
        const reportItem = selectedGroup.report_items
          ?.flatMap((ri) => ri.articles)
          .find((a) => a.article_id === articleId);
        const name =
          cachedArticle?.short_description ||
          reportItem?.short_description ||
          articleId;
        const desc = cachedArticle?.description || name;
        categories.push({
          article_id: articleId,
          short_description: name,
          description: desc,
          pnc_code: cachedArticle?.pnc_code,
          category: 'added',
          planned_quantity: 0,
          report_quantity: qty,
          prepared_quantity: 0,
          source_warehouses: [],
        });
      }
    }

    return categories;
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
              <div className="text-lg font-semibold text-gray-900">
                Sincronizzazione in corso
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Pagina bloccata tra -1 e +5 minuti di ogni ora.
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Attendi qualche minuto e riprova.
              </div>
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
              <div className="text-lg font-semibold text-gray-900">
                Sincronizzazione in corso
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Pagina bloccata tra -1 e +5 minuti di ogni ora.
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Attendi qualche minuto e riprova.
              </div>
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
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Attività da completare
        </h2>
        <p className="text-gray-600 text-sm">
          Gestisci le anomalie di inventario e le attività di sanificazione dei
          dati
        </p>
      </div>

      {/* Filtri */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Cerca per cliente o ID intervento..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            {
              key: 'all' as const,
              label: 'Tutti',
              count: activityGroups.length,
            },
            { key: 'anomaly' as const, label: 'Anomalie', count: anomalyCount },
            {
              key: 'pending' as const,
              label: 'Da confermare',
              count: pendingCount,
            },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilterType(opt.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterType === opt.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {opt.label}
              {opt.count > 0 && (
                <span className="ml-1 text-xs opacity-70">({opt.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista Gruppi Attività */}
      {filteredGroups.length > 0 ? (
        <div className="mb-6">
          <div className="space-y-3">
            {filteredGroups.slice(0, visibleCount).map((group) => (
              <div
                key={`${group.isPendingConfirmation ? 'p' : 'a'}-${group.assistance_intervention_id}`}
                className={`rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                  group.isPendingConfirmation
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-white border-gray-200'
                }`}
                onClick={() => handleOpenActivities(group)}
              >
                <div className="px-4 py-3">
                  {/* Top: nome + badge + azione */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-900 text-base truncate">
                        {group.customer_name ||
                          `INT-${group.assistance_intervention_id}`}
                      </span>
                      {group.isPendingConfirmation ? (
                        <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded flex-shrink-0">
                          Da confermare
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${getStatusBadgeColor(group.pendingActivities, group.totalActivities)}`}
                        >
                          {group.pendingActivities === 1
                            ? '1 anomalia'
                            : `${group.pendingActivities} anomalie`}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenActivities(group);
                      }}
                      className={`${
                        group.isPendingConfirmation
                          ? 'text-purple-700 hover:text-purple-900'
                          : 'text-teal-700 hover:text-teal-900'
                      } text-sm font-medium transition-colors flex-shrink-0`}
                    >
                      {group.isPendingConfirmation ? 'Verifica →' : 'Esegui →'}
                    </button>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500 flex-wrap">
                    {group.date && (
                      <span>
                        <span className="text-gray-400">Data: </span>
                        {new Date(group.date).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                    {group.report_created_at && (
                      <span>
                        <span className="text-gray-400">Completato: </span>
                        {new Date(group.report_created_at).toLocaleDateString(
                          'it-IT',
                          {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          }
                        )}
                      </span>
                    )}
                    {group.report_id && (
                      <span className="text-teal-700">
                        RAP-{group.report_id}
                      </span>
                    )}
                    <span className="text-gray-400">
                      ID: {group.assistance_intervention_id}
                    </span>
                  </div>

                  {/* Note interne */}
                  {group.internal_notes && (
                    <div
                      className={`mt-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded border-l-2 ${
                        group.isPendingConfirmation
                          ? 'border-purple-400'
                          : 'border-teal-400'
                      }`}
                    >
                      {group.internal_notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          {visibleCount < filteredGroups.length && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2 text-right">
            {Math.min(visibleCount, filteredGroups.length)} di{' '}
            {filteredGroups.length}
            {activityGroups.length !== filteredGroups.length &&
              ` (${activityGroups.length} totali)`}
          </p>
        </div>
      ) : activityGroups.length > 0 ? (
        <div className="mb-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <div className="flex flex-col items-center">
              <Search className="text-gray-400 mb-3" size={40} />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Nessun risultato
              </h3>
              <p className="text-sm text-gray-500">
                Nessuna attività corrisponde ai filtri selezionati.
              </p>
              <button
                onClick={() => {
                  setFilterText('');
                  setFilterType('all');
                }}
                className="mt-3 text-sm text-teal-600 hover:text-teal-700 underline"
              >
                Resetta filtri
              </button>
            </div>
          </div>
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
                Tutti i dati di inventario sono allineati correttamente. Ottimo
                lavoro!
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
            <div className="border-b border-gray-200 px-6 py-4">
              {/* Top row: title + close */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">
                    {selectedGroup.customer_name ||
                      `INT-${selectedGroup.assistance_intervention_id}`}
                  </h2>
                  {selectedGroup.isPendingConfirmation ? (
                    <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded flex-shrink-0">
                      Da confermare
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded flex-shrink-0">
                      Anomalia
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowActivitiesModal(false);
                    setActivityInEdit(null);
                    setWarehouseAllocations({});
                    setEditingWarehouseArticle(null);
                    setWarehouseCorrectionData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 -mt-0.5"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 flex-wrap">
                {selectedGroup.date && (
                  <span>
                    <span className="text-gray-400">Data: </span>
                    {new Date(selectedGroup.date).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </span>
                )}
                {selectedGroup.report_created_at && (
                  <span>
                    <span className="text-gray-400">Completato: </span>
                    {new Date(
                      selectedGroup.report_created_at
                    ).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </span>
                )}
                {selectedGroup.assigned_to_name && (
                  <span>
                    <span className="text-gray-400">Tecnico: </span>
                    {selectedGroup.assigned_to_name}
                    {selectedGroup.assigned_to_surname
                      ? ` ${selectedGroup.assigned_to_surname}`
                      : ''}
                  </span>
                )}
                {selectedGroup.zone_label && (
                  <span>
                    <span className="text-gray-400">Zona: </span>
                    {selectedGroup.zone_label}
                  </span>
                )}
                {selectedGroup.type_label && (
                  <span>
                    <span className="text-gray-400">Tipo: </span>
                    {selectedGroup.type_label}
                  </span>
                )}
              </div>

              {/* Links row */}
              <div className="flex items-center gap-3 mt-2">
                {selectedGroup.report_id && (
                  <button
                    onClick={() =>
                      window.open(
                        `/interventi/rapportino/${selectedGroup.report_id}`,
                        '_blank'
                      )
                    }
                    className="flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 transition-colors"
                  >
                    <FileText size={12} />
                    <span className="font-medium">Rapportino</span>
                    <ExternalLink size={10} />
                  </button>
                )}
                <button
                  onClick={() =>
                    window.open(
                      `/interventi?ai=${selectedGroup.assistance_intervention_id}`,
                      '_blank'
                    )
                  }
                  className="flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 transition-colors"
                >
                  <Package size={12} />
                  <span className="font-medium">Intervento</span>
                  <ExternalLink size={10} />
                </button>
              </div>

              {/* Notes */}
              {(selectedGroup.internal_notes ||
                selectedGroup.customer_notes) && (
                <div className="mt-3 space-y-2">
                  {selectedGroup.internal_notes && (
                    <div className="text-sm text-gray-600 border-l-2 border-gray-300 pl-3">
                      {selectedGroup.internal_notes}
                    </div>
                  )}
                  {selectedGroup.customer_notes && (
                    <div className="text-sm text-gray-700 border-l-2 border-blue-400 pl-3 bg-blue-50 py-1.5 pr-3 rounded-r">
                      <span className="text-xs font-medium text-blue-600 block mb-0.5">
                        Lavoro eseguito
                      </span>
                      <span className="whitespace-pre-wrap">
                        {selectedGroup.customer_notes}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {/* Contenuto per interventi Da confermare (senza attività formali) */}
              {selectedGroup.isPendingConfirmation && (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={18} className="text-purple-600" />
                      <span className="font-medium text-purple-900">
                        Intervento in attesa di conferma
                      </span>
                    </div>
                    <p className="text-sm text-purple-800">
                      Questo intervento è stato completato dal tecnico ed è in
                      attesa di approvazione. Verifica i dati del rapportino e
                      gli articoli utilizzati prima di confermare.
                    </p>
                  </div>

                  {/* Articoli collegati */}
                  {selectedGroup.connected_articles &&
                    selectedGroup.connected_articles.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">
                          Articoli collegati all&apos;intervento
                        </h4>
                        <div className="space-y-2">
                          {selectedGroup.connected_articles.map((ca) => {
                            const inQty = ca.movements
                              ? ca.movements
                                  .filter((m) => m.to_warehouse_id === 'CL')
                                  .reduce((s, m) => s + (m.quantity || 0), 0)
                              : 0;
                            const outQty = ca.movements
                              ? ca.movements
                                  .filter((m) => m.from_warehouse_id === 'CL')
                                  .reduce((s, m) => s + (m.quantity || 0), 0)
                              : 0;
                            const preparedQty = Math.max(0, inQty - outQty);
                            return (
                              <div
                                key={ca.id}
                                className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {ca.short_description || ca.description}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID: {ca.id}
                                    {ca.pnc_code
                                      ? ` • PNC: ${ca.pnc_code}`
                                      : ''}
                                  </div>
                                </div>
                                <div className="flex gap-4 text-sm">
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500">
                                      Pianificata
                                    </div>
                                    <div className="font-bold text-blue-900">
                                      {ca.quantity}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500">
                                      Preparata
                                    </div>
                                    <div className="font-bold text-purple-900">
                                      {preparedQty}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Attività formali (per gruppi non Da confermare) */}
              {!selectedGroup.isPendingConfirmation && (
                <div className="space-y-4">
                  {selectedGroup.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`rounded-lg p-4 border-2 shadow-sm ${
                        completedActivities.has(activity.id)
                          ? 'bg-green-50 border-green-300'
                          : activityErrors.has(activity.id)
                            ? 'bg-red-50 border-red-300'
                            : 'bg-white'
                      }`}
                    >
                      {/* Banner di feedback completamento */}
                      {completedActivities.has(activity.id) && (
                        <div className="mb-3 p-3 bg-green-100 border border-green-300 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Check className="text-green-600" size={18} />
                              <div>
                                <span className="text-green-800 font-medium text-sm">
                                  Attività completata con successo
                                </span>
                                <span className="text-green-700 text-xs ml-2">
                                  {
                                    completedActivities.get(activity.id)!
                                      .movements_executed.length
                                  }{' '}
                                  movimenti eseguiti
                                  {completedActivities.get(activity.id)!
                                    .case_type &&
                                    ` · ${completedActivities.get(activity.id)!.case_type}`}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setCompletedActivities((prev) => {
                                  const updated = new Map(prev);
                                  updated.delete(activity.id);
                                  return updated;
                                });
                                handleStartEdit(activity.id);
                              }}
                              className="text-xs text-green-700 hover:text-green-900 underline font-medium"
                            >
                              Rettifica
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Banner errore */}
                      {activityErrors.has(activity.id) && (
                        <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <X className="text-red-600" size={18} />
                              <span className="text-red-800 text-sm">
                                {activityErrors.get(activity.id)}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setActivityErrors((prev) => {
                                  const updated = new Map(prev);
                                  updated.delete(activity.id);
                                  return updated;
                                });
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {/* Indicazione stato quantità */}
                          {(() => {
                            const quantityStatus = getQuantityStatus(activity);
                            return (
                              <div>
                                <div className="flex items-center gap-3 mb-3">
                                  <div
                                    className={`px-3 py-1 rounded text-sm font-medium ${
                                      completedActivities.has(activity.id) ||
                                      activity.status === 'done'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-orange-100 text-orange-800'
                                    }`}
                                  >
                                    {completedActivities.has(activity.id) ||
                                    activity.status === 'done'
                                      ? 'Completata'
                                      : 'Da completare'}
                                  </div>
                                  <span className="font-medium text-gray-900">
                                    {quantityStatus.statusLabel}
                                  </span>
                                </div>

                                {/* Quantità evidenziate */}
                                {(() => {
                                  const data = activity.data as ActivityData;
                                  return (
                                    data &&
                                    data.report_quantity !== undefined &&
                                    data.intervention_quantity !==
                                      undefined && (
                                      <div className="grid grid-cols-3 gap-3 mb-3">
                                        <div className="p-3 rounded border border-gray-200">
                                          <div className="text-xs text-gray-500 mb-1">
                                            Utilizzata
                                          </div>
                                          <div className="text-xl font-bold text-gray-900">
                                            {data.report_quantity}
                                          </div>
                                        </div>
                                        <div className="p-3 rounded border border-gray-200">
                                          <div className="text-xs text-gray-500 mb-1">
                                            Pianificata
                                          </div>
                                          <div className="text-xl font-bold text-gray-900">
                                            {data.intervention_quantity}
                                          </div>
                                        </div>
                                        <div className="p-3 rounded border border-gray-200">
                                          <div className="text-xs text-gray-500 mb-1">
                                            Preparata
                                          </div>
                                          <div className="text-xl font-bold text-gray-900">
                                            {data.article_id
                                              ? getPreparedQuantity(
                                                  data.article_id
                                                )
                                              : '-'}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  );
                                })()}

                                {/* Gestione magazzini per ECCESSO e USO PARZIALE */}
                                {activityInEdit === activity.id &&
                                  (quantityStatus.status === 'ECCESSO' ||
                                    quantityStatus.status ===
                                      'USO_PARZIALE') && (
                                    <div className="mb-4 p-4 bg-white rounded border">
                                      <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-medium text-gray-900">
                                          {quantityStatus.status === 'ECCESSO'
                                            ? `Preleva ${getRequiredQuantity(activity)} pezzi da magazzini`
                                            : `Assegna ${getRequiredQuantity(activity)} pezzi a magazzini`}
                                        </h4>
                                        <button
                                          onClick={() =>
                                            addWarehouseAllocation(activity.id)
                                          }
                                          className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                                        >
                                          + Aggiungi Magazzino
                                        </button>
                                      </div>

                                      {/* Lista allocazioni */}
                                      <div className="space-y-3">
                                        {(
                                          warehouseAllocations[activity.id] ||
                                          []
                                        ).map((allocation, index) => (
                                          <div
                                            key={index}
                                            className="flex items-center gap-3 p-3 bg-gray-50 rounded border"
                                          >
                                            <select
                                              value={allocation.warehouseId}
                                              onChange={(e) =>
                                                updateWarehouseAllocation(
                                                  activity.id,
                                                  index,
                                                  'warehouseId',
                                                  e.target.value
                                                )
                                              }
                                              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                                            >
                                              <option value="">
                                                Seleziona magazzino...
                                              </option>
                                              {(() => {
                                                const data =
                                                  activity.data as ActivityData;
                                                if (
                                                  quantityStatus.status ===
                                                    'ECCESSO' &&
                                                  data?.article_id
                                                ) {
                                                  // Per ECCESSO: mostra solo magazzini con stock > 0
                                                  return getAvailableWarehouses(
                                                    data.article_id
                                                  ).map((warehouse) => (
                                                    <option
                                                      key={warehouse.id}
                                                      value={warehouse.id}
                                                    >
                                                      {warehouse.description}{' '}
                                                      (Stock: {warehouse.stock})
                                                    </option>
                                                  ));
                                                } else {
                                                  // Per USO PARZIALE: mostra tutti i magazzini tranne "PRESTITI AI CLIENTI" (ID "CL")
                                                  return warehouses
                                                    .filter(
                                                      (warehouse) =>
                                                        warehouse.id !== 'CL'
                                                    )
                                                    .map((warehouse) => (
                                                      <option
                                                        key={warehouse.id}
                                                        value={warehouse.id}
                                                      >
                                                        {warehouse.description}
                                                      </option>
                                                    ));
                                                }
                                              })()}
                                            </select>

                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              <span className="text-sm text-gray-600">
                                                Qtà:
                                              </span>
                                              <input
                                                type="number"
                                                min="1"
                                                max={(() => {
                                                  const data =
                                                    activity.data as ActivityData;
                                                  return getRequiredQuantity(
                                                    activity
                                                  );
                                                })()}
                                                value={
                                                  allocation.quantity || ''
                                                }
                                                onChange={(e) => {
                                                  const newValue =
                                                    parseInt(e.target.value) ||
                                                    0;
                                                  const data =
                                                    activity.data as ActivityData;
                                                  const maxAllowed =
                                                    getRequiredQuantity(
                                                      activity
                                                    );

                                                  // Limita il valore al massimo consentito
                                                  const validValue = Math.min(
                                                    newValue,
                                                    maxAllowed
                                                  );
                                                  updateWarehouseAllocation(
                                                    activity.id,
                                                    index,
                                                    'quantity',
                                                    validValue
                                                  );
                                                }}
                                                className="w-20 px-2 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center text-gray-700"
                                              />
                                              {(() => {
                                                const data =
                                                  activity.data as ActivityData;
                                                return (
                                                  quantityStatus.status ===
                                                    'ECCESSO' &&
                                                  allocation.warehouseId &&
                                                  data?.article_id && (
                                                    <span className="text-xs text-gray-500">
                                                      /
                                                      {getWarehouseStock(
                                                        allocation.warehouseId,
                                                        data.article_id
                                                      )}
                                                    </span>
                                                  )
                                                );
                                              })()}
                                            </div>

                                            <button
                                              onClick={() =>
                                                removeWarehouseAllocation(
                                                  activity.id,
                                                  index
                                                )
                                              }
                                              className="text-red-600 hover:text-red-800 p-1 flex-shrink-0"
                                              title="Rimuovi"
                                            >
                                              <X size={16} />
                                            </button>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Indicatore progresso */}
                                      {(warehouseAllocations[activity.id] || [])
                                        .length > 0 && (
                                        <div className="mt-3 text-sm">
                                          {(() => {
                                            const required =
                                              getRequiredQuantity(activity);
                                            const allocated = getTotalAllocated(
                                              activity.id
                                            );
                                            const remaining =
                                              required - allocated;

                                            return (
                                              <div className="flex items-center justify-between p-2 bg-gray-100 rounded">
                                                <span className="text-gray-700">
                                                  Allocati: {allocated}/
                                                  {required}
                                                </span>
                                                {remaining > 0 ? (
                                                  <span className="text-orange-600 font-medium">
                                                    Mancanti: {remaining}
                                                  </span>
                                                ) : remaining === 0 ? (
                                                  <span className="text-green-600 font-medium">
                                                    ✓ Completo
                                                  </span>
                                                ) : (
                                                  <span className="text-red-600 font-medium">
                                                    Eccesso:{' '}
                                                    {Math.abs(remaining)}
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      )}

                                      {(warehouseAllocations[activity.id] || [])
                                        .length === 0 && (
                                        <div className="text-center py-4 text-gray-500 text-sm">
                                          Clicca &quot;Aggiungi Magazzino&quot;
                                          per iniziare
                                        </div>
                                      )}
                                    </div>
                                  )}

                                {/* Informazioni articolo */}
                                {(() => {
                                  const data = activity.data as ActivityData;
                                  return (
                                    quantityStatus.article &&
                                    data?.article_id && (
                                      <div className="">
                                        <div className="text-sm text-gray-700">
                                          <div className="font-medium text-gray-900 mb-1">
                                            {
                                              quantityStatus.article
                                                .short_description
                                            }
                                          </div>
                                          <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <span>
                                              PNC:{' '}
                                              {quantityStatus.article
                                                .pnc_code ||
                                                quantityStatus.article.id}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  );
                                })()}

                                {/* Loading articolo */}
                                {(() => {
                                  const data = activity.data as ActivityData;
                                  return (
                                    data?.article_id &&
                                    loadingArticles.has(data.article_id) && (
                                      <div className="mt-3 pt-3 border-t border-gray-200">
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                          <Loader2
                                            className="animate-spin"
                                            size={14}
                                          />
                                          Caricamento informazioni articolo...
                                        </div>
                                      </div>
                                    )
                                  );
                                })()}
                              </div>
                            );
                          })()}

                          <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 mt-3 border-t border-gray-100">
                            <div className="flex items-center gap-1">
                              <span>
                                Creata:{' '}
                                {new Date(
                                  activity.created_at
                                ).toLocaleDateString('it-IT')}
                              </span>
                            </div>
                            {activity.done_at && (
                              <div className="flex items-center gap-1">
                                <span>
                                  Completata:{' '}
                                  {new Date(
                                    activity.done_at
                                  ).toLocaleDateString('it-IT')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {activity.status === 'to_do' &&
                          !completedActivities.has(activity.id) && (
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              {(() => {
                                const quantityStatus =
                                  getQuantityStatus(activity);
                                const isEditing =
                                  activityInEdit === activity.id;
                                const canComplete =
                                  canCompleteActivity(activity);

                                if (quantityStatus.status === 'PARI') {
                                  // Caso PARI: completamento diretto
                                  return (
                                    <button
                                      onClick={() =>
                                        handleCompleteActivity(activity.id)
                                      }
                                      disabled={processingActivities.has(
                                        activity.id
                                      )}
                                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                      {processingActivities.has(activity.id) ? (
                                        <>
                                          <Loader2
                                            className="animate-spin"
                                            size={16}
                                          />
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
                                } else if (
                                  quantityStatus.status === 'ECCESSO' ||
                                  quantityStatus.status === 'USO_PARZIALE'
                                ) {
                                  // Casi ECCESSO e USO PARZIALE: richiedono gestione magazzini
                                  return (
                                    <div className="flex flex-col gap-2">
                                      {!isEditing ? (
                                        <button
                                          onClick={() =>
                                            handleStartEdit(activity.id)
                                          }
                                          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                          Gestisci
                                        </button>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() =>
                                              handleCompleteActivity(
                                                activity.id
                                              )
                                            }
                                            disabled={
                                              !canComplete ||
                                              processingActivities.has(
                                                activity.id
                                              )
                                            }
                                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                          >
                                            {processingActivities.has(
                                              activity.id
                                            ) ? (
                                              <>
                                                <Loader2
                                                  className="animate-spin"
                                                  size={16}
                                                />
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
                                            onClick={() =>
                                              setActivityInEdit(null)
                                            }
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
              )}

              {/* Issue 3: Riepilogo Ricambi */}
              {(() => {
                const categories = getSparePartsCategories();
                if (categories.length === 0) return null;

                const used = categories.filter((c) => c.category === 'used');
                const unused = categories.filter(
                  (c) => c.category === 'unused'
                );
                const added = categories.filter((c) => c.category === 'added');

                const renderSparePartRow = (
                  sp: SparePartCategory,
                  bgClass: string,
                  borderClass: string,
                  badgeClass: string,
                  badgeLabel: string,
                  showPlanned: boolean
                ) => (
                  <div
                    key={`${sp.category}-${sp.article_id}`}
                    className={`text-sm ${bgClass} p-3 rounded border ${borderClass}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`${badgeClass} text-xs font-medium px-2 py-0.5 rounded flex-shrink-0`}
                      >
                        {badgeLabel}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900">
                          {sp.description !== sp.short_description
                            ? sp.description
                            : sp.short_description}
                        </span>
                        {sp.pnc_code && (
                          <span className="ml-1.5 text-xs text-gray-500">
                            PNC: {sp.pnc_code}
                          </span>
                        )}
                        {!sp.pnc_code &&
                          sp.description !== sp.short_description &&
                          sp.short_description && (
                            <span className="ml-1.5 text-xs text-gray-500">
                              {sp.short_description}
                            </span>
                          )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-500">
                        {showPlanned && (
                          <span>Piano: {sp.planned_quantity}</span>
                        )}
                        {sp.report_quantity > 0 && (
                          <span>Report: {sp.report_quantity}</span>
                        )}
                        {sp.prepared_quantity > 0 && (
                          <span>Prep: {sp.prepared_quantity}</span>
                        )}
                      </div>
                    </div>
                    {/* Depositi di provenienza */}
                    {sp.source_warehouses.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">Deposito:</span>
                        {sp.source_warehouses.map((sw) => (
                          <div
                            key={sw.warehouse_id}
                            className="inline-flex items-center gap-1"
                          >
                            {editingWarehouseArticle ===
                            `${sp.article_id}-${sw.warehouse_id}` ? (
                              <div className="flex items-center gap-1">
                                <select
                                  value={
                                    warehouseCorrectionData?.newWarehouseId ||
                                    ''
                                  }
                                  onChange={(e) =>
                                    setWarehouseCorrectionData({
                                      articleId: sp.article_id,
                                      originalWarehouseId: sw.warehouse_id,
                                      newWarehouseId: e.target.value,
                                      quantity: sw.quantity,
                                    })
                                  }
                                  className="text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-teal-500 text-gray-700"
                                >
                                  <option value="">Seleziona...</option>
                                  {warehouses
                                    .filter(
                                      (w) =>
                                        w.id !== 'CL' &&
                                        w.id !== sw.warehouse_id
                                    )
                                    .map((w) => (
                                      <option key={w.id} value={w.id}>
                                        {w.description}
                                      </option>
                                    ))}
                                </select>
                                <button
                                  onClick={() => {
                                    if (
                                      warehouseCorrectionData?.newWarehouseId
                                    ) {
                                      handleWarehouseCorrection(
                                        warehouseCorrectionData.articleId,
                                        warehouseCorrectionData.originalWarehouseId,
                                        warehouseCorrectionData.newWarehouseId,
                                        warehouseCorrectionData.quantity
                                      );
                                    }
                                  }}
                                  disabled={
                                    !warehouseCorrectionData?.newWarehouseId ||
                                    processingCorrection
                                  }
                                  className="text-green-600 hover:text-green-800 disabled:text-gray-400 p-0.5"
                                  title="Conferma"
                                >
                                  {processingCorrection ? (
                                    <Loader2
                                      className="animate-spin"
                                      size={12}
                                    />
                                  ) : (
                                    <Check size={12} />
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingWarehouseArticle(null);
                                    setWarehouseCorrectionData(null);
                                  }}
                                  className="text-gray-500 hover:text-gray-700 p-0.5"
                                  title="Annulla"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="bg-white text-gray-700 text-xs px-2 py-0.5 rounded border border-gray-300">
                                  {sw.warehouse_name} ({sw.quantity} pz)
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingWarehouseArticle(
                                      `${sp.article_id}-${sw.warehouse_id}`
                                    );
                                    setWarehouseCorrectionData({
                                      articleId: sp.article_id,
                                      originalWarehouseId: sw.warehouse_id,
                                      newWarehouseId: '',
                                      quantity: sw.quantity,
                                    });
                                  }}
                                  className="text-gray-400 hover:text-teal-600 p-0.5"
                                  title="Modifica deposito"
                                >
                                  <Pencil size={11} />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                        {/* Errore correzione */}
                        {activityErrors.has(`correction-${sp.article_id}`) && (
                          <span className="text-xs text-red-600">
                            {activityErrors.get(`correction-${sp.article_id}`)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );

                return (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Riepilogo Ricambi
                    </h4>
                    <div className="space-y-2">
                      {used.map((sp) =>
                        renderSparePartRow(
                          sp,
                          'bg-green-50',
                          'border-green-200',
                          'bg-green-100 text-green-800',
                          'Usato',
                          true
                        )
                      )}
                      {unused.map((sp) =>
                        renderSparePartRow(
                          sp,
                          'bg-yellow-50',
                          'border-yellow-200',
                          'bg-yellow-100 text-yellow-800',
                          'Non usato',
                          true
                        )
                      )}
                      {added.map((sp) =>
                        renderSparePartRow(
                          sp,
                          'bg-blue-50',
                          'border-blue-200',
                          'bg-blue-100 text-blue-800',
                          'Aggiunto',
                          false
                        )
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Note per apparecchiatura dal rapportino */}
              {selectedGroup.report_items &&
                selectedGroup.report_items.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Dettaglio per apparecchiatura
                    </h4>
                    <div className="space-y-3">
                      {selectedGroup.report_items
                        .filter((ri) => ri.note || ri.articles.length > 0)
                        .map((ri) => (
                          <div
                            key={ri.equipment_id}
                            className="bg-gray-50 rounded-lg p-3 border-l-2 border-teal-400"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 text-sm">
                                {ri.equipment_description ||
                                  `Apparecchiatura #${ri.equipment_id}`}
                              </span>
                              {ri.equipment_serial_number && (
                                <span className="text-xs text-gray-500">
                                  S/N: {ri.equipment_serial_number}
                                </span>
                              )}
                              {ri.equipment_model && (
                                <span className="text-xs text-gray-500">
                                  Mod: {ri.equipment_model}
                                </span>
                              )}
                            </div>
                            {ri.note && (
                              <div className="text-sm text-gray-700 whitespace-pre-wrap mt-1">
                                {ri.note}
                              </div>
                            )}
                            {ri.articles.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {ri.articles.map((art, idx) => (
                                  <span
                                    key={`${art.article_id}-${idx}`}
                                    className="inline-flex items-center gap-1 bg-white text-xs text-gray-700 px-2 py-0.5 rounded border border-gray-200"
                                  >
                                    {art.short_description || art.article_id}
                                    <span className="font-medium text-teal-700">
                                      ×{art.quantity}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {selectedGroup.isPendingConfirmation ? (
                    <span className="text-purple-600">
                      Intervento in attesa di conferma
                    </span>
                  ) : (
                    (() => {
                      const realPending = selectedGroup.activities.filter(
                        (a) =>
                          a.status === 'to_do' && !completedActivities.has(a.id)
                      ).length;
                      return realPending > 0 ? (
                        <span className="text-orange-600">
                          {realPending} attività ancora da completare
                        </span>
                      ) : (
                        <span className="text-green-600">
                          ✅ Tutte le attività sono state completate
                        </span>
                      );
                    })()
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowActivitiesModal(false);
                    setActivityInEdit(null);
                    setWarehouseAllocations({});
                    setEditingWarehouseArticle(null);
                    setWarehouseCorrectionData(null);
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
            <div className="text-lg font-semibold text-gray-900">
              Sincronizzazione in corso
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Pagina bloccata tra -1 e +5 minuti di ogni ora.
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Attendi qualche minuto e riprova.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
