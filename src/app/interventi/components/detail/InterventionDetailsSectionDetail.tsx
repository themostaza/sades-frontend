'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { Equipment } from '../../../../types/equipment';
import { ArticleListItem } from '../../../../types/article';

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

  const [articleSearchQuery, setArticleSearchQuery] = useState('');
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [showArticleDropdown, setShowArticleDropdown] = useState(false);
  const [isSearchingArticles, setIsSearchingArticles] = useState(false);

  const isEquipmentSearchEnabled = () => {
    if (isFieldsDisabled) return false;
    if (!selectedCustomerId) return false;
    // RIMOSSO: if (isCreating && hasCustomerLocations && !destinazione) return false;
    // In visualizzazione dettaglio, la destinazione resta obbligatoria
    if (!isCreating && !destinazione) return false;
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
      const response = await fetch(`/api/articles?query=${encodeURIComponent(query)}`, { headers });
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

  const handleArticleSelect = (article: ArticleListItem) => {
    if (!selectedArticles.find(selected => selected.article.id === article.id)) {
      setSelectedArticles([...selectedArticles, { article, quantity: 1 }]);
    }
    setArticleSearchQuery('');
    setShowArticleDropdown(false);
  };

  const removeArticle = (articleId: string) => {
    setSelectedArticles(selectedArticles.filter(art => art.article.id !== articleId));
  };

  const updateArticleQuantity = (articleId: string, quantity: number) => {
    if (quantity < 0) return;
    setSelectedArticles(selectedArticles.map(art => 
      art.article.id === articleId ? { ...art, quantity } : art
    ));
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchEquipments(equipmentSearchQuery);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [equipmentSearchQuery, selectedCustomerId, destinazione]);

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
        <label className="block text-sm font-medium text-gray-700 mb-2">Apparecchiatura interessata</label>
        <div className="relative equipment-search-container">
          <input
            type="text"
            value={equipmentSearchQuery}
            onChange={(e) => setEquipmentSearchQuery(e.target.value)}
            onFocus={() => isEquipmentSearchEnabled() && searchEquipments(equipmentSearchQuery)}
            placeholder={!isEquipmentSearchEnabled() ? "Seleziona cliente/destinazione" : "Cerca apparecchiatura..."}
            disabled={!isEquipmentSearchEnabled()}
            className="w-full px-3 py-2 pr-10 border rounded-lg disabled:bg-gray-50 text-gray-700"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          {isSearchingEquipments && <div className="absolute right-10 top-1/2 transform -translate-y-1/2 w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>}
          {showEquipmentDropdown && equipments.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {equipments.map((eq) => (
                <div key={eq.id} onClick={() => handleEquipmentSelect(eq)} className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-gray-700">
                  <div className="font-medium text-gray-700">{eq.description}</div>
                  <div className="text-sm text-gray-500">{eq.brand_name} {eq.model} (S/N: {eq.serial_number})</div>
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
                  <div className="text-sm text-gray-500">{eq.brand_name} {eq.model}</div>
                </div>
                {!isFieldsDisabled && <button onClick={() => removeEquipment(eq.id)} className="text-red-500"><X size={16} /></button>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Ricambi utilizzati</label>
        <div className="relative article-search-container">
          <input
            type="text"
            value={articleSearchQuery}
            onChange={(e) => setArticleSearchQuery(e.target.value)}
            onFocus={() => !isFieldsDisabled && searchArticles(articleSearchQuery)}
            placeholder={isFieldsDisabled ? "Non modificabile" : "Cerca ricambi..."}
            disabled={isFieldsDisabled}
            className="w-full px-3 py-2 pr-10 border rounded-lg disabled:bg-gray-50 text-gray-700"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          {isSearchingArticles && <div className="absolute right-10 top-1/2 transform -translate-y-1/2 w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>}
          {showArticleDropdown && articles.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {articles.map((art) => (
                <div key={art.id} onClick={() => handleArticleSelect(art)} className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-gray-700">
                  <div className="font-medium text-gray-700">{art.short_description}
                  </div>
                  <div className="text-sm text-gray-500">PNC: {art.pnc_code} | Stock: {art.quantity_stock} |
                    <span className=" text-gray-600 ml-1"> ID: {art.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedArticles.length > 0 && (
          <div className="mt-3 space-y-2">
            {selectedArticles.map((selArt) => (
              <div key={selArt.article.id} className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-700">{selArt.article.short_description}
                  </div>
                  <div className="text-sm text-gray-700">PNC: {selArt.article.pnc_code} | Stock: {selArt.article.quantity_stock} | <span className=" text-gray-600 ml-1">ID: {selArt.article.id}</span></div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Qtà:</label>
                  <input type="number" min="1" value={selArt.quantity} onChange={(e) => updateArticleQuantity(selArt.article.id, Number(e.target.value))} disabled={isFieldsDisabled} className={`w-16 p-1 border rounded font-medium text-gray-700 ${isFieldsDisabled ? 'bg-gray-200' : ''}`}/>
                  {!isFieldsDisabled && <button onClick={() => removeArticle(selArt.article.id)} className="text-red-500"><X size={16} /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
