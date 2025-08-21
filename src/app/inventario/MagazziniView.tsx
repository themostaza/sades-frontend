'use client';

import React, { useState, useEffect } from 'react';
import { Package, MapPin, Search, ArrowRight, ArrowLeft, Loader2, AlertTriangle, X, Plus, Send, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ArticleListItem, ArticlesApiResponse, PlaceType, ArticlePlace } from '../../types/article';

interface Warehouse {
  id: string;
  description: string;
  article_count: string;
}



interface NewArticleForm {
  code: string;
  description: string;
  family: string;
  brand: string;
  serial: string;
  quantity: number;
}

interface TransferArticleItem {
  articleId: string;
  articleCode: string;
  articleDescription: string;
  availableQuantity: number;
  transferQuantity: number;
}

interface ArticleFilters {
  searchTerm: string;
  stock: string;
  placeType: string;
  place: string;
}

interface MagazziniViewProps {
  onWarehouseSelect?: (warehouseId: string) => void;
  selectedWarehouse?: string | null;
  onArticleClick?: (articleId: string) => void;
}

export default function MagazziniView({ onWarehouseSelect, selectedWarehouse, onArticleClick }: MagazziniViewProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Stati per i filtri degli articoli
  const [articleFilters, setArticleFilters] = useState<ArticleFilters>({
    searchTerm: '',
    stock: '',
    placeType: '',
    place: ''
  });
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [articlePlaces, setArticlePlaces] = useState<ArticlePlace[]>([]);
  
  // Stati per gli articoli del magazzino selezionato
  const [warehouseArticles, setWarehouseArticles] = useState<ArticleListItem[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [loadingMoreArticles, setLoadingMoreArticles] = useState(false);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [articlesCurrentPage, setArticlesCurrentPage] = useState(1);
  const [articlesTotalPages, setArticlesTotalPages] = useState(1);
  const [articlesPerPage] = useState(50);
  
  
  
  // Stati per il dialog inserimento articoli
  const [showInsertDialog, setShowInsertDialog] = useState(false);
  const [insertActiveTab, setInsertActiveTab] = useState<'external' | 'transfer'>('external');
  const [insertLoading, setInsertLoading] = useState(false);
  
  // Stati per inserimento dall'esterno
  const [newArticleForm, setNewArticleForm] = useState<NewArticleForm>({
    code: '',
    description: '',
    family: '',
    brand: '',
    serial: '',
    quantity: 1
  });
  
  // Stati per trasferimento da altro magazzino
  const [transferSourceWarehouse, setTransferSourceWarehouse] = useState<string>('');
  const [transferSourceArticles, setTransferSourceArticles] = useState<ArticleListItem[]>([]);
  const [transferArticles, setTransferArticles] = useState<TransferArticleItem[]>([]);
  const [transferArticlesLoading, setTransferArticlesLoading] = useState(false);
  
  // Stati per la selezione multipla e invio articoli
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendTargetWarehouse, setSendTargetWarehouse] = useState<string>('');
  const [sendLoading, setSendLoading] = useState(false);
  
  const auth = useAuth();

  useEffect(() => {
    fetchWarehousesStats();
    fetchPlaceTypes();
  }, []);

  // Fetch articoli quando cambia il magazzino selezionato
  useEffect(() => {
    if (selectedWarehouse) {
      fetchWarehouseArticles(selectedWarehouse, 1, false);
      // Reset stati paginazione
      setArticlesCurrentPage(1);
      setArticlesTotalPages(1);
      
    } else {
      setWarehouseArticles([]);
      setArticlesCurrentPage(1);
      setArticlesTotalPages(1);
     
    }
    // Pulisci sempre la selezione e i filtri quando cambia magazzino
    clearArticleSelection();
    resetArticleFilters();
  }, [selectedWarehouse]);

  // Fetch articoli quando cambiano i filtri
  useEffect(() => {
    if (selectedWarehouse) {
      fetchWarehouseArticles(selectedWarehouse, 1, false);
      setArticlesCurrentPage(1);
    }
  }, [articleFilters]);

  const fetchWarehousesStats = async () => {
    if (!auth.token) return;

    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

      const warehousesEndpoint = auth.user?.role === 'tecnico' ? '/api/assigned-warehouses' : '/api/warehouses';
      const response = await fetch(warehousesEndpoint, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch warehouses');
      }

      const warehousesData: Warehouse[] = await response.json();
      setWarehouses(warehousesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching warehouses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaceTypes = async () => {
    if (!auth.token) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

      const response = await fetch('/api/place-types', { headers });
      if (response.ok) {
        const data = await response.json();
        setPlaceTypes(data);
      }
    } catch (error) {
      console.error('Error fetching place types:', error);
    }
  };

  const fetchArticlePlaces = async (placeTypeId: string) => {
    if (!auth.token || !placeTypeId) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

      const response = await fetch(`/api/article-places?place_type_id=${placeTypeId}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setArticlePlaces(data);
      }
    } catch (error) {
      console.error('Error fetching article places:', error);
    }
  };



  const fetchWarehouseArticles = async (warehouseId: string, page = 1, append = false) => {
    if (!auth.token) return;

    try {
      // Solo per il caricamento iniziale, non per l'append
      if (!append) {
        setArticlesLoading(true);
      } else {
        setLoadingMoreArticles(true);
      }
      setArticlesError(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

      // Fetch articoli filtrati per magazzino
      const searchParams = new URLSearchParams({
        warehouse_id: warehouseId,
        page: page.toString(),
        skip: articlesPerPage.toString(),
      });

      // Aggiungi filtri se presenti
      if (articleFilters.searchTerm.trim()) {
        searchParams.append('query', articleFilters.searchTerm.trim());
      }
      if (articleFilters.stock) {
        searchParams.append('stock', articleFilters.stock);
      }
      if (articleFilters.placeType) {
        searchParams.append('place_type_id', articleFilters.placeType);
      }
      if (articleFilters.place) {
        searchParams.append('place_id', articleFilters.place);
      }

      const response = await fetch(`/api/articles?${searchParams.toString()}`, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch warehouse articles');
      }

      const data: ArticlesApiResponse = await response.json();
      
      // Aggiorna gli stati con i dati reali dell'API
      if (append) {
        setWarehouseArticles(prev => [...prev, ...(data.data || [])]);
      } else {
        setWarehouseArticles(data.data || []);
      }
      
      setArticlesCurrentPage(page);
      setArticlesTotalPages(data.meta?.totalPages || 1);
      

    } catch (err) {
      setArticlesError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching warehouse articles:', err);
    } finally {
      // Solo per il caricamento iniziale, non per l'append
      if (!append) {
        setArticlesLoading(false);
      } else {
        setLoadingMoreArticles(false);
      }
    }
  };

  const formatArticleDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const hasDateValue = (dateString: string | null) => {
    return dateString && dateString.trim() !== '';
  };

  const handleWarehouseClick = (warehouseId: string) => {
    if (onWarehouseSelect) {
      onWarehouseSelect(warehouseId);
    }
    
    // Scroll alla sezione dettaglio dopo un breve delay per permettere il render
    setTimeout(() => {
      const detailSection = document.getElementById('warehouse-detail-section');
      if (detailSection) {
        detailSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  const handleArticleClick = (articleId: string) => {
    if (onArticleClick) {
      onArticleClick(articleId);
    }
  };

  const handleArticleFilterChange = (key: keyof ArticleFilters, value: string) => {
    setArticleFilters(prev => ({
      ...prev,
      [key]: value
    }));

    // Se cambia il place type, aggiorna i places disponibili
    if (key === 'placeType') {
      setArticleFilters(prev => ({ ...prev, place: '' })); // Reset place selection
      if (value) {
        fetchArticlePlaces(value);
      } else {
        setArticlePlaces([]);
      }
    }
  };

  const resetArticleFilters = () => {
    setArticleFilters({
      searchTerm: '',
      stock: '',
      placeType: '',
      place: ''
    });
    setArticlePlaces([]);
  };



  // Funzioni per il dialog inserimento articoli
  const handleOpenInsertDialog = () => {
    setShowInsertDialog(true);
    setInsertActiveTab('external');
    // Reset dei form
    setNewArticleForm({
      code: '',
      description: '',
      family: '',
      brand: '',
      serial: '',
      quantity: 1
    });
    setTransferSourceWarehouse('');
    setTransferSourceArticles([]);
    setTransferArticles([]);
  };

  const handleCloseInsertDialog = () => {
    setShowInsertDialog(false);
    setInsertActiveTab('external');
    setNewArticleForm({
      code: '',
      description: '',
      family: '',
      brand: '',
      serial: '',
      quantity: 1
    });
    setTransferSourceWarehouse('');
    setTransferSourceArticles([]);
    setTransferArticles([]);
  };

  const fetchTransferSourceArticles = async (sourceWarehouseId: string) => {
    if (!auth.token || !sourceWarehouseId) return;

    try {
      setTransferArticlesLoading(true);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

      const searchParams = new URLSearchParams({
        warehouse_id: sourceWarehouseId,
        page: '1',
        skip: '100',
      });

      const response = await fetch(`/api/articles?${searchParams.toString()}`, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch source warehouse articles');
      }

      const data: ArticlesApiResponse = await response.json();
      const availableArticles = (data.data || []).filter(article => 
        article.quantity_stock && article.quantity_stock > 0
      );
      
      setTransferSourceArticles(availableArticles);
      setTransferArticles([]);

    } catch (err) {
      console.error('Error fetching source warehouse articles:', err);
      alert('Errore nel caricamento degli articoli del magazzino sorgente');
    } finally {
      setTransferArticlesLoading(false);
    }
  };

  const handleTransferSourceWarehouseChange = (warehouseId: string) => {
    setTransferSourceWarehouse(warehouseId);
    if (warehouseId) {
      fetchTransferSourceArticles(warehouseId);
    } else {
      setTransferSourceArticles([]);
      setTransferArticles([]);
    }
  };

  const addTransferArticle = (article: ArticleListItem) => {
    const existingIndex = transferArticles.findIndex(item => item.articleId === article.id);
    if (existingIndex >= 0) {
      alert('Articolo già aggiunto alla lista');
      return;
    }

    const newTransferItem: TransferArticleItem = {
      articleId: article.id,
      articleCode: article.id,
      articleDescription: article.short_description,
      availableQuantity: article.quantity_stock || 0,
      transferQuantity: 1
    };

    setTransferArticles(prev => [...prev, newTransferItem]);
  };

  const updateTransferQuantity = (articleId: string, quantity: number) => {
    setTransferArticles(prev => prev.map(item => 
      item.articleId === articleId 
        ? { ...item, transferQuantity: Math.max(1, Math.min(quantity, item.availableQuantity)) }
        : item
    ));
  };

  const removeTransferArticle = (articleId: string) => {
    setTransferArticles(prev => prev.filter(item => item.articleId !== articleId));
  };

  const handleSubmitExternalInsert = async () => {
    if (!selectedWarehouse || !newArticleForm.code.trim() || !newArticleForm.description.trim()) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    setInsertLoading(true);

    try {
      // TODO: Chiamata API per inserire articolo dall'esterno
      console.log('Inserimento articolo dall\'esterno:', {
        warehouseId: selectedWarehouse,
        article: newArticleForm
      });

      // Simula delay API
      await new Promise(resolve => setTimeout(resolve, 1000));

      alert('Articolo inserito con successo!');
      
      // Ricarica gli articoli del magazzino
      if (selectedWarehouse) {
        fetchWarehouseArticles(selectedWarehouse, 1, false);
      }
      
      handleCloseInsertDialog();

    } catch (error) {
      console.error('Errore nell\'inserimento:', error);
      alert('Errore durante l\'inserimento dell\'articolo');
    } finally {
      setInsertLoading(false);
    }
  };

  const handleSubmitTransfer = async () => {
    if (!selectedWarehouse || !transferSourceWarehouse || transferArticles.length === 0) {
      alert('Seleziona un magazzino sorgente e almeno un articolo');
      return;
    }

    // Verifica che tutte le quantità siano valide
    const invalidItems = transferArticles.filter(item => 
      item.transferQuantity <= 0 || item.transferQuantity > item.availableQuantity
    );
    if (invalidItems.length > 0) {
      alert('Verifica le quantità degli articoli selezionati');
      return;
    }

    setInsertLoading(true);

    try {
      // TODO: Chiamata API per trasferire articoli
      console.log('Trasferimento articoli:', {
        fromWarehouse: transferSourceWarehouse,
        toWarehouse: selectedWarehouse,
        articles: transferArticles
      });

      // Simula delay API
      await new Promise(resolve => setTimeout(resolve, 1000));

      alert(`Trasferiti ${transferArticles.length} articoli con successo!`);
      
      // Ricarica gli articoli del magazzino
      if (selectedWarehouse) {
        fetchWarehouseArticles(selectedWarehouse, 1, false);
      }
      
      handleCloseInsertDialog();

    } catch (error) {
      console.error('Errore nel trasferimento:', error);
      alert('Errore durante il trasferimento degli articoli');
    } finally {
      setInsertLoading(false);
    }
  };

  // Funzioni per la selezione multipla articoli
  const handleSelectArticle = (articleId: string, selected: boolean) => {
    if (selected) {
      setSelectedArticles(prev => [...prev, articleId]);
    } else {
      setSelectedArticles(prev => prev.filter(id => id !== articleId));
    }
  };

  const handleSelectAllArticles = (selected: boolean) => {
    if (selected) {
      setSelectedArticles(warehouseArticles.map(article => article.id));
    } else {
      setSelectedArticles([]);
    }
  };

  const clearArticleSelection = () => {
    setSelectedArticles([]);
  };

  const handleOpenSendDialog = () => {
    setShowSendDialog(true);
    setSendTargetWarehouse('');
  };

  const handleCloseSendDialog = () => {
    setShowSendDialog(false);
    setSendTargetWarehouse('');
  };

  const handleConfirmSendArticles = async () => {
    if (!sendTargetWarehouse || selectedArticles.length === 0) {
      alert('Seleziona un magazzino di destinazione');
      return;
    }

    setSendLoading(true);

    try {
      // TODO: Chiamata API per inviare articoli
      console.log('Invio articoli:', {
        fromWarehouse: selectedWarehouse,
        toWarehouse: sendTargetWarehouse,
        articleIds: selectedArticles
      });

      // Simula delay API
      await new Promise(resolve => setTimeout(resolve, 1500));

      alert(`Inviati ${selectedArticles.length} articoli con successo!`);
      
      // Ricarica gli articoli e pulisci selezione
      if (selectedWarehouse) {
        fetchWarehouseArticles(selectedWarehouse, 1, false);
      }
      clearArticleSelection();
      handleCloseSendDialog();

    } catch (error) {
      console.error('Errore nell\'invio articoli:', error);
      alert('Errore durante l\'invio degli articoli');
    } finally {
      setSendLoading(false);
    }
  };

  // Filtra i magazzini in base al termine di ricerca
  const filteredWarehouses = warehouses.filter(warehouse =>
    warehouse.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <span className="ml-2 text-gray-600">Caricamento magazzini...</span>
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
            onClick={fetchWarehousesStats}
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
      {/* Header with search */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <p className="text-gray-600 text-sm">
            Panoramica dei {warehouses.length} magazzini disponibili
            {searchTerm && filteredWarehouses.length !== warehouses.length && (
              <span className="ml-2">
                ({filteredWarehouses.length} {filteredWarehouses.length === 1 ? 'risultato' : 'risultati'})
              </span>
            )}
          </p>
          
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca magazzino per nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
            />
          </div>
        </div>
      </div>



      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredWarehouses.map((warehouse) => (
          <div
            key={warehouse.id}
            onClick={() => handleWarehouseClick(warehouse.id)}
            className={`bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all duration-200 cursor-pointer ${
              selectedWarehouse === warehouse.id 
                ? 'ring-2 ring-teal-500 border-teal-500 bg-teal-50' 
                : 'hover:border-gray-300'
            }`}
          >
            {/* Header della card */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Package className="text-teal-600 flex-shrink-0" size={16} />
                <h3 className={`text-gray-900 truncate text-xs ${
                  selectedWarehouse === warehouse.id ? 'font-bold' : 'font-medium'
                }`}>
                  {warehouse.description}
                </h3>
              </div>
            </div>

            {/* Statistiche principali */}
            <div className="space-y-2">
              {/* Numero articoli */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Articoli totali</span>
                <span className="text-xs font-semibold text-gray-900">
                  {parseInt(warehouse.article_count).toLocaleString('it-IT')}
                </span>
              </div>




            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredWarehouses.length === 0 && warehouses.length > 0 && (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun magazzino trovato</h3>
          <p className="text-gray-600">
            Non sono stati trovati magazzini che corrispondono alla ricerca &quot;{searchTerm}&quot;.
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-4 text-teal-600 hover:text-teal-700 underline"
          >
            Cancella ricerca
          </button>
        </div>
      )}
      
      {warehouses.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun magazzino disponibile</h3>
          <p className="text-gray-600">Non sono stati trovati magazzini disponibili.</p>
        </div>
      )}

      {/* Dettaglio magazzino selezionato */}
      {selectedWarehouse && (
        <div id="warehouse-detail-section" className="mt-8 scroll-mt-6">
          <div className="bg-gray-50 rounded-lg p-6 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-lg font-medium text-gray-900">
                <span className="font-bold">{filteredWarehouses.find(w => w.id === selectedWarehouse)?.description || warehouses.find(w => w.id === selectedWarehouse)?.description}</span>
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenInsertDialog}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
                >
                  <ArrowLeft size={16} />
                  Inserisci articoli
                </button>
              </div>
            </div>
          </div>
          
          {/* Filtri per gli articoli */}
          <div className="mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Search bar */}
              <div className="relative flex-1 min-w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Cerca articolo per codice o descrizione..."
                  value={articleFilters.searchTerm}
                  onChange={(e) => handleArticleFilterChange('searchTerm', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                />
              </div>
              
              {/* Loader */}
              {(articlesLoading || loadingMoreArticles) && (
                <Loader2 className="w-5 h-5 text-teal-600 animate-spin flex-shrink-0" />
              )}
              
              {/* Filtro Stock */}
              <div className="relative flex-shrink-0">
                <select
                  value={articleFilters.stock}
                  onChange={(e) => handleArticleFilterChange('stock', e.target.value)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8 text-gray-700"
                >
                  <option value="">Tutti gli stock</option>
                  <option value="1">In stock</option>
                  <option value="-1">Esauriti</option>
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>

              {/* Filtro Place Type */}
              <div className="relative flex-shrink-0">
                <select
                  value={articleFilters.placeType}
                  onChange={(e) => handleArticleFilterChange('placeType', e.target.value)}
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

              {/* Filtro Place */}
              {articleFilters.placeType && (
                <div className="relative flex-shrink-0">
                  <select
                    value={articleFilters.place}
                    onChange={(e) => handleArticleFilterChange('place', e.target.value)}
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

              {/* Reset filters button */}
              {(articleFilters.searchTerm || articleFilters.stock || articleFilters.placeType || articleFilters.place) && (
                <button
                  onClick={resetArticleFilters}
                  className="text-sm text-gray-600 hover:text-gray-800 underline flex-shrink-0"
                >
                  Cancella filtri
                </button>
              )}
            </div>
          </div>
          
          {/* Articoli del magazzino */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">
                  visibili {warehouseArticles.length} su {parseInt(warehouses.find(w => w.id === selectedWarehouse)?.article_count || '0')} totali
                  {articlesTotalPages > 1 && (
                    <span className="text-gray-500 ml-2">
                      (pagina {articlesCurrentPage} di {articlesTotalPages})
                    </span>
                  )}
                </h4>
                {articlesCurrentPage < articlesTotalPages && (
                  <button
                    onClick={() => selectedWarehouse && fetchWarehouseArticles(selectedWarehouse, articlesCurrentPage + 1, true)}
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

            {/* Barra azioni massive */}
            {selectedArticles.length > 0 && (
              <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedArticles.length} articol{selectedArticles.length === 1 ? 'o selezionato' : 'i selezionati'}
                    </span>
                    <button
                      onClick={clearArticleSelection}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Deseleziona tutto
                    </button>
                  </div>
                  <button
                    onClick={handleOpenSendDialog}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
                  >
                    <ArrowRight size={16} />
                    Invia articoli
                  </button>
                </div>
              </div>
            )}
            
            {articlesError && (
              <div className="p-4 bg-red-50 border-b border-red-200">
                <p className="text-red-600 text-sm">{articlesError}</p>
                <button
                  onClick={() => selectedWarehouse && fetchWarehouseArticles(selectedWarehouse, 1, false)}
                  className="mt-2 text-red-600 hover:text-red-700 underline text-sm"
                >
                  Riprova
                </button>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={warehouseArticles.length > 0 && selectedArticles.length === warehouseArticles.length}
                        onChange={(e) => handleSelectAllArticles(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
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
                      Data aggiornamento
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {articlesLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center">
                        <Loader2 className="w-6 h-6 text-teal-600 animate-spin mx-auto mb-2" />
                        <p className="text-gray-500">Caricamento articoli...</p>
                      </td>
                    </tr>
                  ) : warehouseArticles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        Nessun articolo trovato in questo magazzino
                      </td>
                    </tr>
                  ) : (
                    warehouseArticles.map((article) => (
                      <tr 
                        key={article.id} 
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap w-12">
                          <input
                            type="checkbox"
                            checked={selectedArticles.includes(article.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectArticle(article.id, e.target.checked);
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                          onClick={() => handleArticleClick(article.id)}
                          title="Clicca per visualizzare i dettagli dell'articolo"
                        >
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
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          hasDateValue(article.updated_at) ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {formatArticleDate(article.updated_at)}
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
            {articlesCurrentPage < articlesTotalPages && warehouseArticles.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
                <button
                  onClick={() => selectedWarehouse && fetchWarehouseArticles(selectedWarehouse, articlesCurrentPage + 1, true)}
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
        </div>
      )}



      {/* Dialog Inserimento Articoli */}
      {showInsertDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-[60vw] h-[95vh] overflow-hidden flex flex-col">
            {/* Header with integrated tabs */}
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Plus className="text-blue-600" size={24} />
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Inserisci Articoli
                      </h2>
                      <p className="text-sm text-gray-600">
                        Magazzino: {filteredWarehouses.find(w => w.id === selectedWarehouse)?.description || warehouses.find(w => w.id === selectedWarehouse)?.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Tab Navigation inline */}
                  <div className="flex space-x-1 bg-white rounded-lg p-1 border border-blue-200">
                    <button
                      onClick={() => setInsertActiveTab('external')}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        insertActiveTab === 'external'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Dall&apos;esterno
                    </button>
                    <button
                      onClick={() => setInsertActiveTab('transfer')}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        insertActiveTab === 'transfer'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Da altro magazzino
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleCloseInsertDialog}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {insertActiveTab === 'external' ? (
                /* Tab Inserisci dall'esterno */
                <div className="max-w-2xl mx-auto">
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Codice */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Codice Articolo *
                        </label>
                        <input
                          type="text"
                          value={newArticleForm.code}
                          onChange={(e) => setNewArticleForm(prev => ({ ...prev, code: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                          placeholder="Es. ART001"
                          required
                        />
                      </div>

                      {/* Quantità */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantità *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={newArticleForm.quantity}
                          onChange={(e) => setNewArticleForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                          required
                        />
                      </div>
                    </div>

                    {/* Descrizione */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descrizione *
                      </label>
                      <input
                        type="text"
                        value={newArticleForm.description}
                        onChange={(e) => setNewArticleForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                        placeholder="Descrizione dell'articolo"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Famiglia */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Famiglia
                        </label>
                        <input
                          type="text"
                          value={newArticleForm.family}
                          onChange={(e) => setNewArticleForm(prev => ({ ...prev, family: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                          placeholder="Famiglia prodotto"
                        />
                      </div>

                      {/* Marchio */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Marchio
                        </label>
                        <input
                          type="text"
                          value={newArticleForm.brand}
                          onChange={(e) => setNewArticleForm(prev => ({ ...prev, brand: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                          placeholder="Marchio prodotto"
                        />
                      </div>
                    </div>

                    {/* Serial */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Numero Seriale
                      </label>
                      <input
                        type="text"
                        value={newArticleForm.serial}
                        onChange={(e) => setNewArticleForm(prev => ({ ...prev, serial: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                        placeholder="Numero seriale (opzionale)"
                      />
                    </div>
                  </form>
                </div>
              ) : (
                /* Tab Ricevi da altro magazzino */
                <div>
                  {/* Selezione magazzino sorgente */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Magazzino Sorgente *
                    </label>
                    <select
                      value={transferSourceWarehouse}
                      onChange={(e) => handleTransferSourceWarehouseChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-700"
                    >
                      <option value="">Seleziona magazzino...</option>
                      {warehouses
                        .filter(warehouse => warehouse.id !== selectedWarehouse)
                        .map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.description}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Articoli del magazzino sorgente */}
                  {transferSourceWarehouse && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Lista articoli disponibili */}
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-4">
                          Articoli Disponibili ({transferSourceArticles.length})
                        </h4>
                        <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                          {transferArticlesLoading ? (
                            <div className="p-4 text-center">
                              <Loader2 className="w-6 h-6 text-green-600 animate-spin mx-auto mb-2" />
                              <p className="text-gray-500 text-sm">Caricamento articoli...</p>
                            </div>
                          ) : transferSourceArticles.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              Nessun articolo disponibile in questo magazzino
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-200">
                              {transferSourceArticles.map((article) => (
                                <div key={article.id} className="p-3 hover:bg-gray-100 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {article.id}
                                      </p>
                                      <p className="text-xs text-gray-600 truncate">
                                        {article.short_description}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Stock: {article.quantity_stock}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => addTransferArticle(article)}
                                      className="ml-2 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                                    >
                                      <Plus size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Lista articoli selezionati */}
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-4">
                          Articoli Selezionati ({transferArticles.length})
                        </h4>
                        <div className="bg-blue-50 rounded-lg border border-blue-200 max-h-96 overflow-y-auto">
                          {transferArticles.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              Nessun articolo selezionato
                            </div>
                          ) : (
                            <div className="divide-y divide-blue-200">
                              {transferArticles.map((item) => (
                                <div key={item.articleId} className="p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {item.articleCode}
                                      </p>
                                      <p className="text-xs text-gray-600 truncate">
                                        {item.articleDescription}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => removeTransferArticle(item.articleId)}
                                      className="text-red-600 hover:text-red-800 p-1"
                                      title="Rimuovi"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600">Qtà:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      max={item.availableQuantity}
                                      value={item.transferQuantity}
                                      onChange={(e) => updateTransferQuantity(item.articleId, parseInt(e.target.value) || 1)}
                                      className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                                    />
                                    <span className="text-xs text-gray-500">
                                      / {item.availableQuantity}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleCloseInsertDialog}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={insertActiveTab === 'external' ? handleSubmitExternalInsert : handleSubmitTransfer}
                  disabled={
                    insertLoading || 
                    (insertActiveTab === 'external' && (!newArticleForm.code.trim() || !newArticleForm.description.trim())) ||
                    (insertActiveTab === 'transfer' && (!transferSourceWarehouse || transferArticles.length === 0))
                  }
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
                >
                  {insertLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Elaborazione...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      {insertActiveTab === 'external' ? 'Inserisci Articolo' : 'Trasferisci Articoli'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Invio Articoli */}
      {showSendDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-[60vw] h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-red-50 border-b border-red-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ArrowRight className="text-red-600" size={24} />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Invia Articoli
                    </h2>
                    <p className="text-sm text-gray-600">
                      Da: {filteredWarehouses.find(w => w.id === selectedWarehouse)?.description || warehouses.find(w => w.id === selectedWarehouse)?.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseSendDialog}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Selezione magazzino destinazione */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Magazzino di Destinazione *
                  </label>
                  <select
                    value={sendTargetWarehouse}
                    onChange={(e) => setSendTargetWarehouse(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700"
                  >
                    <option value="">Seleziona magazzino di destinazione...</option>
                    {warehouses
                      .filter(warehouse => warehouse.id !== selectedWarehouse)
                      .map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.description}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Riepilogo articoli selezionati */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">
                    Articoli Selezionati ({selectedArticles.length})
                  </h3>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                    <div className="divide-y divide-gray-200">
                      {selectedArticles.map((articleId) => {
                        const article = warehouseArticles.find(a => a.id === articleId);
                        if (!article) return null;
                        
                        return (
                          <div key={articleId} className="p-4 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                  <Package className="text-gray-400 flex-shrink-0" size={16} />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {article.id}
                                    </p>
                                    <p className="text-xs text-gray-600 truncate">
                                      {article.short_description}
                                    </p>
                                    <div className="flex items-center gap-4 mt-1">
                                      {article.family_label && (
                                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                          {article.family_label}
                                        </span>
                                      )}
                                      {article.brand_label && (
                                        <span className="text-xs text-gray-500">
                                          {article.brand_label}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {article.quantity_stock !== null ? (
                                  <span className={`text-sm font-medium px-2 py-1 rounded ${
                                    article.quantity_stock === 0 
                                      ? 'bg-red-100 text-red-700' 
                                      : article.quantity_stock < 10 
                                        ? 'bg-orange-100 text-orange-700' 
                                        : 'bg-green-100 text-green-700'
                                  }`}>
                                    Stock: {article.quantity_stock}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400 px-2 py-1">N/A</span>
                                )}
                                <button
                                  onClick={() => handleSelectArticle(articleId, false)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title="Rimuovi dalla selezione"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Informazioni aggiuntive */}
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800 mb-1">
                        Informazioni sull&apos;invio
                      </h4>
                      <ul className="text-xs text-yellow-700 space-y-1">
                        <li>• Gli articoli verranno trasferiti dal magazzino sorgente a quello di destinazione</li>
                        <li>• Lo stock verrà aggiornato automaticamente in entrambi i magazzini</li>
                        <li>• L&apos;operazione sarà registrata nel sistema per la tracciabilità</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleCloseSendDialog}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirmSendArticles}
                  disabled={sendLoading || !sendTargetWarehouse || selectedArticles.length === 0}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
                >
                  {sendLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Invio in corso...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Conferma Invio ({selectedArticles.length} articoli)
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
