'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Package, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ArticleListItem, ArticlesApiResponse, PlaceType, ArticlePlace, Warehouse } from '../../types/article';
import DettaglioArticolo from './DettaglioArticolo';

interface Filters {
  searchTerm: string;
  family: string;
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
  const [itemsPerPage] = useState(20);
  
  // Stati per i filtri
  const [filters, setFilters] = useState<Filters>({
    searchTerm: '',
    family: '',
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

  const auth = useAuth();

  // Fetch dati iniziali
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch articoli quando cambiano filtri o pagina
  useEffect(() => {
    fetchArticles();
  }, [currentPage, filters]);

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

      // Fetch warehouses
      const warehousesResponse = await fetch('/api/warehouses', { headers });
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

  const fetchArticles = async () => {
    if (!auth.token) return;

    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams({
        page: currentPage.toString(),
        skip: itemsPerPage.toString(),
      });

      // Aggiungi filtri se presenti
      if (filters.searchTerm.trim()) {
        searchParams.append('query', filters.searchTerm.trim());
      }
      if (filters.family) {
        searchParams.append('family_id', filters.family);
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
      
      setArticles(data.data || []);
      setTotalItems(data.meta?.total || 0);
      setTotalPages(data.meta?.totalPages || 1);

      console.log('📊 Updated state - totalItems:', data.meta?.total, 'totalPages:', data.meta?.totalPages);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); // Reset alla prima pagina quando cambiano i filtri

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
  };

  const handleBackToList = () => {
    setShowArticleDetail(false);
    setSelectedArticleId(null);
  };

  const handleArticleUpdated = () => {
    // Ricarica la lista quando un articolo viene aggiornato
    fetchArticles();
  };

  // Calcola statistiche
  const getInStockCount = () => {
    return articles.filter(article => 
      article.quantity_stock && article.quantity_stock > 0
    ).length;
  };

  const getOutOfStockCount = () => {
    return articles.filter(article => 
      !article.quantity_stock || article.quantity_stock <= 0
    ).length;
  };

  const getLowStockCount = () => {
    return articles.filter(article => 
      article.quantity_stock && article.quantity_stock > 0 && article.quantity_stock < 10
    ).length;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  // Check if date has value for styling
  const hasDateValue = (dateString: string | null) => {
    return dateString && dateString.trim() !== '';
  };

  if (loading && articles.length === 0) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Caricamento inventario...</p>
          </div>
        </div>
      </div>
    );
  }

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Inventario</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Totale articoli: <span className="font-medium">{totalItems}</span>
          </div>
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
        </div>
      </div>

      {/* Search and filters */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca articolo per codice o descrizione..."
              value={filters.searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
            />
          </div>
          
          <div className="relative">
            <select
              value={filters.family}
              onChange={(e) => handleFilterChange('family', e.target.value)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8 text-gray-700"
            >
              <option value="">Tutte le famiglie</option>
              <option value="01">Merce</option>
              <option value="02">Ricambio</option>
              <option value="03">Attrezzatura</option>
            </select>
            <Package className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>

          <div className="relative">
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
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={filters.placeType}
              onChange={(e) => handleFilterChange('placeType', e.target.value)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8 text-gray-700"
            >
              <option value="">Tutti i tipi di posto</option>
              {placeTypes.map((type) => (
                <option key={type.id} value={type.id.toString()}>
                  {type.name}
                </option>
              ))}
            </select>
            <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>

          {filters.placeType && (
            <div className="relative">
              <select
                value={filters.place}
                onChange={(e) => handleFilterChange('place', e.target.value)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8 text-gray-700"
              >
                <option value="">Tutti i posti</option>
                {articlePlaces.map((place) => (
                  <option key={place.id} value={place.id.toString()}>
                    {place.name}
                  </option>
                ))}
              </select>
              <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          )}

          <div className="relative">
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
            onClick={fetchArticles}
            className="mt-2 text-red-600 hover:text-red-700 underline"
          >
            Riprova
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
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
                        {article.description && (
                          <div className="text-gray-500 text-xs mt-1 max-w-xs truncate">
                            {article.description}
                          </div>
                        )}
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
                      {article.quantity_stock !== null ? (
                        <span className={`font-medium ${
                          article.quantity_stock === 0 
                            ? 'text-red-600' 
                            : article.quantity_stock < 10 
                              ? 'text-orange-600' 
                              : 'text-green-600'
                        }`}>
                          {article.quantity_stock}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                      {article.quantity_reserved_client !== null && article.quantity_reserved_client > 0 && (
                        <span className="text-xs text-gray-500 ml-1">
                          ({article.quantity_reserved_client} ris.)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {article.warehouse_description || 'N/A'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      hasDateValue(article.updated_at) ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {formatDate(article.updated_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Pagina {currentPage} di {totalPages} - {totalItems} articoli totali
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Indietro
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
              className="px-3 py-1 text-sm text-teal-600 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Avanti
            </button>
          </div>
        </div>
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
    </div>
  );
}
