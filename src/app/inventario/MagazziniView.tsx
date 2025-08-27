'use client';

import React, { useState, useEffect } from 'react';
import { Package, Search} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ArticleListItem, ArticlesApiResponse, PlaceType, ArticlePlace } from '../../types/article';
import CaricaArticoliDialog from '../../components/CaricaArticoliDialog';
import DettaglioMagazzino from '../../components/DettaglioMagazzino';
import NotificationDialog from '../../components/NotificationDialog';
import InviaArticoliDialog from '../../components/InviaArticoliDialog';

interface Warehouse {
  id: string;
  description: string;
  article_count: number;
  total_stock_quantity: number;
  total_reserved_quantity: number;
  total_ordered_quantity: number;
  total_all_quantities: number;
}





interface TransferArticleItem {
  articleId: string;
  articleCode: string;
  articleDescription: string;
  availableQuantity: number;
  transferQuantity: number;
  sourceWarehouseId?: string;
  sourceWarehouseDescription?: string;
}

interface SendArticleItem {
  articleId: string;
  articleCode: string;
  articleDescription: string;
  availableQuantity: number;
  sendQuantity: number;
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
  
  
  
  // Stati per il dialog carico articoli
  const [showInsertDialog, setShowInsertDialog] = useState(false);
  const [insertLoading, setInsertLoading] = useState(false);
  
  // Stati per il dialog invio articoli
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  
  
  // Stati per trasferimento da altro magazzino
  const [selectedSourceWarehouses, setSelectedSourceWarehouses] = useState<string[]>([]);
  const [transferSourceArticles, setTransferSourceArticles] = useState<ArticleListItem[]>([]);
  const [transferArticles, setTransferArticles] = useState<TransferArticleItem[]>([]);
  const [transferArticlesLoading, setTransferArticlesLoading] = useState(false);
  const [transferNotes, setTransferNotes] = useState<string>('');
  
  // Stati per paginazione e ricerca articoli
  const [transferArticlesCurrentPage, setTransferArticlesCurrentPage] = useState(1);
  const [transferArticlesTotalPages, setTransferArticlesTotalPages] = useState(1);
  const [transferArticlesPerPage] = useState(50);
  const [transferSearchTerm, setTransferSearchTerm] = useState('');
  const [transferHasMore, setTransferHasMore] = useState(false);
  
  // Stati per paginazione per magazzino
  
  // Stati per la selezione multipla e invio articoli
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  
  // Stati per il dialog di notifica
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    details?: string[];
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    details: []
  });
  
  // Stati per il dialog inventario
  
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

  // Fetch articoli transfer quando cambia la ricerca - con debounce intelligente
  useEffect(() => {
    if (selectedSourceWarehouses.length > 0) {
      const timeoutId = setTimeout(() => {
        fetchTransferSourceArticles(selectedSourceWarehouses, true, 1);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [transferSearchTerm, selectedSourceWarehouses]);

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

  const hasDateValue = (dateString: string | null): boolean => {
    return Boolean(dateString && dateString.trim() !== '');
  };

  // Formatta la data corrente in formato leggibile per le note
  const formatCurrentDateForNotes = (): string => {
    try {
      return new Date().toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return new Date().toISOString();
    }
  };



  // Funzione per ottenere lo stock del magazzino specifico di provenienza
  const getWarehouseSpecificStock = (article: ArticleListItem): number => {
    if (!article.inventory || !Array.isArray(article.inventory)) return 0;
    
    // Usa il sourceWarehouseId per trovare lo stock specifico
    const sourceWarehouseId = (article as unknown as { sourceWarehouseId: string }).sourceWarehouseId;
    if (!sourceWarehouseId) return 0;
    
    const warehouseInventory = article.inventory.find(inv => 
      inv.warehouse_id.toString() === sourceWarehouseId.toString()
    );
    
    return warehouseInventory?.quantity_stock || 0;
  };

  // Funzione per ottenere lo stock del magazzino sorgente corrente (per invio)
  const getSourceWarehouseStock = (article: ArticleListItem): number => {
    if (!article.inventory || !Array.isArray(article.inventory) || !selectedWarehouse) return 0;
    
    const warehouseInventory = article.inventory.find(inv => 
      inv.warehouse_id.toString() === selectedWarehouse.toString()
    );
    
    return warehouseInventory?.quantity_stock || 0;
  };

  // Funzione per ottenere i riservati del magazzino sorgente corrente
  const getSourceWarehouseReserved = (article: ArticleListItem): number => {
    if (!article.inventory || !Array.isArray(article.inventory) || !selectedWarehouse) return 0;
    
    const warehouseInventory = article.inventory.find(inv => 
      inv.warehouse_id.toString() === selectedWarehouse.toString()
    );
    
    return warehouseInventory?.quantity_reserved_client || 0;
  };



  // Funzioni per gestire le notifiche
  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, details?: string[]) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message,
      details: details || []
    });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  // Funzioni per gestire il dialog inventario
  const handleOpenInventoryDialog = () => {

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



  // Funzioni per il dialog carico articoli
  const handleOpenInsertDialog = () => {
    setShowInsertDialog(true);
    // Reset del form
    setSelectedSourceWarehouses([]);
    setTransferSourceArticles([]);
    setTransferArticles([]);
    setTransferNotes('');
    setTransferSearchTerm('');

  };

  const handleCloseInsertDialog = () => {
    setShowInsertDialog(false);
    setSelectedSourceWarehouses([]);
    setTransferSourceArticles([]);
    setTransferArticles([]);
  };

  // Funzioni per il dialog invio articoli
  const handleOpenSendDialog = () => {
    if (selectedArticles.length === 0) {
      showNotification('warning', 'Nessun articolo selezionato', 'Seleziona almeno un articolo per procedere con l\'invio.');
      return;
    }
    setShowSendDialog(true);
  };

  const handleCloseSendDialog = () => {
    setShowSendDialog(false);
  };

  const handleSubmitSend = async (targetWarehouseId: string, sendArticles: SendArticleItem[], sendNotes: string) => {
    if (!selectedWarehouse || !targetWarehouseId || sendArticles.length === 0) {
      showNotification('warning', 'Dati incompleti', 'Verifica che tutti i campi siano compilati correttamente.');
      return;
    }

    // Verifica che tutte le quantità siano valide
    const invalidItems = sendArticles.filter(item => 
      item.sendQuantity <= 0 || item.sendQuantity > item.availableQuantity
    );
    if (invalidItems.length > 0) {
      const invalidDetails = invalidItems.map(item => 
        `${item.articleDescription}: quantità ${item.sendQuantity} non valida (max ${item.availableQuantity})`
      );
      showNotification('error', 'Quantità non valide', 'Verifica le quantità degli articoli selezionati:', invalidDetails);
      return;
    }

    setSendLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      // Ottieni le informazioni dell'utente per il tracking (preferisci API /auth/me)
      let userInfo = '';
      let userId = 'unknown';

      try {
        const meResponse = await fetch('/api/auth/me', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        if (meResponse.ok) {
          const userData = await meResponse.json();
          const fullName = `${userData.name || ''} ${userData.surname || ''}`.trim();
          userInfo = `user_name: ${fullName || 'Unknown'}`;
          userId = userData.id || 'unknown';
        } else if (auth.user) {
          userInfo = `user_name: ${auth.user.name || 'Unknown'}`;
          userId = auth.user.id || 'unknown';
        } else {
          userInfo = 'user_name: Unknown';
          userId = 'unknown';
        }
      } catch (err) {
        console.warn('Could not fetch user info:', err);
        if (auth.user) {
          userInfo = `user_name: ${auth.user.name || 'Unknown'}`;
          userId = auth.user.id || 'unknown';
        } else {
          userInfo = 'user_name: Unknown';
          userId = 'unknown';
        }
      }

      // Prepara i dati per la chiamata bulk-transfer (stesso endpoint ma direzione opposta)
      const transferData = {
        transfers: sendArticles.map(item => {
          return {
            article_id: item.articleId,
            from_warehouse_id: selectedWarehouse,
            to_warehouse_id: targetWarehouseId,
            quantity: item.sendQuantity,
            notes: sendNotes ? `Invio: ${sendNotes}` : '',
          };
        }),
        global_notes: `{date: ${formatCurrentDateForNotes()}; id_user: ${userId}; ${userInfo}}`
      };

      // Debug logging
      console.log('🚀 Sending bulk send request:');
      console.log('📤 Send data:', JSON.stringify(transferData, null, 2));
      console.log('🔐 Headers:', headers);

      const response = await fetch('/api/inventory/bulk-transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify(transferData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'invio');
      }

      const result = await response.json();
      
      // Mostra risultati
      if (result.data.failed_transfers > 0) {
        const details = [
          `Invii riusciti: ${result.data.successful_transfers}`,
          `Invii falliti: ${result.data.failed_transfers}`
        ];
        showNotification('warning', 'Invio completato con errori', 'L\'invio è stato completato ma alcuni articoli non sono stati trasferiti.', details);
      } else {
        const targetWarehouse = warehouses.find(w => w.id === targetWarehouseId);
        showNotification('success', 'Invio completato', `Tutti i ${result.data.successful_transfers} articoli sono stati inviati con successo a ${targetWarehouse?.description || 'il magazzino selezionato'}.`);
      }
      
      // Ricarica gli articoli del magazzino sorgente
      if (selectedWarehouse) {
        fetchWarehouseArticles(selectedWarehouse, 1, false);
      }
      
      // Pulisci la selezione
      clearArticleSelection();
      
      handleCloseSendDialog();

    } catch (error) {
      console.error('Errore nell\'invio:', error);
      showNotification('error', 'Errore durante l\'invio', `Si è verificato un errore durante l'invio degli articoli: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setSendLoading(false);
    }
  };

  const fetchTransferSourceArticles = async (sourceWarehouseIds: string[], resetData = true, page = 1) => {
    if (!auth.token) {
      setTransferSourceArticles([]);
      setTransferHasMore(false);
      return;
    }

    try {
      setTransferArticlesLoading(true);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      };

      // Usa una singola chiamata API con paginazione globale
      const searchParams = new URLSearchParams({
        page: page.toString(),
        skip: transferArticlesPerPage.toString(),
      });

      // Se abbiamo magazzini specifici, aggiungili come filtro
      // Se sourceWarehouseIds è vuoto o contiene tutti i magazzini disponibili, non filtrare
      const availableWarehouses = warehouses.filter(w => w.id !== selectedWarehouse);
      const isSelectingAll = sourceWarehouseIds.length === availableWarehouses.length;
      
      if (sourceWarehouseIds.length > 0 && !isSelectingAll) {
        // Filtro per magazzini specifici
        sourceWarehouseIds.forEach(warehouseId => {
          searchParams.append('warehouse_id', warehouseId);
        });
      }
      // Se isSelectingAll === true, non aggiungiamo warehouse_id = nessun filtro = tutti gli articoli

      // Aggiungi ricerca se presente
      if (transferSearchTerm.trim()) {
        searchParams.append('query', transferSearchTerm.trim());
      }

      const response = await fetch(`/api/articles?${searchParams.toString()}`, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch articles from warehouses');
      }

      const data: ArticlesApiResponse = await response.json();
      
      // Espandi ogni articolo per ogni magazzino nell'inventory
      const articlesWithWarehouse: ArticleListItem[] = [];
      
      (data.data || []).forEach(article => {
        if (!article.inventory || !Array.isArray(article.inventory)) return;
        
        // Per ogni magazzino nell'inventory, crea una copia dell'articolo
        article.inventory.forEach(inv => {
          if (isSelectingAll) {
            // Se selezioniamo tutti, includi tutti i magazzini (escluso quello di destinazione)
            if (inv.warehouse_id.toString() !== selectedWarehouse) {
              articlesWithWarehouse.push({
                ...article,
                sourceWarehouseId: inv.warehouse_id?.toString(),
                sourceWarehouseDescription: inv.warehouse_description || 
                  warehouses.find(w => w.id === inv.warehouse_id?.toString())?.description || `Magazzino ${inv.warehouse_id}`
              } as unknown as ArticleListItem);
            }
          } else {
            // Se filtriamo per magazzini specifici, includi solo quelli selezionati
            if (sourceWarehouseIds.includes(inv.warehouse_id.toString())) {
              articlesWithWarehouse.push({
                ...article,
                sourceWarehouseId: inv.warehouse_id?.toString(),
                sourceWarehouseDescription: inv.warehouse_description || 
                  warehouses.find(w => w.id === inv.warehouse_id?.toString())?.description || `Magazzino ${inv.warehouse_id}`
              } as unknown as ArticleListItem);
            }
          }
        });
      });
      
      // Aggiorna gli stati con paginazione globale
      if (resetData) {
        setTransferSourceArticles(articlesWithWarehouse);
      } else {
        // Append per paginazione successiva
        setTransferSourceArticles(prev => [...prev, ...articlesWithWarehouse]);
      }
      
      // Aggiorna paginazione globale
      setTransferArticlesCurrentPage(page);
      setTransferArticlesTotalPages(data.meta?.totalPages || 1);
      setTransferHasMore(page < (data.meta?.totalPages || 1));

    } catch (err) {
      console.error('Error fetching source warehouse articles:', err);
      showNotification('error', 'Errore caricamento articoli', 'Si è verificato un errore durante il caricamento degli articoli dei magazzini sorgente. Riprova più tardi.');
    } finally {
      setTransferArticlesLoading(false);
    }
  };

  const handleSourceWarehouseToggle = (warehouseId: string) => {
    setSelectedSourceWarehouses(prev => {
      const newSelection = prev.includes(warehouseId)
        ? prev.filter(id => id !== warehouseId)
        : [...prev, warehouseId];
      
      // Reset e fetch articoli quando cambia la selezione
      setTransferSearchTerm('');
      setTimeout(() => fetchTransferSourceArticles(newSelection, true, 1), 0);
      
      return newSelection;
    });
  };

  const handleSelectAllWarehouses = () => {
    const availableWarehouses = warehouses
      .filter(warehouse => warehouse.id !== selectedWarehouse)
      .map(warehouse => warehouse.id);
    
    setSelectedSourceWarehouses(availableWarehouses);
    setTransferSearchTerm('');
    setTimeout(() => fetchTransferSourceArticles(availableWarehouses, true, 1), 0);
  };

  const handleDeselectAllWarehouses = () => {
    setSelectedSourceWarehouses([]);
    setTransferSourceArticles([]);
  };

  // Funzione per gestire il caricamento di più articoli - paginazione globale
  const handleLoadMoreArticles = async () => {
    if (!transferHasMore || transferArticlesLoading) return;
    
    const nextPage = transferArticlesCurrentPage + 1;
    await fetchTransferSourceArticles(selectedSourceWarehouses, false, nextPage);
  };

  // Funzione per gestire la ricerca articoli - usa useEffect come nella pagina principale
  const handleTransferSearchChange = (searchTerm: string) => {
    setTransferSearchTerm(searchTerm);
    // Il fetch viene gestito dall'useEffect quando cambia transferSearchTerm
  };

  // Funzione per raggruppare articoli per magazzino
  const getArticlesByWarehouse = () => {
    const groupedArticles: { [warehouseId: string]: { warehouse: Warehouse, articles: ArticleListItem[] } } = {};
    
    transferSourceArticles.forEach(article => {
      const warehouseId = (article as unknown as { sourceWarehouseId: string }).sourceWarehouseId;
      if (!groupedArticles[warehouseId]) {
        const warehouse = warehouses.find(w => w.id === warehouseId);
        groupedArticles[warehouseId] = {
          warehouse: warehouse || { id: warehouseId, description: warehouseId, article_count: 0, total_stock_quantity: 0, total_reserved_quantity: 0, total_ordered_quantity: 0, total_all_quantities: 0 },
          articles: []
        };
      }
      groupedArticles[warehouseId].articles.push(article);
    });

    return groupedArticles;
  };

  const addTransferArticle = (article: ArticleListItem) => {
    const existingIndex = transferArticles.findIndex(item => item.articleId === article.id);
    if (existingIndex >= 0) {
      showNotification('warning', 'Articolo già presente', 'Questo articolo è già stato aggiunto alla lista di trasferimento.');
      return;
    }

    // Usa le informazioni del magazzino già presenti nell'articolo (aggiunte durante il fetch)
        const sourceWarehouseId = (article as unknown as { sourceWarehouseId: string }).sourceWarehouseId;
    const sourceWarehouseDescription = (article as unknown as { sourceWarehouseDescription: string }).sourceWarehouseDescription;

    const newTransferItem: TransferArticleItem = {
      articleId: article.id,
      articleCode: article.id,
      articleDescription: article.short_description,
      availableQuantity: getWarehouseSpecificStock(article),
      transferQuantity: 1,
      sourceWarehouseId: sourceWarehouseId,
      sourceWarehouseDescription: sourceWarehouseDescription
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



  const handleSubmitTransfer = async (transferArticlesParam: TransferArticleItem[], transferNotesParam: string) => {
    if (!selectedWarehouse || selectedSourceWarehouses.length === 0 || transferArticlesParam.length === 0) {
      showNotification('warning', 'Selezione incompleta', 'Seleziona almeno un magazzino sorgente e almeno un articolo per procedere con il caricamento.');
      return;
    }

    // Verifica che tutte le quantità siano valide
    const invalidItems = transferArticlesParam.filter(item => 
      item.transferQuantity <= 0 || item.transferQuantity > item.availableQuantity
    );
    if (invalidItems.length > 0) {
      const invalidDetails = invalidItems.map(item => 
        `${item.articleDescription}: quantità ${item.transferQuantity} non valida (max ${item.availableQuantity})`
      );
      showNotification('error', 'Quantità non valide', 'Verifica le quantità degli articoli selezionati:', invalidDetails);
      return;
    }

    setInsertLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      // Ottieni le informazioni dell'utente per il tracking (preferisci API /auth/me)
      let userInfo = '';
      let userId = 'unknown';

      try {
        const meResponse = await fetch('/api/auth/me', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        if (meResponse.ok) {
          const userData = await meResponse.json();
          const fullName = `${userData.name || ''} ${userData.surname || ''}`.trim();
          userInfo = `user_name: ${fullName || 'Unknown'}`;
          userId = userData.id || 'unknown';
        } else if (auth.user) {
          userInfo = `user_name: ${auth.user.name || 'Unknown'}`;
          userId = auth.user.id || 'unknown';
        } else {
          userInfo = 'user_name: Unknown';
          userId = 'unknown';
        }
      } catch (err) {
        console.warn('Could not fetch user info:', err);
        if (auth.user) {
          userInfo = `user_name: ${auth.user.name || 'Unknown'}`;
          userId = auth.user.id || 'unknown';
        } else {
          userInfo = 'user_name: Unknown';
          userId = 'unknown';
        }
      }

      // Prepara i dati per la chiamata bulk-transfer
      const transferData = {
        transfers: transferArticlesParam.map(item => {
          return {
            article_id: item.articleId,
            from_warehouse_id: item.sourceWarehouseId || selectedSourceWarehouses[0],
            to_warehouse_id: selectedWarehouse,
            quantity: item.transferQuantity,
            notes: transferNotesParam ? `Carico: ${transferNotesParam}` : '',
          };
        }),
        global_notes: `{date: ${formatCurrentDateForNotes()}; id_user: ${userId}; ${userInfo}}`
      };

      // Debug logging
      console.log('🚀 Sending bulk transfer request:');
      console.log('📤 Transfer data:', JSON.stringify(transferData, null, 2));
      console.log('🔐 Headers:', headers);

      const response = await fetch('/api/inventory/bulk-transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify(transferData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante il trasferimento');
      }

      const result = await response.json();
      
      // Mostra risultati
      if (result.data.failed_transfers > 0) {
        const details = [
          `Trasferimenti riusciti: ${result.data.successful_transfers}`,
          `Trasferimenti falliti: ${result.data.failed_transfers}`
        ];
        showNotification('warning', 'Trasferimento completato con errori', 'Il caricamento è stato completato ma alcuni articoli non sono stati trasferiti.', details);
      } else {
        showNotification('success', 'Caricamento completato', `Tutti i ${result.data.successful_transfers} articoli sono stati trasferiti con successo nel magazzino selezionato.`);
      }
      
      // Ricarica gli articoli del magazzino
      if (selectedWarehouse) {
        fetchWarehouseArticles(selectedWarehouse, 1, false);
      }
      
      handleCloseInsertDialog();

    } catch (error) {
      console.error('Errore nel trasferimento:', error);
      showNotification('error', 'Errore durante il caricamento', `Si è verificato un errore durante il trasferimento degli articoli: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
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
              {/* Numero tipologie articoli */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Tipologie</span>
                <span className="text-xs font-semibold text-gray-900">
                  {warehouse.article_count.toLocaleString('it-IT')}
                </span>
              </div>

              {/* Griglia quantità in 2 colonne */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
                {/* Stock */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Stock</span>
                  <span className="text-xs font-medium text-green-600">
                    {warehouse.total_stock_quantity.toLocaleString('it-IT')}
                  </span>
                </div>
                
                {/* Riservati */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Riservati</span>
                  <span className="text-xs font-medium text-orange-600">
                    {warehouse.total_reserved_quantity.toLocaleString('it-IT')}
                  </span>
                </div>
                
                {/* In arrivo */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">In arrivo</span>
                  <span className="text-xs font-medium text-blue-600">
                    {warehouse.total_ordered_quantity.toLocaleString('it-IT')}
                  </span>
                </div>
                
                {/* Totale */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Totale</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {warehouse.total_all_quantities.toLocaleString('it-IT')}
                  </span>
                </div>
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
      <DettaglioMagazzino
        selectedWarehouse={selectedWarehouse || ''}
        warehouses={warehouses}
        filteredWarehouses={filteredWarehouses}
        
        warehouseArticles={warehouseArticles}
        articlesLoading={articlesLoading}
        loadingMoreArticles={loadingMoreArticles}
        articlesError={articlesError}
        articlesCurrentPage={articlesCurrentPage}
        articlesTotalPages={articlesTotalPages}
        onFetchWarehouseArticles={fetchWarehouseArticles}
        
        articleFilters={articleFilters}
        onArticleFilterChange={handleArticleFilterChange}
        onResetArticleFilters={resetArticleFilters}
        placeTypes={placeTypes}
        articlePlaces={articlePlaces}
        
        selectedArticles={selectedArticles}
        onSelectArticle={handleSelectArticle}
        onSelectAllArticles={handleSelectAllArticles}
        onClearArticleSelection={clearArticleSelection}
        
        onOpenInsertDialog={handleOpenInsertDialog}
        onOpenSendDialog={handleOpenSendDialog}
        onArticleClick={handleArticleClick}
        onOpenInventoryDialog={handleOpenInventoryDialog}
        
        getTotalStock={getSourceWarehouseStock}
        getTotalReserved={getSourceWarehouseReserved}
        formatArticleDate={formatArticleDate}
        hasDateValue={hasDateValue}
      />



      {/* Dialog Carico Articoli */}
      <CaricaArticoliDialog
        isOpen={showInsertDialog}
        onClose={handleCloseInsertDialog}
        selectedWarehouse={selectedWarehouse || ''}
        warehouses={warehouses}
        filteredWarehouses={filteredWarehouses}
        onSubmitTransfer={handleSubmitTransfer}
        insertLoading={insertLoading}
        
        selectedSourceWarehouses={selectedSourceWarehouses}
        onSourceWarehouseToggle={handleSourceWarehouseToggle}
        onSelectAllWarehouses={handleSelectAllWarehouses}
        onDeselectAllWarehouses={handleDeselectAllWarehouses}
        
        transferSourceArticles={transferSourceArticles}
        transferArticlesLoading={transferArticlesLoading}
        transferSearchTerm={transferSearchTerm}
        onTransferSearchChange={handleTransferSearchChange}
        transferArticlesCurrentPage={transferArticlesCurrentPage}
        transferArticlesTotalPages={transferArticlesTotalPages}
        transferArticlesPerPage={transferArticlesPerPage}
        transferHasMore={transferHasMore}
        onLoadMoreArticles={handleLoadMoreArticles}
        
        transferArticles={transferArticles}
        onAddTransferArticle={addTransferArticle}
        onUpdateTransferQuantity={updateTransferQuantity}
        onRemoveTransferArticle={removeTransferArticle}
        
        transferNotes={transferNotes}
        onTransferNotesChange={setTransferNotes}
        
        getWarehouseSpecificStock={getWarehouseSpecificStock}
        getArticlesByWarehouse={getArticlesByWarehouse}
      />

      {/* Dialog Invio Articoli */}
      <InviaArticoliDialog
        isOpen={showSendDialog}
        onClose={handleCloseSendDialog}
        sourceWarehouse={selectedWarehouse || ''}
        warehouses={warehouses}
        selectedArticles={selectedArticles}
        warehouseArticles={warehouseArticles}
        onSubmitSend={handleSubmitSend}
        sendLoading={sendLoading}
        getTotalStock={getSourceWarehouseStock}
      />

      {/* Notification Dialog */}
      <NotificationDialog
        isOpen={notification.isOpen}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        details={notification.details}
      />

    </div>
  );
}
