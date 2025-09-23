'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { Equipment } from '../../../../types/equipment';
import { ArticleListItem, ArticleInventory } from '../../../../types/article';

interface InterventionDetailsSectionDetailProps {
  data: string;
  setData: (value: string) => void;
  orarioIntervento: string;
  setOrarioIntervento: (value: string) => void;
  oraInizio: string;
  setOraInizio: (value: string) => void;
  oraFine: string;
  setOraFine: (value: string) => void;
  servizioDomicilio: string;
  setServizioDomicilio: (value: string) => void;
  scontoServizioDomicilio: boolean;
  setScontoServizioDomicilio: (value: boolean) => void;
  preventivo: number;
  setPreventivo: (value: number) => void;
  selectedCustomerId: number | null;
  destinazione: string;
  selectedEquipments: Equipment[];
  setSelectedEquipments: (equipments: Equipment[]) => void;
  selectedArticles: SelectedArticle[];
  setSelectedArticles: (articles: SelectedArticle[]) => void;
  orarioApertura: string;
  setOrarioApertura: (value: string) => void;
  noteInterne: string;
  setNoteInterne: (value: string) => void;
  onCustomerLocationsLoaded?: (hasLocations: boolean) => void;
  statusId?: number;
  isCreating?: boolean;
  customerLocationsLoaded?: boolean;
  hasCustomerLocations?: boolean;
  disabled?: boolean;
}

interface SelectedArticle {
  article: ArticleListItem;
  quantity: number;
  allocations?: Array<{
    warehouse_id: string;
    warehouse_description: string;
    quantity: number;
  }>;
}

export default function InterventionDetailsSectionDetail({
  data,
  setData,
  orarioIntervento,
  setOrarioIntervento,
  oraInizio,
  setOraInizio,
  oraFine,
  setOraFine,
  servizioDomicilio,
  setServizioDomicilio,
  scontoServizioDomicilio,
  setScontoServizioDomicilio,
  preventivo,
  setPreventivo,
  selectedCustomerId,
  destinazione,
  selectedEquipments,
  setSelectedEquipments,
  selectedArticles,
  setSelectedArticles,
  orarioApertura,
  setOrarioApertura,
  noteInterne,
  setNoteInterne,
  statusId = 1,
  isCreating = false,
  hasCustomerLocations = false,
  // disabled = false
}: InterventionDetailsSectionDetailProps) {
  const auth = useAuth();

  const isFieldsDisabled = !isCreating && statusId > 4;

  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
  const [isSearchingEquipments, setIsSearchingEquipments] = useState(false);
  const [isEquipmentInputFocused, setIsEquipmentInputFocused] = useState(false);

  const [articleSearchQuery, setArticleSearchQuery] = useState('');
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [showArticleDropdown, setShowArticleDropdown] = useState(false);
  const [isSearchingArticles, setIsSearchingArticles] = useState(false);

  // Gamma sync lock: disable inputs from minute 1 to 14 of every hour
  const [isGammaSyncLock, setIsGammaSyncLock] = useState(false);

  // Allocation dialog state
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const [allocationArticle, setAllocationArticle] = useState<ArticleListItem | null>(null);
  type ArticleInventoryRow = {
    warehouse_id?: string | number | null;
    warehouse?: string | number | null;
    warehouse_description?: string | null;
    quantity_stock?: number | null;
    quantity_reserved_client?: number | null;
    quantity_ordered?: number | null;
    in_stock?: number | null;
  };
  type ExtendedInventory = ArticleInventory & { in_stock?: number | null };
  const getStockValue = (inv: ArticleInventory): number => {
    const extended = inv as ExtendedInventory;
    const stockVal = typeof extended.in_stock === 'number' && extended.in_stock != null
      ? extended.in_stock
      : (inv.quantity_stock || 0);
    return stockVal || 0;
  };
  const [allocationRows, setAllocationRows] = useState<Array<{
    warehouse_id: string;
    warehouse_description: string;
    max: number;
    value: number;
  }>>([]);
  const [allocationEditArticleId, setAllocationEditArticleId] = useState<string | null>(null);
  const [allocationAlert, setAllocationAlert] = useState<string | null>(null);

  const isEquipmentSearchEnabled = () => {
    if (isFieldsDisabled) return false;
    if (!selectedCustomerId) return false;
    // Ricerca abilitata anche senza destinazione: filtriamo solo per customer_id
    return true;
  };

  const searchEquipments = async (query: string = '') => {
    if (!selectedCustomerId || !isEquipmentSearchEnabled()) {
      setEquipments([]);
      setShowEquipmentDropdown(false);
      return;
    }

    try {
      setIsSearchingEquipments(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      
      let apiUrl = `/api/equipments?customer_id=${selectedCustomerId}`;
      if (destinazione) {
        apiUrl += `&customer_location_id=${encodeURIComponent(destinazione)}`;
      }
      if (query.trim()) {
         apiUrl += `&query=${encodeURIComponent(query)}`;
      }

      const response = await fetch(apiUrl, { headers });
      if (response.ok) {
        const data = await response.json();
        const filteredEquipments = (data.data || []).filter(
          (eq: Equipment) => !selectedEquipments.find(selected => selected.id === eq.id)
        );
        setEquipments(filteredEquipments);
        setShowEquipmentDropdown(true);
      } else {
        setEquipments([]);
        setShowEquipmentDropdown(false);
      }
    } catch {
      setEquipments([]);
      setShowEquipmentDropdown(false);
    } finally {
      setIsSearchingEquipments(false);
    }
  };

  const handleEquipmentSelect = (equipment: Equipment) => {
    if (!selectedEquipments.find(eq => eq.id === equipment.id)) {
      setSelectedEquipments([...selectedEquipments, equipment]);
    }
    setEquipmentSearchQuery('');
    setShowEquipmentDropdown(false);
  };

  const removeEquipment = (equipmentId: number) => {
    setSelectedEquipments(selectedEquipments.filter(eq => eq.id !== equipmentId));
  };

  const searchArticles = async (query: string = '') => {
    if (query.length < 2 && query.length > 0) {
        setShowArticleDropdown(false);
        return;
    }
    try {
      setIsSearchingArticles(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      const response = await fetch(`/api/articles?stock=1&query=${encodeURIComponent(query)}`, { headers });
      if (response.ok) {
        const data = await response.json();
        const filteredArticles = (data.data || []).filter(
          (art: ArticleListItem) => !selectedArticles.find(selected => selected.article.id === art.id)
        );
        setArticles(filteredArticles);
        setShowArticleDropdown(!!query.trim());
      } else {
        setArticles([]);
        setShowArticleDropdown(false);
      }
    } catch {
      setArticles([]);
      setShowArticleDropdown(false);
    } finally {
      setIsSearchingArticles(false);
    }
  };

  // Helper: build allocation rows using fresh inventory from /api/articles/{id}
  const buildAllocationRows = async (
    articleId: string,
    existingAllocations: Array<{ warehouse_id: string; warehouse_description: string; quantity: number }>
  ) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(articleId)}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch article detail');
      const data = await res.json();
      const inv: ArticleInventoryRow[] = Array.isArray(data.inventory) ? data.inventory : [];

      // Crea mappe per unione: inventory (escludendo CL) e allocations esistenti
      const invMap = new Map<string, { stock: number; description: string }>();
      for (const invRow of inv) {
        const warehouseId = String(invRow.warehouse_id ?? invRow.warehouse ?? '');
        if (warehouseId === 'CL') continue; // Escludi CL
        const stock = typeof invRow.quantity_stock === 'number'
          ? invRow.quantity_stock
          : (typeof (invRow ).in_stock === 'number' ? (invRow ).in_stock : 0);
        const description = String(invRow.warehouse_description ?? invRow.warehouse ?? '');
        invMap.set(warehouseId, { stock: Math.max(0, stock || 0), description });
      }

      const allocMap = new Map<string, { quantity: number; description: string }>();
      for (const a of existingAllocations) {
        allocMap.set(a.warehouse_id, { quantity: a.quantity || 0, description: a.warehouse_description });
      }

      const ids = new Set<string>([...invMap.keys(), ...allocMap.keys()]);
      const rows = Array.from(ids).map((wid) => {
        const invEntry = invMap.get(wid);
        const allocEntry = allocMap.get(wid);
        const stock = invEntry?.stock || 0;
        const allocated = allocEntry?.quantity || 0;
        return {
          warehouse_id: wid,
          warehouse_description: invEntry?.description || allocEntry?.description || wid,
          // MAX = disponibilità attuale + già allocato (così posso aumentare o restituire)
          max: stock + allocated,
          // VALUE = quanto è già allocato (parte da lì e può crescere o diminuire)
          value: allocated,
        };
      });

      return rows;
    } catch {
      // fallback: nessun aggiornamento, restituisci esistenti come righe editabili (solo riduzione)
      return existingAllocations.map(a => ({
        warehouse_id: a.warehouse_id,
        warehouse_description: a.warehouse_description,
        max: a.quantity,
        value: a.quantity,
      }));
    }
  };

  const handleArticleSelect = (article: ArticleListItem) => {
    if (isGammaSyncLock || isFieldsDisabled) return;
    // Open allocation dialog with fresh inventory from /api/articles/{id}
    (async () => {
      const rows = await buildAllocationRows(String(article.id), []);
      setAllocationArticle(article);
      setAllocationRows(rows);
      setAllocationEditArticleId(null);
      setShowAllocationDialog(true);
    })();
  };

  const removeArticle = (articleId: string) => {
    setSelectedArticles(selectedArticles.filter(art => art.article.id !== articleId));
  };

  const updateArticleQuantity = (articleId: string, quantity: number) => {
    if (quantity < 0) return;
    setSelectedArticles(selectedArticles.map(art => {
      if (art.article.id !== articleId) return art;
      // If allocations exist, block direct edits
      if (art.allocations && art.allocations.length > 0) return art;
      return { ...art, quantity };
    }));
  };

  useEffect(() => {
    if (!isEquipmentInputFocused) return;
    const delayDebounceFn = setTimeout(() => {
      searchEquipments(equipmentSearchQuery);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [equipmentSearchQuery, isEquipmentInputFocused]);

  useEffect(() => {
    if (isCreating) {
        setSelectedEquipments([]);
        setEquipmentSearchQuery('');
        setEquipments([]);
        setShowEquipmentDropdown(false);
    }
  }, [selectedCustomerId, destinazione, isCreating]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchArticles(articleSearchQuery);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [articleSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.equipment-search-container')) setShowEquipmentDropdown(false);
      if (!target.closest('.article-search-container')) setShowArticleDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Evaluate and refresh Gamma sync lock window periodically
  useEffect(() => {
    const updateLock = () => {
      const now = new Date();
      const minute = now.getMinutes();
      setIsGammaSyncLock(minute >= 1 && minute < 5);
    };
    updateLock();
    const id = setInterval(updateLock, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Dettagli Intervento</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Note interne</label>
        <textarea
          value={noteInterne}
          onChange={(e) => setNoteInterne(e.target.value)}
          rows={4}
          placeholder={isFieldsDisabled ? "Non modificabile" : "Inserisci note..."}
          disabled={isFieldsDisabled}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isFieldsDisabled ? 'bg-gray-50' : ''} text-gray-700`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Servizio domicilio</label>
          <div className="relative">
            <select 
              value={servizioDomicilio}
              onChange={(e) => setServizioDomicilio(e.target.value)}
              disabled={isFieldsDisabled}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none ${isFieldsDisabled ? 'bg-gray-50' : ''} text-gray-700`}
            >
              <option value="">Seleziona</option>
              <option value="Si">Si</option>
              <option value="No">No</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
          {servizioDomicilio === 'Si' && (
            <div className="mt-2">
              <label className="flex items-center">
                <input type="checkbox" checked={scontoServizioDomicilio} onChange={(e) => setScontoServizioDomicilio(e.target.checked)} disabled={isFieldsDisabled} className="mr-2"/>
                <span className={`text-sm ${isFieldsDisabled ? 'text-gray-400' : 'text-gray-600'}`}>Sconto</span>
              </label>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            disabled={isFieldsDisabled}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isFieldsDisabled ? 'bg-gray-50' : ''} text-gray-700`}
            placeholder="Seleziona una data"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Orario</label>
          <div className="relative">
            <select 
              value={orarioIntervento}
              onChange={(e) => setOrarioIntervento(e.target.value)}
              disabled={isFieldsDisabled || !data}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none ${isFieldsDisabled || !data ? 'bg-gray-50' : ''} text-gray-700`}
            >
              <option value="">Seleziona orario</option>
              <option value="mattina">Mattina (8-13)</option>
              <option value="pomeriggio">Pomeriggio (14-18)</option>
              <option value="tutto_il_giorno">Tutto il giorno</option>
              <option value="fascia_oraria">Fascia oraria</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
          {orarioIntervento === 'fascia_oraria' && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input type="time" value={oraInizio} onChange={(e) => setOraInizio(e.target.value)} disabled={isFieldsDisabled} className={`w-full px-3 py-2 border rounded-lg ${isFieldsDisabled ? 'bg-gray-50' : ''}`}/>
              <input type="time" value={oraFine} onChange={(e) => setOraFine(e.target.value)} disabled={isFieldsDisabled} className={`w-full px-3 py-2 border rounded-lg ${isFieldsDisabled ? 'bg-gray-50' : ''}`}/>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Preventivo</label>
          <div className="flex">
            <input type="number" step="0.01" min="0" value={preventivo} onChange={(e) => setPreventivo(Number(e.target.value))} disabled={isFieldsDisabled} className={`flex-1 px-3 py-2 border rounded-l-lg ${isFieldsDisabled ? 'bg-gray-50' : ''} text-gray-700`} placeholder="Inserisci importo"/>
            <span className="bg-gray-100 border-t border-b border-r px-3 py-2 rounded-r-lg text-gray-600">EUR</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Orario apertura</label>
          <input type="text" value={orarioApertura} onChange={(e) => setOrarioApertura(e.target.value)} placeholder={isFieldsDisabled ? "Non modificabile" : "Orario apertura"} disabled={isFieldsDisabled} className={`w-full px-3 py-2 border rounded-lg ${isFieldsDisabled ? 'bg-gray-50' : ''} text-gray-700`}/>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Apparecchiatura interessata</label>
          {selectedCustomerId && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${destinazione ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-800'}`}>
              {destinazione ? 'Da: Destinazione' : 'Da: Cliente'}
            </span>
          )}
        </div>
        <div className="relative equipment-search-container">
          <input
            type="text"
            value={equipmentSearchQuery}
            onChange={(e) => setEquipmentSearchQuery(e.target.value)}
            onFocus={() => {
              setIsEquipmentInputFocused(true);
              if (isEquipmentSearchEnabled()) {
                searchEquipments(equipmentSearchQuery);
              }
            }}
            onBlur={() => {
              // Manteniamo aperto il dropdown per permettere la selezione con onMouseDown
              setTimeout(() => {
                setIsEquipmentInputFocused(false);
                setShowEquipmentDropdown(false);
              }, 150);
            }}
            placeholder={!isEquipmentSearchEnabled() ? "Seleziona cliente/destinazione" : "Cerca apparecchiatura..."}
            disabled={!isEquipmentSearchEnabled()}
            className="w-full px-3 py-2 pr-10 border rounded-lg disabled:bg-gray-50 text-gray-700"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          {isSearchingEquipments && (
            <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {showEquipmentDropdown && equipments.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {equipments.map((eq) => (
                <div key={eq.id} onMouseDown={() => handleEquipmentSelect(eq)} className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-gray-700">
                  <div className="font-medium text-gray-700">{eq.description}</div>
                  <div className="text-sm text-gray-500">{eq.brand_name} {eq.model} (S/N: {eq.serial_number}) | ID: {eq.id}</div>
                  <div className="text-xs text-gray-500">
                    <span className="mr-2">{eq.subfamily_name}</span>
                    <span className="mr-2">• Cliente: {eq.customer_name}</span>
                    {eq.linked_serials && <span>• Linked: {eq.linked_serials}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {isCreating && !selectedCustomerId && <p className="mt-1 text-xs text-gray-500">Seleziona un cliente per cercare apparecchiature.</p>}
        {isCreating && selectedCustomerId && hasCustomerLocations && !destinazione && <p className="mt-1 text-xs text-gray-500">Seleziona una destinazione per affinare la ricerca.</p>}

        {selectedEquipments.length > 0 && (
          <div className="mt-3 space-y-2">
            {selectedEquipments.map((eq) => (
              <div key={eq.id} className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
                <div>
                  <div className="font-medium text-gray-700">{eq.description}</div>
                  <div className="text-sm text-gray-500">Modello: {eq.model} | S/N: {eq.serial_number} | ID: {eq.id}</div>
                </div>
                {!isFieldsDisabled && <button onClick={() => removeEquipment(eq.id)} className="text-red-500"><X size={16} /></button>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Merce preparata</label>
        <div className="relative article-search-container">
          <input
            type="text"
            value={articleSearchQuery}
            onChange={(e) => setArticleSearchQuery(e.target.value)}
            onFocus={() => !isFieldsDisabled && !isGammaSyncLock && searchArticles(articleSearchQuery)}
            placeholder={isFieldsDisabled ? "Non modificabile" : (isGammaSyncLock ? "Bloccato per sincronizzazione (-1 / +5 min di ogni ora)" : "Cerca ricambi...")}
            disabled={isFieldsDisabled || isGammaSyncLock}
            className="w-full px-3 py-2 pr-10 border rounded-lg disabled:bg-gray-50 text-gray-700"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          {isSearchingArticles && (
            <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {showArticleDropdown && articles.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {articles.map((art) => {
                // Calcola stock totale e numero magazzini (escludendo CL)
                const availableInventory = art.inventory?.filter(inv => {
                  const wid = String(inv.warehouse_id ?? '');
                  const stockVal = getStockValue(inv);
                  return wid !== 'CL' && stockVal > 0;
                }) || [];
                const totalStock = art.inventory?.filter(inv => String(inv.warehouse_id ?? '') !== 'CL')
                  .reduce((total, inv) => total + getStockValue(inv), 0) || 0;
                const warehouseCount = availableInventory.length;
                
                return (
                  <div key={art.id} onClick={() => handleArticleSelect(art)} className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-gray-700">
                    <div className="font-medium text-gray-700">{art.short_description}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
                      <span>PNC: {art.pnc_code || 'N/A'}</span>
                      <span>•</span>
                      <span className={`font-medium ${totalStock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        Stock: {totalStock}
                      </span>
                      {warehouseCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 font-medium">
                            {warehouseCount} magazzin{warehouseCount === 1 ? 'o' : 'i'}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-gray-600">ID: {art.id}</span>
                    </div>
                    {warehouseCount > 1 && (
                      <div className="text-xs text-gray-400 mt-1">
                        Disponibile in: {availableInventory.map(inv => inv.warehouse_description).join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedArticles.length > 0 && (
          <div className="mt-3 space-y-2">
            {selectedArticles.map((selArt) => {
              // Calcola stock totale e numero magazzini (escludendo CL)
              const availableInventory = selArt.article.inventory?.filter(inv => {
                const wid = String(inv.warehouse_id ?? '');
                const stockVal = getStockValue(inv);
                return wid !== 'CL' && stockVal > 0;
              }) || [];
              const totalStock = selArt.article.inventory?.filter(inv => String(inv.warehouse_id ?? '') !== 'CL')
                .reduce((total, inv) => total + getStockValue(inv), 0) || 0;
              const warehouseCount = availableInventory.length;
              
              return (
                <div key={selArt.article.id} className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-700">{selArt.article.short_description}</div>
                    <div className="text-sm text-gray-700 flex items-center gap-2 flex-wrap">
                      <span>PNC: {selArt.article.pnc_code || 'N/A'}</span>
                      <span>•</span>
                      <span className={`font-medium ${totalStock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        Stock: {totalStock}
                      </span>
                      {warehouseCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 font-medium">
                            {warehouseCount} magazzin{warehouseCount === 1 ? 'o' : 'i'}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-gray-600">ID: {selArt.article.id}</span>
                    </div>
                  {selArt.allocations && selArt.allocations.length > 0 && (
                    <div className="mt-1 text-xs text-gray-600">
                      <div className="font-medium">Prelievo:</div>
                      {selArt.allocations.map((a, idx) => (
                        <div key={`${selArt.article.id}-${a.warehouse_id}-${idx}`}>{a.warehouse_description}: {a.quantity}</div>
                      ))}
                    </div>
                  )}
                  </div>
                  <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Qtà:</label>
                  <input
                    type="number"
                    min="1"
                    value={selArt.quantity}
                    onChange={(e) => updateArticleQuantity(selArt.article.id, Number(e.target.value))}
                    disabled={isFieldsDisabled || isGammaSyncLock || (selArt.allocations && selArt.allocations.length > 0)}
                    className={`w-16 p-1 border rounded font-medium text-gray-700 ${(isFieldsDisabled || (selArt.allocations && selArt.allocations.length > 0)) ? 'bg-gray-200' : ''}`}
                  />
                  {!isFieldsDisabled && !isGammaSyncLock && selArt.allocations && selArt.allocations.length > 0 && (
                    <button
                      onClick={async () => {
                        const article = selArt.article;
                        const rows = await buildAllocationRows(String(article.id), selArt.allocations || []);
                        setAllocationArticle(article);
                        setAllocationRows(rows);
                        setAllocationEditArticleId(selArt.article.id);
                        setShowAllocationDialog(true);
                      }}
                      className="px-2 py-1 text-xs bg-white border rounded text-gray-700 hover:bg-gray-50"
                    >
                      Modifica prelievo
                    </button>
                  )}
                  {!isFieldsDisabled && <button onClick={() => removeArticle(selArt.article.id)} className="text-red-500"><X size={16} /></button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Allocation Dialog */}
      {showAllocationDialog && allocationArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl h-[95vh] mx-4 flex flex-col">
            <div className="mb-6">
              <div className="text-xl font-semibold text-gray-900">Seleziona prelievo magazzino</div>
              <div className="text-base text-gray-700 mt-2 font-medium">{allocationArticle.short_description}</div>
              <div className="text-sm text-gray-500 mt-1">Codice PNC: {allocationArticle.pnc_code} | ID: {allocationArticle.id}</div>
            </div>



            {allocationAlert && (
              <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-start justify-between">
                <div className="pr-3 text-sm font-medium">{allocationAlert}</div>
                <button onClick={() => setAllocationAlert(null)} className="text-red-700 hover:text-red-900">
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto border-2 border-gray-200 rounded-lg">
              <div className="divide-y divide-gray-200">
                {allocationRows.length === 0 && (
                  <div className="p-6 text-center text-gray-600">
                    <div className="text-lg font-medium">Nessun magazzino con disponibilità</div>
                    <div className="text-sm mt-1">Non ci sono magazzini con scorte disponibili per questo articolo.</div>
                  </div>
                )}
                {allocationRows.map((row, idx) => (
                  <div key={`${row.warehouse_id}-${idx}`} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-base font-semibold text-gray-900 mb-2">{row.warehouse_description}</div>
                        <div className="flex items-center gap-4">
                          <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            Disponibili: {row.max} pz
                          </div>
                          {row.value > 0 && (
                            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                              Selezionati: {row.value} pz
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700">Quantità da prelevare:</label>
                        <input
                          type="number"
                          min={0}
                          max={row.max}
                          value={row.value}
                          onChange={(e) => {
                            const raw = Number(e.target.value);
                            if (raw > row.max) {
                              setAllocationAlert(`Quantità richiesta superiore alla disponibilità per ${row.warehouse_description}. Massimo consentito: ${row.max}.`);
                            }
                            const next = Math.max(0, Math.min(row.max, raw));
                            setAllocationRows(prev => prev.map((r, i) => i === idx ? { ...r, value: next } : r));
                          }}
                          disabled={isGammaSyncLock}
                          className="w-20 p-3 border-2 border-gray-300 rounded-lg text-center text-lg font-bold text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 disabled:bg-gray-100"
                        />
                        <span className="text-sm text-gray-600">/ {row.max}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-6">
                <div className="text-sm text-gray-700">
                  Disponibile: 
                  <span className="ml-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold">
                    {allocationRows.reduce((s, r) => s + (r.max || 0), 0)} pz
                  </span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  Selezionato: 
                  <span className="ml-2 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-lg font-bold">
                    {allocationRows.reduce((s, r) => s + (r.value || 0), 0)} pz
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAllocationDialog(false);
                    setAllocationArticle(null);
                    setAllocationRows([]);
                    setAllocationEditArticleId(null);
                    setAllocationAlert(null);
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    if (isGammaSyncLock) return;
                    const total = allocationRows.reduce((s, r) => s + (r.value || 0), 0);
                    if (!allocationArticle || total <= 0) return;
                    const allocations = allocationRows
                      .filter(r => r.value > 0)
                      .map(r => ({ warehouse_id: r.warehouse_id, warehouse_description: r.warehouse_description, quantity: r.value }));
                    if (allocationEditArticleId) {
                      // Update existing entry using current selectedArticles prop
                      const next = selectedArticles.map((sa) => sa.article.id === allocationEditArticleId ? {
                        ...sa,
                        quantity: total,
                        allocations,
                      } : sa);
                      setSelectedArticles(next);
                    } else {
                      // Add new entry or update if exists
                      const exists = selectedArticles.find(sa => sa.article.id === allocationArticle.id);
                      if (exists) {
                        const next = selectedArticles.map(sa => sa.article.id === allocationArticle.id ? { ...sa, quantity: total, allocations } : sa);
                        setSelectedArticles(next);
                      } else {
                        const next = [...selectedArticles, { article: allocationArticle, quantity: total, allocations }];
                        setSelectedArticles(next);
                      }
                    }
                    setArticleSearchQuery('');
                    setShowArticleDropdown(false);
                    setShowAllocationDialog(false);
                    setAllocationArticle(null);
                    setAllocationRows([]);
                    setAllocationEditArticleId(null);
                    setAllocationAlert(null);
                  }}
                  disabled={isGammaSyncLock || allocationRows.reduce((s, r) => s + (r.value || 0), 0) <= 0}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    (isGammaSyncLock || allocationRows.reduce((s, r) => s + (r.value || 0), 0) <= 0)
                      ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                      : 'bg-teal-600 hover:bg-teal-700 text-white'
                  }`}
                >
                  Conferma Prelievo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
