'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Package, MapPin, Loader2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArticleListItem, ArticlesApiResponse, PlaceType, ArticlePlace, Warehouse } from '../../types/article';
import DettaglioArticolo from './DettaglioArticolo';
import MagazziniView from './MagazziniView';
import InterventionsView from './InterventionsView';
import ActivitiesView from './ActivitiesView';
import MovimentiView from './MovimentiView';

interface Filters {
  searchTerm: string;
  brand: string;
  placeType: string;
  place: string;
  warehouse: string;
  stock: string;
}

export default function InventarioPage() {
  // Stati per i dati
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [articlePlaces, setArticlePlaces] = useState<ArticlePlace[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  // Stati per il loading e errori
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Stati per la paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(50);
  const [loadingMoreArticles, setLoadingMoreArticles] = useState(false);
  
  // Stati per i filtri
  const [filters, setFilters] = useState<Filters>({
    searchTerm: '',
    brand: '',
    placeType: '',
    place: '',
    warehouse: '',
    stock: ''
  });
  
  // Stati per le sezioni collapsibili
  // const [showGiacenzeSection, setShowGiacenzeSection] = useState(false);
  // const [showArticoliInArrivoSection, setShowArticoliInArrivoSection] = useState(false);

  // Stati per la navigazione
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [showArticleDetail, setShowArticleDetail] = useState(false);
  
  // Stati per il dialog inventario
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [selectedArticleForInventory, setSelectedArticleForInventory] = useState<ArticleListItem | null>(null);
  
  // Stati per le tab
  const [viewMode, setViewMode] = useState<'inventario' | 'magazzini' | 'interventi' | 'attivita' | 'movimenti'>('inventario');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);

  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Inizializza la tab dall'URL al caricamento
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['inventario', 'magazzini', 'interventi', 'attivita', 'movimenti'].includes(tabFromUrl)) {
      setViewMode(tabFromUrl as 'inventario' | 'magazzini' | 'interventi' | 'attivita' | 'movimenti');
    }

    // Controlla se c'è un parametro 'article' nell'URL
    const articleFromUrl = searchParams.get('article');
    if (articleFromUrl) {
      setSelectedArticleId(articleFromUrl);
      setShowArticleDetail(true);
    }
  }, [searchParams]);

  // Fetch dati iniziali
  useEffect(() => {
    fetchInitialData();
    fetchArticles(1, false);
  }, []);

  // Fetch articoli quando cambiano filtri
  useEffect(() => {
    fetchArticles(1, false);
    setCurrentPage(1);
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      // Fetch place types
      const placeTypesResponse = await fetch('/api/place-types', { headers });
      if (placeTypesResponse.ok) {
        const placeTypesData = await placeTypesResponse.json();
        setPlaceTypes(placeTypesData);
      }

      // Fetch warehouses - usa assigned-warehouses se l'utente è un tecnico
      const warehousesEndpoint = auth.user?.role === 'tecnico' || auth.user?.role === 'ufficio_tecnico' ? '/api/assigned-warehouses' : '/api/warehouses';
      const warehousesResponse = await fetch(warehousesEndpoint, { headers });
      
      if (warehousesResponse.ok) {
        const warehousesData = await warehousesResponse.json();
        setWarehouses(warehousesData);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchArticlePlaces = async (placeTypeId: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/article-places?place_type_id=${placeTypeId}`, { headers });
      if (response.ok) {
        const placesData = await response.json();
        setArticlePlaces(placesData);
      }
    } catch (error) {
      console.error('Error fetching article places:', error);
    }
  };

  const fetchArticles = async (page = 1, append = false) => {
    if (!auth.token) return;

    try {
      // Solo per il caricamento iniziale, non per l'append
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMoreArticles(true);
      }
      setError(null);

      const searchParams = new URLSearchParams({
        page: page.toString(),
        skip: itemsPerPage.toString(),
      });

      // Aggiungi filtri se presenti
      if (filters.searchTerm.trim()) {
        searchParams.append('query', filters.searchTerm.trim());
      }
      if (filters.brand) {
        searchParams.append('brand_id', filters.brand);
      }
      if (filters.stock) {
        searchParams.append('stock', filters.stock);
      }
      if (filters.placeType) {
        searchParams.append('place_type_id', filters.placeType);
      }
      if (filters.place) {
        searchParams.append('place_id', filters.place);
      }
      if (filters.warehouse) {
        searchParams.append('warehouse_id', filters.warehouse);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

      const response = await fetch(`/api/articles?${searchParams.toString()}`, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch articles');
      }

      const data: ArticlesApiResponse = await response.json();
      console.log('📊 Raw API response:', data);
      console.log('📊 Meta info:', data.meta);
      console.log('📊 Articles count:', data.data?.length);
      
      // Aggiorna gli stati con i dati reali dell'API
      if (append) {
        setArticles(prev => [...prev, ...(data.data || [])]);
      } else {
        setArticles(data.data || []);
      }
      
      setCurrentPage(page);
      setTotalPages(data.meta?.totalPages || 1);
      setTotalItems(data.meta?.total || 0);

      console.log('📊 Updated state - totalItems:', data.meta?.total, 'totalPages:', data.meta?.totalPages);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching articles:', err);
    } finally {
      // Solo per il caricamento iniziale, non per l'append
      if (!append) {
        setLoading(false);
      } else {
        setLoadingMoreArticles(false);
      }
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    // Reset alla prima pagina quando cambiano i filtri - gestito nell'useEffect

    // Se cambia il place type, aggiorna i places disponibili
    if (key === 'placeType') {
      setFilters(prev => ({ ...prev, place: '' })); // Reset place selection
      if (value) {
        fetchArticlePlaces(value);
      } else {
        setArticlePlaces([]);
      }
    }
  };

  const handleSearch = (value: string) => {
    handleFilterChange('searchTerm', value);
  };

  // Gestione navigazione al dettaglio
  const handleArticleClick = (articleId: string) => {
    setSelectedArticleId(articleId);
    setShowArticleDetail(true);
    
    // Aggiorna l'URL con il parametro article
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set('article', articleId);
    router.push(`/inventario?${newSearchParams.toString()}`, { scroll: false });
  };

  const handleBackToList = () => {
    setShowArticleDetail(false);
    setSelectedArticleId(null);
    
    // Rimuovi il parametro article dall'URL
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.delete('article');
    router.push(`/inventario?${newSearchParams.toString()}`, { scroll: false });
  };

  const handleArticleUpdated = () => {
    // Ricarica la lista quando un articolo viene aggiornato
    fetchArticles(1, false);
  };

  // Funzione per gestire il cambio di tab e aggiornare l'URL
  const handleTabChange = (newTab: 'inventario' | 'magazzini' | 'interventi' | 'attivita' | 'movimenti') => {
    setViewMode(newTab);
    
    // Aggiorna l'URL con il nuovo tab
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set('tab', newTab);
    router.push(`/inventario?${newSearchParams.toString()}`, { scroll: false });
  };

  // Gestione selezione magazzino
  const handleWarehouseSelect = (warehouseId: string) => {
    setSelectedWarehouse(warehouseId);
  };

  // Calcola statistiche
  // const getInStockCount = () => {
  //   return articles.filter(article => 
  //     article.quantity_stock && article.quantity_stock > 0
  //   ).length;
  // };

  // const getOutOfStockCount = () => {
  //   return articles.filter(article => 
  //     !article.quantity_stock || article.quantity_stock <= 0
  //   ).length;
  // };

  // const getLowStockCount = () => {
  //   return articles.filter(article => 
  //     article.quantity_stock && article.quantity_stock > 0 && article.quantity_stock < 10
  //   ).length;
  // };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  // Check if date has value for styling
  const hasDateValue = (dateString: string | null) => {
    return dateString && dateString.trim() !== '';
  };

  // Helper function to get stock value (preferring in_stock over quantity_stock)
  const getStockValue = (inv: any): number => {
    const stockVal = typeof inv.in_stock === 'number' && inv.in_stock != null
      ? inv.in_stock
      : (inv.quantity_stock || 0);
    return stockVal || 0;
  };

  // Helper functions per calcolare i totali dall'inventory
  const getTotalStock = (article: ArticleListItem): number => {
    if (!article.inventory || !Array.isArray(article.inventory)) return 0;
    // Escludi il magazzino 'CL' e usa in_stock se disponibile
    return article.inventory
      .filter(inv => {
        const warehouseId = String(inv.warehouse_id ?? '');
        return warehouseId !== 'CL';
      })
      .reduce((total, inv) => total + getStockValue(inv), 0);
  };

  const getTotalReserved = (article: ArticleListItem): number => {
    if (!article.inventory || !Array.isArray(article.inventory)) return 0;
    // Escludi il magazzino 'CL'
    return article.inventory
      .filter(inv => {
        const warehouseId = String(inv.warehouse_id ?? '');
        return warehouseId !== 'CL';
      })
      .reduce((total, inv) => total + (inv.quantity_reserved_client || 0), 0);
  };



  const getWarehouseCount = (article: ArticleListItem): number => {
    if (!article.inventory || !Array.isArray(article.inventory)) return 0;
    return article.inventory.filter(inv => inv.warehouse_description && inv.warehouse_description.trim() !== '').length;
  };

  // Funzioni per gestire il dialog inventario
  const handleOpenInventoryDialog = (article: ArticleListItem) => {
    setSelectedArticleForInventory(article);
    setShowInventoryDialog(true);
  };

  const handleCloseInventoryDialog = () => {
    setShowInventoryDialog(false);
    setSelectedArticleForInventory(null);
  };

  // Mostra il dettaglio articolo se selezionato
  if (showArticleDetail && selectedArticleId) {
    return (
      <DettaglioArticolo
        articleId={selectedArticleId}
        onBack={handleBackToList}
        onArticleUpdated={handleArticleUpdated}
      />
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Inventario</h1>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => handleTabChange('inventario')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'inventario' ? 'bg-teal-600 text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Inventario
            </button>
            <button
              onClick={() => handleTabChange('magazzini')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'magazzini' ? 'bg-teal-600 text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Magazzini
            </button>
            <button
              onClick={() => handleTabChange('interventi')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'interventi' ? 'bg-teal-600 text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Interventi
            </button>
            <button
              onClick={() => handleTabChange('attivita')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'attivita' ? 'bg-teal-600 text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Attività
            </button>
            <button
              onClick={() => handleTabChange('movimenti')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'movimenti' ? 'bg-teal-600 text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Movimenti
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          {/*
          <div className="flex items-center gap-2">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              In stock: {getInStockCount()}
            </span>
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              Esauriti: {getOutOfStockCount()}
            </span>
            {getLowStockCount() > 0 && (
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                Scorte basse: {getLowStockCount()}
              </span>
            )}
          </div>
          */}
        </div>
      </div>

      {/* Content based on selected tab */}
      {viewMode === 'inventario' && (
        <>
          {/* Search and filters */}
          <div className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca articolo per codice o descrizione..."
              value={filters.searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
            />
          </div>
          
          {/* Loader accanto ai filtri */}
          {loading && (
            <Loader2 className="w-5 h-5 text-teal-600 animate-spin flex-shrink-0" />
          )}
          
          <div className="relative flex-shrink-0">
            <select
              value={filters.stock}
              onChange={(e) => handleFilterChange('stock', e.target.value)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8 text-gray-700"
            >
              <option value="">Tutti gli stock</option>
              <option value="1">In stock</option>
              <option value="-1">Esauriti</option>
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>

          <div className="relative flex-shrink-0">
            <select
              value={filters.placeType}
              onChange={(e) => handleFilterChange('placeType', e.target.value)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8 text-gray-700"
            >
              <option value="">Tutti i tipi di posto</option>
              {placeTypes.map((type) => (
                <option key={type.id} value={type.id.toString()}>
                  {type.label}
                </option>
              ))}
            </select>
            <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>

          {filters.placeType && (
            <div className="relative flex-shrink-0">
              <select
                value={filters.place}
                onChange={(e) => handleFilterChange('place', e.target.value)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8 text-gray-700"
              >
                <option value="">Tutti i posti</option>
                {articlePlaces.map((place) => (
                  <option key={place.id} value={place.id.toString()}>
                    {place.property_1} ({place.property_2})
                  </option>
                ))}
              </select>
              <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          )}

          <div className="relative flex-shrink-0">
            <select
              value={filters.warehouse}
              onChange={(e) => handleFilterChange('warehouse', e.target.value)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8 text-gray-700"
            >
              <option value="">Tutti i magazzini</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.description}
                </option>
              ))}
            </select>
            <Package className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => fetchArticles(1, false)}
            className="mt-2 text-red-600 hover:text-red-700 underline"
          >
            Riprova
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Visualizzati {articles.length} su {totalItems} articoli totali
              {totalPages > 1 && (
                <span className="text-gray-500 ml-2">
                  (pagina {currentPage} di {totalPages})
                </span>
              )}
            </h4>
            {currentPage < totalPages && (
              <button
                onClick={() => fetchArticles(currentPage + 1, true)}
                disabled={loadingMoreArticles}
                className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded-md flex items-center gap-1 transition-colors"
              >
                {loadingMoreArticles ? (
                  <>
                    <Loader2 className="animate-spin" size={12} />
                    Caricamento...
                  </>
                ) : (
                  <>
                    Carica altri 50
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Codice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrizione
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Famiglia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marchio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Magazzino
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data aggiornamento
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && articles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <Loader2 className="w-6 h-6 text-teal-600 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500">Caricamento...</p>
                  </td>
                </tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Nessun articolo trovato
                  </td>
                </tr>
              ) : (
                articles.map((article) => (
                  <tr 
                    key={article.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleArticleClick(article.id)}
                    title="Clicca per visualizzare i dettagli dell'articolo"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {article.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{article.short_description}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                          {article.pnc_code && (
                            <>
                              <span>PNC: {article.pnc_code}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>ID: {article.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {article.family_label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {article.brand_label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(() => {
                        const totalStock = getTotalStock(article);
                        const totalReserved = getTotalReserved(article);
                        const hasStock = totalStock > 0;
                        
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hasStock) handleOpenInventoryDialog(article);
                            }}
                            disabled={!hasStock}
                            className={`text-left font-medium transition-colors ${
                              hasStock 
                                ? 'hover:underline cursor-pointer' 
                                : 'cursor-not-allowed'
                            } ${
                              totalStock === 0 
                                ? 'text-red-600' 
                                : totalStock < 10 
                                  ? 'text-orange-600' 
                                  : 'text-green-600'
                            }`}
                            title={hasStock ? 'Clicca per vedere la divisione per magazzini' : 'Nessuno stock disponibile'}
                          >
                            <span>{totalStock}</span>
                            {totalReserved > 0 && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({totalReserved} ris.)
                              </span>
                            )}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(() => {
                        const warehouseCount = getWarehouseCount(article);
                        const hasWarehouses = warehouseCount > 0;
                        
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenInventoryDialog(article);
                            }}
                            className={`text-left font-medium transition-colors ${
                              hasWarehouses 
                                ? 'text-blue-600 hover:text-blue-800 hover:underline cursor-pointer' 
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                            title="Clicca per vedere la divisione per magazzini"
                          >
                            {warehouseCount} magazzin{warehouseCount === 1 ? 'o' : 'i'}
                          </button>
                        );
                      })()}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      hasDateValue(article.updated_at) ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {formatDate(article.updated_at)}
                    </td>
                  </tr>
                ))
              )}
              {/* Indicatore caricamento nuove righe */}
              {loadingMoreArticles && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      <span className="text-sm text-gray-600">Caricamento nuovi articoli...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pulsante carica altri in fondo alla tabella */}
        {currentPage < totalPages && articles.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
            <button
              onClick={() => fetchArticles(currentPage + 1, true)}
              disabled={loadingMoreArticles}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors mx-auto"
            >
              {loadingMoreArticles ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Caricamento...
                </>
              ) : (
                <>
                  Carica altri 50 articoli
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Giacenze section */}
      {/* <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <button
          onClick={() => setShowGiacenzeSection(!showGiacenzeSection)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-medium text-gray-900">Giacenze</h2>
          <ChevronDown 
            className={`transform transition-transform ${showGiacenzeSection ? 'rotate-180' : ''}`} 
            size={20} 
          />
        </button>
        
        {showGiacenzeSection && (
          <div className="border-t border-gray-200 p-6">
            <div className="text-center py-8 text-gray-500">
              Sezione in sviluppo - I dati di giacenza sono visualizzati nella tabella principale
            </div>
          </div>
        )}
      </div> */}

      {/* Articoli in arrivo section */}
      {/* <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowArticoliInArrivoSection(!showArticoliInArrivoSection)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-medium text-gray-900">Articoli in arrivo</h2>
          <ChevronDown 
            className={`transform transition-transform ${showArticoliInArrivoSection ? 'rotate-180' : ''}`} 
            size={20} 
          />
        </button>
        
        {showArticoliInArrivoSection && (
          <div className="border-t border-gray-200 p-6">
            <div className="text-center py-8 text-gray-500">
              Sezione in sviluppo - Richiede API dedicata per gli ordini in arrivo
            </div>
          </div>
        )}
      </div> */}
        </>
      )}

      {/* Magazzini View */}
      {viewMode === 'magazzini' && (
        <MagazziniView 
          onWarehouseSelect={handleWarehouseSelect}
          selectedWarehouse={selectedWarehouse}
          onArticleClick={handleArticleClick}
        />
      )}

      {/* Interventi View */}
      {viewMode === 'interventi' && (
        <InterventionsView 
          onInterventionClick={(id) => {
            // Naviga al dettaglio intervento nella pagina interventi
            window.open(`/interventi?intervention=${id}`, '_blank');
          }}
        />
      )}

      {/* Attività View */}
      {viewMode === 'attivita' && (
        <ActivitiesView />
      )}

      {/* Movimenti View */}
      {viewMode === 'movimenti' && (
        <MovimentiView 
          onMovementClick={(id) => {
            console.log('Movimento selezionato:', id);
          }}
        />
      )}

      {/* Dialog Inventario Magazzini */}
      {showInventoryDialog && selectedArticleForInventory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Inventario per Magazzini
                </h3>
                <div className="mt-1">
                  <p className="text-sm font-medium text-gray-900">{selectedArticleForInventory.short_description}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                    {selectedArticleForInventory.pnc_code && (
                      <>
                        <span>PNC: {selectedArticleForInventory.pnc_code}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>ID: {selectedArticleForInventory.id}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseInventoryDialog}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {selectedArticleForInventory.inventory && selectedArticleForInventory.inventory.length > 0 ? (
                (() => {
                  // Trova lo stock del magazzino CL
                  const clInventory = selectedArticleForInventory.inventory.find(inv => {
                    const warehouseId = String(inv.warehouse_id ?? '');
                    return warehouseId === 'CL';
                  });
                  const clStock = clInventory ? getStockValue(clInventory) : 0;

                  return (
                    <div className="space-y-4">
                      {selectedArticleForInventory.inventory
                        .filter(inv => {
                          // Escludi il magazzino 'CL' come negli altri componenti
                          const warehouseId = String(inv.warehouse_id ?? '');
                          return warehouseId !== 'CL';
                        })
                        .map((inv, index) => {
                          const stockValue = getStockValue(inv);
                          return (
                            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-900">
                                  {inv.warehouse_description || `Magazzino ${inv.warehouse_id}`}
                                </h4>
                                <span className="text-xs text-gray-500">
                                  ID: {inv.warehouse_id}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600 block">Stock Disponibile</span>
                                  <span className={`font-semibold ${
                                    stockValue === 0 
                                      ? 'text-red-600' 
                                      : stockValue < 10 
                                        ? 'text-orange-600' 
                                        : 'text-green-600'
                                  }`}>
                                    {stockValue}
                                  </span>
                                </div>
                                
                                <div>
                                  <span className="text-gray-600 block">Riservato Cliente (CL)</span>
                                  <span className={`font-semibold ${
                                    clStock > 0 ? 'text-blue-600' : 'text-gray-500'
                                  }`}>
                                    {clStock}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      
                      {/* Totali */}
                      <div className="border-t border-gray-300 pt-4 mt-6">
                        <h4 className="font-semibold text-gray-900 mb-3">Totali</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm bg-blue-50 p-4 rounded-lg">
                          <div>
                            <span className="text-gray-600 block">Stock Totale</span>
                            <span className={`font-bold text-lg ${
                              getTotalStock(selectedArticleForInventory) === 0 
                                ? 'text-red-600' 
                                : getTotalStock(selectedArticleForInventory) < 10 
                                  ? 'text-orange-600' 
                                  : 'text-green-600'
                            }`}>
                              {getTotalStock(selectedArticleForInventory)}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-gray-600 block">CL Stock</span>
                            <span className={`font-bold text-lg ${
                              clStock > 0 ? 'text-blue-600' : 'text-gray-500'
                            }`}>
                              {clStock}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-gray-600 block">Magazzini</span>
                            <span className="font-bold text-lg text-gray-900">
                              {getWarehouseCount(selectedArticleForInventory)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="mx-auto mb-3" size={48} />
                  <p>Nessun inventario disponibile per questo articolo</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={handleCloseInventoryDialog}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
