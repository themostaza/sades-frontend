'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Filter, User, Package, FileText, AlertCircle, CheckCircle2, AlertTriangle, RotateCcw, Activity, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AssistanceIntervention, AssistanceInterventionsApiResponse } from '../../types/assistance-interventions';
import { InterventionReportDetail } from '../../types/intervention-reports';
import { getStatusColor, statusOptions, getStatusId, toStatusKey } from '../../utils/intervention-status';
import DateRangePicker from '../../components/DateRangePicker';
import { InventoryActivity, InventoryActivitiesResponse, CompleteActivityRequest, CompleteActivityResponse } from '../../types/inventory';
import { Article } from '../../types/article';
import InventoryActivityModal from './InventoryActivityModal';

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
  
  // Stati per le attività di inventario
  const [activitiesData, setActivitiesData] = useState<Record<number, ActivityGroup>>({});
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedActivityGroup, setSelectedActivityGroup] = useState<ActivityGroup | null>(null);
  const [processingActivities, setProcessingActivities] = useState<Set<string>>(new Set());
  const [articlesCache, setArticlesCache] = useState<Map<string, Article>>(new Map());
  const [loadingArticles, setLoadingArticles] = useState<Set<string>>(new Set());
  const [activityInEdit, setActivityInEdit] = useState<string | null>(null);
  const [warehouseAllocations, setWarehouseAllocations] = useState<{
    [activityId: string]: Array<{
      warehouseId: string;
      quantity: number;
      maxAvailable?: number;
    }>;
  }>({});
  
  // Cache per equipment e articoli (come in DettaglioRapportino)
  const [equipmentById, setEquipmentById] = useState<Record<number, any>>({});
  const [articleById, setArticleById] = useState<Record<string, Article>>({});
  
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    skip: 20,
    totalPages: 1
  });

  // Stati per i filtri con caricamento da sessionStorage
  const [searchTerm, setSearchTerm] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('inventario_interventions_searchTerm');
      return saved || '';
    }
    return '';
  });
  
  const [dateRange, setDateRange] = useState<{from: string; to: string}>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('inventario_interventions_dateRange');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing saved dateRange:', e);
        }
      }
    }
    
    // Default values
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return {
      from: today.toISOString().split('T')[0],
      to: tomorrow.toISOString().split('T')[0]
    };
  });
  
  const [selectedZone, setSelectedZone] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('inventario_interventions_selectedZone');
      return saved || '';
    }
    return '';
  });
  
  const [selectedStatus, setSelectedStatus] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('inventario_interventions_selectedStatus');
      return saved || 'in_carico';
    }
    return 'in_carico';
  });
  
  const [selectedTechnician, setSelectedTechnician] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('inventario_interventions_selectedTechnician');
      return saved || '';
    }
    return '';
  });
  
  const [selectedManualCheck, setSelectedManualCheck] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('inventario_interventions_selectedManualCheck');
      return saved || '';
    }
    return '';
  });
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('inventario_interventions_currentPage');
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });
  
  const [pageSize] = useState(20);

  const auth = useAuth();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchInterventionsData();
  }, [currentPage, searchTerm, dateRange, selectedZone, selectedStatus, selectedTechnician, selectedManualCheck]);

  // Salva i filtri in sessionStorage quando cambiano
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('inventario_interventions_searchTerm', searchTerm);
      sessionStorage.setItem('inventario_interventions_dateRange', JSON.stringify(dateRange));
      sessionStorage.setItem('inventario_interventions_selectedZone', selectedZone);
      sessionStorage.setItem('inventario_interventions_selectedStatus', selectedStatus);
      sessionStorage.setItem('inventario_interventions_selectedTechnician', selectedTechnician);
      sessionStorage.setItem('inventario_interventions_selectedManualCheck', selectedManualCheck);
      sessionStorage.setItem('inventario_interventions_currentPage', currentPage.toString());
    }
  }, [searchTerm, dateRange, selectedZone, selectedStatus, selectedTechnician, selectedManualCheck, currentPage]);

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

      // Fetch technicians (available for all users) - role_id=2 per i tecnici
      const techniciansResponse = await fetch('/api/users?role_id=2&skip=1000', { headers });
      if (techniciansResponse.ok) {
        const responseData = await techniciansResponse.json();
        console.log('Technicians response received:', responseData);
        
        // L'API restituisce { data: [...], meta: {...} }
        const techniciansArray = responseData.data || responseData;
        
        if (Array.isArray(techniciansArray)) {
          setTechniciansData(techniciansArray);
          console.log('Technicians loaded:', techniciansArray.length);
        } else {
          console.warn('Technicians data is not an array:', responseData);
          setTechniciansData([]);
        }
      } else {
        console.error('Failed to fetch technicians:', techniciansResponse.status);
        setTechniciansData([]);
      }

      // Fetch warehouses
      const warehousesEndpoint = auth.user?.role === 'tecnico' || auth.user?.role === 'ufficio_tecnico' ? '/api/assigned-warehouses' : '/api/warehouses';
      const warehousesResponse = await fetch(warehousesEndpoint, { headers });
      
      if (warehousesResponse.ok) {
        const warehousesData = await warehousesResponse.json();
        setWarehouses(warehousesData);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setTechniciansData([]);
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
      if (selectedTechnician) {
        params.append('assigned_to_id', selectedTechnician);
      }
      if (selectedManualCheck === 'true' || selectedManualCheck === 'false') {
        params.append('manual_check', selectedManualCheck);
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
      
      // Fetch attività per gli interventi
      fetchActivitiesForInterventions(data.data);
      
      // Fetch info articoli per popolare le descrizioni
      fetchArticlesInfo(data.data);
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

  // Funzione per fetchare le attività degli interventi
  const fetchActivitiesForInterventions = async (interventions: AssistanceIntervention[]) => {
    if (!auth.token || interventions.length === 0) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

      // Fetch attività in sospeso (to_do)
      const response = await fetch('/api/inventory/activities?status=to_do&limit=1000', { headers });
      
      if (!response.ok) {
        console.error('Failed to fetch activities');
        return;
      }

      const data: InventoryActivitiesResponse = await response.json();
      
      // Raggruppa le attività per assistance_intervention_id
      const activitiesByIntervention: Record<number, ActivityGroup> = {};
      
      for (const activity of data.activities) {
        if (!activity.assistance_intervention_id) continue;
        
        const interventionId = activity.assistance_intervention_id;
        
        if (!activitiesByIntervention[interventionId]) {
          // Trova l'intervento corrispondente per ottenere i dati
          const intervention = interventions.find(i => i.id === interventionId);
          
          activitiesByIntervention[interventionId] = {
            assistance_intervention_id: interventionId,
            activities: [],
            totalActivities: 0,
            pendingActivities: 0,
            report_id: activity.report_id || undefined,
            customer_name: intervention?.company_name,
            date: intervention?.date,
            internal_notes: intervention?.internal_notes
          };
        }
        
        const group = activitiesByIntervention[interventionId];
        group.activities.push(activity);
        group.totalActivities++;
        if (activity.status === 'to_do') {
          group.pendingActivities++;
        }
      }
      
      setActivitiesData(activitiesByIntervention);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  // Funzione per fetchare dettagli equipment e articoli (come in DettaglioRapportino)
  const fetchArticlesInfo = async (interventions: AssistanceIntervention[]) => {
    if (!auth.token) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

      // Raccogli tutti gli IDs da interventions e reports
      const equipmentIds = new Set<number>();
      const articleIds = new Set<string>();

      interventions.forEach(intervention => {
        // Equipment pianificati
        intervention.connected_equipment?.forEach(eq => {
          if (eq.id && !equipmentById[eq.id]) {
            equipmentIds.add(eq.id);
          }
        });
        
        // Articoli pianificati
        intervention.connected_articles?.forEach(art => {
          if (art.id && !articleById[art.id]) {
            articleIds.add(art.id);
          }
        });
        
        // Equipment e articoli utilizzati (dal rapportino se disponibile)
        if (intervention.report_id && reportsData[intervention.report_id]) {
          const report = reportsData[intervention.report_id];
          report.items.forEach(item => {
            if (item.equipment_id && !equipmentById[item.equipment_id]) {
              equipmentIds.add(item.equipment_id);
            }
            item.articles?.forEach(art => {
              if (art.article_id && !articleById[art.article_id]) {
                articleIds.add(art.article_id);
              }
            });
          });
        }
      });

      const missingEquipments = Array.from(equipmentIds);
      const missingArticles = Array.from(articleIds);

      // Batch fetch come in DettaglioRapportino
      const equipmentPromises = missingEquipments.map(async (id) => {
        try {
          const res = await fetch(`/api/equipments/${id}`, { headers });
          if (!res.ok) return null;
          const data = await res.json();
          return { id, data };
        } catch {
          return null;
        }
      });

      const articlePromises = missingArticles.map(async (id) => {
        try {
          const res = await fetch(`/api/articles/${encodeURIComponent(id)}`, { headers });
          if (!res.ok) return null;
          const data: Article = await res.json();
          return { id, data };
        } catch {
          return null;
        }
      });

      // Aspetta che TUTTI i fetch siano completati
      const [equipmentResults, articleResults] = await Promise.all([
        Promise.all(equipmentPromises),
        Promise.all(articlePromises)
      ]);

      // Aggiorna le cache
      const newEquipments: Record<number, any> = {};
      equipmentResults.forEach(result => {
        if (result) newEquipments[result.id] = result.data;
      });
      if (Object.keys(newEquipments).length > 0) {
        setEquipmentById(prev => ({ ...prev, ...newEquipments }));
      }

      const newArticles: Record<string, Article> = {};
      articleResults.forEach(result => {
        if (result) newArticles[result.id] = result.data;
      });
      if (Object.keys(newArticles).length > 0) {
        setArticleById(prev => ({ ...prev, ...newArticles }));
      }

      console.log('✅ Fetched equipment:', Object.keys(newEquipments).length);
      console.log('✅ Fetched articles:', Object.keys(newArticles).length);
    } catch (error) {
      console.error('Error fetching equipment/articles info:', error);
    }
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

  const handleOpenActivityModal = (interventionId: number) => {
    const group = activitiesData[interventionId];
    if (!group) return;
    
    setSelectedActivityGroup(group);
    setShowActivityModal(true);
    
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

  const handleCompleteActivity = async (activityId: string) => {
    if (!auth.token) return;

    try {
      setProcessingActivities(prev => new Set(prev).add(activityId));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

      const activity = selectedActivityGroup?.activities.find(a => a.id === activityId);
      if (!activity) {
        throw new Error('Attività non trovata');
      }

      const data = activity.data as ActivityData;
      const reportQty = data.report_quantity || 0;
      const interventionQty = data.intervention_quantity || 0;
      
      const completeRequest: CompleteActivityRequest = {
        activity_id: activityId
      };

      if (reportQty > interventionQty) {
        // ECCESSO
        const allocations = warehouseAllocations[activityId] || [];
        if (allocations.length === 0) {
          throw new Error('Devi specificare da quali magazzini prelevare gli articoli');
        }
        completeRequest.warehouse_transfers = allocations.map(allocation => ({
          warehouse_id: allocation.warehouseId,
          quantity: allocation.quantity
        }));
      } else if (reportQty < interventionQty) {
        // USO_PARZIALE
        const allocations = warehouseAllocations[activityId] || [];
        if (allocations.length === 0) {
          throw new Error('Devi specificare in quali magazzini mettere la quantità non utilizzata');
        }
        completeRequest.distribution_warehouses = allocations.map(allocation => ({
          warehouse_id: allocation.warehouseId,
          quantity: allocation.quantity
        }));
      }

      const response = await fetch('/api/inventory/complete-activity', {
        method: 'POST',
        headers,
        body: JSON.stringify(completeRequest)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.message || 'Errore nel completamento');
      }

      const completionResult: CompleteActivityResponse = await response.json();
      alert(`Attività completata con successo!\n\nCaso: ${completionResult.case_type}\nMovimenti: ${completionResult.movements_executed.length}`);

      setWarehouseAllocations(prev => {
        const updated = { ...prev };
        delete updated[activityId];
        return updated;
      });
      
      setActivityInEdit(null);

      // Ricarica i dati
      fetchInterventionsData();

    } catch (error) {
      console.error('Error completing activity:', error);
      alert(error instanceof Error ? error.message : 'Errore durante il completamento');
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

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setDateRange({ from: '', to: '' });
    setSelectedZone('');
    setSelectedStatus('');
    setSelectedTechnician('');
    setSelectedManualCheck('');
    setCurrentPage(1);
    
    // Pulisci anche sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('inventario_interventions_searchTerm');
      sessionStorage.removeItem('inventario_interventions_dateRange');
      sessionStorage.removeItem('inventario_interventions_selectedZone');
      sessionStorage.removeItem('inventario_interventions_selectedStatus');
      sessionStorage.removeItem('inventario_interventions_selectedTechnician');
      sessionStorage.removeItem('inventario_interventions_selectedManualCheck');
      sessionStorage.removeItem('inventario_interventions_currentPage');
    }
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
          
          {/* Clear filters button */}
          <button
            onClick={handleClearAllFilters}
            className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0"
            title="Pulisci tutti i filtri"
          >
            <RotateCcw size={20} />
          </button>
          
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
          
          {/* Tecnico filter - available for all users */}
          <div className="relative flex-1 sm:flex-none sm:min-w-[180px]">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={selectedTechnician}
              onChange={(e) => handleTechnicianFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 appearance-none bg-white text-gray-700"
            >
              <option value="" className="text-gray-400">Filtra per tecnico</option>
              {Array.isArray(techniciansData) && techniciansData.map(technician => (
                <option key={technician.id} value={technician.id} className="text-gray-700">
                  {technician.surname ? `${technician.name} ${technician.surname}` : technician.name}
                </option>
              ))}
            </select>
          </div>
          
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
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={selectedTechnician}
                onChange={(e) => handleTechnicianFilter(e.target.value)}
                className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 appearance-none bg-white text-gray-700"
              >
                <option value="" className="text-gray-400">Filtra per tecnico</option>
                {Array.isArray(techniciansData) && techniciansData.map(technician => (
                  <option key={technician.id} value={technician.id} className="text-gray-700">
                    {technician.surname ? `${technician.name} ${technician.surname}` : technician.name}
                  </option>
                ))}
              </select>
            </div>
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
            <tbody className="bg-white">
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
                interventionsData.map((intervention, index) => (
                  <React.Fragment key={intervention.id}>
                    {/* Prima riga: dati principali dell'intervento */}
                    <tr className={`hover:bg-gray-50 transition-colors ${index > 0 ? 'border-t border-gray-200' : ''}`}>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-900 cursor-pointer" onClick={() => handleRowClick(intervention.id)}>
                        <div>
                          <div className="font-medium break-words">
                            {intervention.company_name}
                            {intervention.customer_client_code && (
                              <span className="text-gray-600 font-normal"> ({intervention.customer_client_code})</span>
                            )}
                          </div>
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
                            {/* APPARECCHIATURE */}
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Package className="text-blue-600" size={16} />
                                <h3 className="font-semibold text-gray-900 text-sm">Apparecchiature</h3>
                              </div>
                              {(() => {
                                // Combina tutti gli equipment (pianificati e utilizzati) in un unico array
                                const plannedEquipment = intervention.connected_equipment || [];
                                const usedEquipmentIds = reportsData[intervention.report_id!].items.map(item => item.equipment_id);
                                
                                // Crea un Set di tutti gli equipment IDs unici
                                const allEquipmentIds = new Set([
                                  ...plannedEquipment.map(eq => eq.id),
                                  ...usedEquipmentIds
                                ]);

                                if (allEquipmentIds.size === 0) {
                                  return <div className="text-gray-500 italic text-xs">Nessuna apparecchiatura</div>;
                                }

                                return (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs border border-gray-200 rounded-lg">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700">Apparecchiatura</th>
                                          <th className="px-3 py-2 text-center font-medium text-gray-700 w-24">Pianificato</th>
                                          <th className="px-3 py-2 text-center font-medium text-gray-700 w-24">Utilizzato</th>
                                          <th className="px-3 py-2 text-center font-medium text-gray-700 w-32">Differenza</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {Array.from(allEquipmentIds).map((equipmentId, index) => {
                                          const planned = plannedEquipment.find(eq => eq.id === equipmentId);
                                          const usedItem = reportsData[intervention.report_id!].items.find(item => item.equipment_id === equipmentId);
                                          
                                          const plannedQty = planned ? 1 : 0;
                                          const usedQty = usedItem ? 1 : 0;
                                          const diff = usedQty - plannedQty;
                                          
                                          // Usa i dati dal rapportino (ora arricchiti) o dal pianificato
                                          const displayName = usedItem?.equipment_model || planned?.model || (equipmentId || 'N/D');
                                          const displayDescription = usedItem?.equipment_description || planned?.description;
                                          const displaySerial = usedItem?.equipment_serial_number || planned?.serial_number;
                                          
                                          return (
                                            <tr key={index} className="hover:bg-gray-50">
                                              <td className="px-3 py-3">
                                                <div className="font-medium text-gray-900">
                                                  {displayName}
                                                </div>
                                                {displayDescription && (
                                                  <div className="text-gray-600 mt-0.5">{displayDescription}</div>
                                                )}
                                                {displaySerial && (
                                                  <div className="text-gray-500 mt-0.5 text-xs">S/N: {displaySerial}</div>
                                                )}
                                                {equipmentId && displayName !== equipmentId && displayName !== 'N/D' && (
                                                  <div className="text-gray-500 mt-0.5 text-xs">{equipmentId}</div>
                                                )}
                                              </td>
                                              <td className="px-3 py-3 text-center">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                                                  plannedQty > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400'
                                                }`}>
                                                  {plannedQty}
                                                </span>
                                              </td>
                                              <td className="px-3 py-3 text-center">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                                                  usedQty > 0 ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-400'
                                                }`}>
                                                  {usedQty}
                                                </span>
                                              </td>
                                              <td className="px-3 py-3 text-center">
                                                {diff === 0 ? (
                                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium" title="Corrispondente">
                                                    <CheckCircle2 size={12} />
                                                    Pari
                                                  </span>
                                                ) : diff > 0 ? (
                                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium" title="Utilizzato ma non pianificato">
                                                    <AlertTriangle size={12} />
                                                    +{diff}
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium" title="Pianificato ma non utilizzato">
                                                    <AlertCircle size={12} />
                                                    {diff}
                                                  </span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* ARTICOLI */}
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Package className="text-green-600" size={16} />
                                <h3 className="font-semibold text-gray-900 text-sm">Articoli / Pezzi di ricambio</h3>
                              </div>
                              {(() => {
                                // Combina tutti gli articoli (pianificati e utilizzati)
                                const plannedArticles = intervention.connected_articles || [];
                                const usedArticles = reportsData[intervention.report_id!].items.flatMap(item => item.articles || []);
                                
                                // Crea un Set di tutti gli article IDs unici
                                const allArticleIds = new Set([
                                  ...plannedArticles.map(art => art.id),
                                  ...usedArticles.map(art => art.article_id)
                                ]);

                                if (allArticleIds.size === 0) {
                                  return <div className="text-gray-500 italic text-xs">Nessun articolo</div>;
                                }

                                return (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs border border-gray-200 rounded-lg">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700">Articolo</th>
                                          <th className="px-3 py-2 text-center font-medium text-gray-700 w-24">Pianificato</th>
                                          <th className="px-3 py-2 text-center font-medium text-gray-700 w-24">Utilizzato</th>
                                          <th className="px-3 py-2 text-center font-medium text-gray-700 w-32">Differenza</th>
                                          <th className="px-3 py-2 text-center font-medium text-gray-700 w-28">Attività</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {Array.from(allArticleIds).map((articleId, index) => {
                                          const planned = plannedArticles.find(art => art.id === articleId);
                                          const used = usedArticles.filter(art => art.article_id === articleId);
                                          
                                          // Usa i dati dal rapportino (ora arricchiti) o dal pianificato
                                          const articleName = 
                                            used[0]?.short_description || 
                                            planned?.short_description || 
                                            used[0]?.description ||
                                            planned?.description || 
                                            used[0]?.article_name || 
                                            used[0]?.article_description ||
                                            articleId;
                                          const pncCode = used[0]?.pnc_code || planned?.pnc_code;
                                          
                                          const plannedQty = planned?.quantity || 0;
                                          const usedQty = used.reduce((sum, art) => sum + art.quantity, 0);
                                          const diff = usedQty - plannedQty;
                                          
                                          // Cerca attività per questo articolo
                                          const articleActivities = activitiesData[intervention.id]?.activities.filter(activity => {
                                            if (activity.data && typeof activity.data === 'object') {
                                              const data = activity.data as ActivityData;
                                              return data.article_id === articleId && activity.status === 'to_do';
                                            }
                                            return false;
                                          }) || [];
                                          
                                          return (
                                            <tr key={index} className="hover:bg-gray-50">
                                              <td className="px-3 py-3">
                                                <div className="font-medium text-gray-900">{articleName}</div>
                                                {articleId !== articleName && (
                                                  <div className="text-gray-500 mt-0.5 text-xs">{articleId}</div>
                                                )}
                                                {pncCode && (
                                                  <div className="text-gray-500 mt-0.5 text-xs">PNC: {pncCode}</div>
                                                )}
                                              </td>
                                              <td className="px-3 py-3 text-center">
                                                <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full ${
                                                  plannedQty > 0 ? 'bg-blue-100 text-blue-800 font-medium' : 'bg-gray-100 text-gray-400'
                                                }`}>
                                                  {plannedQty}
                                                </span>
                                              </td>
                                              <td className="px-3 py-3 text-center">
                                                <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full ${
                                                  usedQty > 0 ? 'bg-teal-100 text-teal-800 font-medium' : 'bg-gray-100 text-gray-400'
                                                }`}>
                                                  {usedQty}
                                                </span>
                                              </td>
                                              <td className="px-3 py-3 text-center">
                                                {diff === 0 ? (
                                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium" title="Quantità corrispondente">
                                                    <CheckCircle2 size={12} />
                                                    Pari
                                                  </span>
                                                ) : diff > 0 ? (
                                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium" title="Utilizzato più del pianificato">
                                                    <AlertTriangle size={12} />
                                                    +{diff}
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium" title="Utilizzato meno del pianificato">
                                                    <AlertCircle size={12} />
                                                    {diff}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-3 py-3 text-center">
                                                {articleActivities.length > 0 ? (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleOpenActivityModal(intervention.id);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-800 hover:bg-orange-200 text-xs font-medium transition-colors cursor-pointer"
                                                    title="Clicca per gestire le attività"
                                                  >
                                                    <Activity size={12} />
                                                    {articleActivities.length}
                                                  </button>
                                                ) : (
                                                  <span className="text-gray-400">—</span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        ) : (
                          // Vista normale senza rapportino
                          <div className="space-y-4">
                            {/* Apparecchiature */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="text-blue-600" size={14} />
                                <span className="font-medium text-gray-700">
                                  Apparecchiature ({intervention.equipment_count || 0})
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

      {/* Modal Attività */}
      <InventoryActivityModal
        show={showActivityModal}
        onClose={() => {
          setShowActivityModal(false);
          setSelectedActivityGroup(null);
          setActivityInEdit(null);
          setWarehouseAllocations({});
        }}
        selectedGroup={selectedActivityGroup}
        warehouses={warehouses}
        articlesCache={articlesCache}
        loadingArticles={loadingArticles}
        processingActivities={processingActivities}
        activityInEdit={activityInEdit}
        warehouseAllocations={warehouseAllocations}
        onStartEdit={handleStartEdit}
        onCompleteActivity={handleCompleteActivity}
        onAddWarehouseAllocation={addWarehouseAllocation}
        onUpdateWarehouseAllocation={updateWarehouseAllocation}
        onRemoveWarehouseAllocation={removeWarehouseAllocation}
        onCancelEdit={() => setActivityInEdit(null)}
      />
    </div>
  );
}
