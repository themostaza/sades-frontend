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
}: InterventionDetailsSectionDetailProps) {
  const auth = useAuth();

  // Stati per la ricerca equipaggiamenti
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
  const [isSearchingEquipments, setIsSearchingEquipments] = useState(false);

  // Stati per la ricerca articoli
  const [articleSearchQuery, setArticleSearchQuery] = useState('');
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [showArticleDropdown, setShowArticleDropdown] = useState(false);
  const [isSearchingArticles, setIsSearchingArticles] = useState(false);

  // Funzione per verificare se la ricerca apparecchiature è abilitata
  const isEquipmentSearchEnabled = () => {
    // Deve esserci un cliente selezionato
    if (!selectedCustomerId) return false;
    
    // Per ora assumiamo che se c'è una destinazione specificata, deve essere usata nel filtro
    // Se non c'è destinazione, possiamo comunque cercare (cliente senza location specifiche)
    return true;
  };

  // Funzione per cercare equipaggiamenti
  const searchEquipments = async (query: string = '') => {
    if (!selectedCustomerId || !isEquipmentSearchEnabled()) {
      setEquipments([]);
      setShowEquipmentDropdown(false);
      return;
    }

    // Per query vuota o molto corta, fai comunque una ricerca se c'è un cliente selezionato
    if (!query.trim() && selectedCustomerId) {
      // Fetch iniziale senza filtro di testo
      try {
        setIsSearchingEquipments(true);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        }

        // Costruisci l'URL con i parametri appropriati
        let apiUrl = `/api/equipments?customer_id=${selectedCustomerId}`;
        if (destinazione) {
          apiUrl += `&customer_location_id=${encodeURIComponent(destinazione)}`;
        }

        const response = await fetch(apiUrl, { headers });

        if (response.ok) {
          const data = await response.json();
          console.log('🔍 Raw equipments API response:', data);
          
          // Filtra gli equipaggiamenti già selezionati
          const filteredEquipments = (data.data || []).filter(
            (equipment: Equipment) => !selectedEquipments.find(selected => selected.id === equipment.id)
          );
          setEquipments(filteredEquipments);
          setShowEquipmentDropdown(true);
        } else {
          console.error('Errore nella ricerca equipaggiamenti');
          setEquipments([]);
          setShowEquipmentDropdown(false);
        }
      } catch (error) {
        console.error('Errore nella ricerca equipaggiamenti:', error);
        setEquipments([]);
        setShowEquipmentDropdown(false);
      } finally {
        setIsSearchingEquipments(false);
      }
      return;
    }

    // Per query con testo, usa il filtro di ricerca
    if (query.length < 2) {
      setEquipments([]);
      setShowEquipmentDropdown(false);
      return;
    }

    try {
      setIsSearchingEquipments(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      // Costruisci l'URL con i parametri appropriati
      let apiUrl = `/api/equipments?customer_id=${selectedCustomerId}&query=${encodeURIComponent(query)}`;
      if (destinazione) {
        apiUrl += `&customer_location_id=${encodeURIComponent(destinazione)}`;
      }

      const response = await fetch(apiUrl, { headers });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Raw equipments API response:', data);
        
        // Filtra gli equipaggiamenti già selezionati
        const filteredEquipments = (data.data || []).filter(
          (equipment: Equipment) => !selectedEquipments.find(selected => selected.id === equipment.id)
        );
        setEquipments(filteredEquipments);
        setShowEquipmentDropdown(true);
      } else {
        console.error('Errore nella ricerca equipaggiamenti');
        setEquipments([]);
        setShowEquipmentDropdown(false);
      }
    } catch (error) {
      console.error('Errore nella ricerca equipaggiamenti:', error);
      setEquipments([]);
      setShowEquipmentDropdown(false);
    } finally {
      setIsSearchingEquipments(false);
    }
  };

  // Gestisce la selezione di un equipaggiamento
  const handleEquipmentSelect = (equipment: Equipment) => {
    console.log('🎯 Selected equipment:', equipment);
    
    // Verifica se l'equipaggiamento è già selezionato
    if (!selectedEquipments.find(selected => selected.id === equipment.id)) {
      setSelectedEquipments([...selectedEquipments, equipment]);
    }
    setEquipmentSearchQuery('');
    setShowEquipmentDropdown(false);
  };

  // Rimuove un equipaggiamento selezionato
  const removeEquipment = (equipmentId: number) => {
    setSelectedEquipments(selectedEquipments.filter(eq => eq.id !== equipmentId));
  };

  // Funzione per cercare articoli
  const searchArticles = async (query: string = '') => {
    try {
      setIsSearchingArticles(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(
        `/api/articles?query=${encodeURIComponent(query)}`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Raw articles API response:', data);
        
        // Filtra gli articoli già selezionati
        const filteredArticles = (data.data || []).filter(
          (article: ArticleListItem) => !selectedArticles.find(selected => selected.article.id === article.id)
        );
        setArticles(filteredArticles);
        setShowArticleDropdown(true);
      } else {
        console.error('Errore nella ricerca articoli');
        setArticles([]);
        setShowArticleDropdown(false);
      }
    } catch (error) {
      console.error('Errore nella ricerca articoli:', error);
      setArticles([]);
      setShowArticleDropdown(false);
    } finally {
      setIsSearchingArticles(false);
    }
  };

  // Gestisce la selezione di un articolo
  const handleArticleSelect = (article: ArticleListItem) => {
    console.log('🎯 Selected article:', article);
    
    // Verifica se l'articolo è già selezionato
    if (!selectedArticles.find(selected => selected.article.id === article.id)) {
      setSelectedArticles([...selectedArticles, { article, quantity: 1 }]);
    }
    setArticleSearchQuery('');
    setShowArticleDropdown(false);
  };

  // Rimuove un articolo selezionato
  const removeArticle = (articleId: string) => {
    setSelectedArticles(selectedArticles.filter(art => art.article.id !== articleId));
  };

  // Aggiorna la quantità di un articolo
  const updateArticleQuantity = (articleId: string, quantity: number) => {
    setSelectedArticles(selectedArticles.map(art => 
      art.article.id === articleId ? { ...art, quantity } : art
    ));
  };

  // Gestisce il debounce per la ricerca equipaggiamenti
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (isEquipmentSearchEnabled() && equipmentSearchQuery.trim() && equipmentSearchQuery.length >= 2) {
        searchEquipments(equipmentSearchQuery);
      } else if (equipmentSearchQuery.trim() === '' && equipments.length > 0) {
        // Se l'utente ha cancellato tutto e c'erano già risultati, mantienili
        return;
      } else if (equipmentSearchQuery.length > 0 && equipmentSearchQuery.length < 2) {
        // Se c'è del testo ma meno di 2 caratteri, nascondi il dropdown
        setShowEquipmentDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [equipmentSearchQuery, selectedCustomerId, destinazione]);

  // Reset apparecchiature quando cambia il cliente o la destinazione
  useEffect(() => {
    setSelectedEquipments([]);
    setEquipmentSearchQuery('');
    setEquipments([]);
    setShowEquipmentDropdown(false);
  }, [selectedCustomerId, destinazione]);

  // Gestisce il debounce per la ricerca articoli
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (articleSearchQuery.length >= 2) {
        searchArticles(articleSearchQuery);
      } else {
        setArticles([]);
        setShowArticleDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [articleSearchQuery]);

  // Gestisce il click fuori dai dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.equipment-search-container')) {
        setShowEquipmentDropdown(false);
      }
      if (!target.closest('.article-search-container')) {
        setShowArticleDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Dettagli Intervento</h2>
      
      {/* Note */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Note
        </label>
        <textarea 
          value={noteInterne}
          onChange={(e) => setNoteInterne(e.target.value)}
          rows={4}
          placeholder="Inserisci note per l'intervento..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 resize-vertical"
        />
      </div>

      {/* Servizio domicilio, Data, Orario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Servizio domicilio
          </label>
          <div className="relative">
            <select 
              value={servizioDomicilio}
              onChange={(e) => setServizioDomicilio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white text-gray-900"
            >
              <option value="Si">Si</option>
              <option value="No">No</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
          <div className="mt-2">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={scontoServizioDomicilio}
                onChange={(e) => setScontoServizioDomicilio(e.target.checked)}
                className="mr-2" 
              />
              <span className="text-sm text-gray-600">Sconto sul servizio domicilio</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data
          </label>
          <input
            type="date"
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              // Reset orario quando cambia data
              if (!e.target.value) {
                setOrarioIntervento('');
                setOraInizio('');
                setOraFine('');
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Orario
          </label>
          <div className="relative">
            <select 
              value={orarioIntervento}
              onChange={(e) => {
                setOrarioIntervento(e.target.value);
                // Reset campi ora quando si cambia tipo orario
                if (e.target.value !== 'fascia_oraria') {
                  setOraInizio('');
                  setOraFine('');
                }
              }}
              disabled={!data}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white text-gray-900 ${
                !data ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
              }`}
            >
              <option value="">Seleziona orario</option>
              <option value="mattina">Mattina (8:00 - 13:00)</option>
              <option value="pomeriggio">Pomeriggio (14:00 - 18:00)</option>
              <option value="tutto_il_giorno">Tutto il giorno (8:00 - 18:00)</option>
              <option value="fascia_oraria">Fascia oraria (personalizzata)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
          
          {/* Messaggio informativo */}
          {!data && (
            <p className="mt-1 text-xs text-gray-500">
              💡 Seleziona prima una data per abilitare la scelta dell&apos;orario
            </p>
          )}
          
          {/* Campi condizionali per fascia oraria */}
          {orarioIntervento === 'fascia_oraria' && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ora inizio
                </label>
                <input
                  type="time"
                  value={oraInizio}
                  onChange={(e) => setOraInizio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ora fine
                </label>
                <input
                  type="time"
                  value={oraFine}
                  onChange={(e) => setOraFine(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preventivo e Orario apertura */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preventivo
          </label>
          <div className="flex">
            <input
              type="number"
              step="0.01"
              min="0"
              value={preventivo}
              onChange={(e) => setPreventivo(Number(e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
            />
            <span className="bg-gray-100 border border-l-0 border-gray-300 px-3 py-2 rounded-r-lg text-gray-600">
              EUR
            </span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Orario apertura
          </label>
          <input 
            type="text"
            value={orarioApertura}
            onChange={(e) => setOrarioApertura(e.target.value)}
            placeholder="Orario apertura"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
          />
        </div>
      </div>

      {/* Apparecchiatura interessata */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Apparecchiatura interessata
        </label>
        
        {/* Barra di ricerca */}
        <div className="relative equipment-search-container">
          <div className="relative">
            <input
              type="text"
              value={equipmentSearchQuery}
              onChange={(e) => setEquipmentSearchQuery(e.target.value)}
              onFocus={() => {
                if (isEquipmentSearchEnabled()) {
                  // Se ci sono già risultati, mostra il dropdown, altrimenti fai una ricerca
                  if (equipments.length > 0) {
                    setShowEquipmentDropdown(true);
                  } else {
                    searchEquipments(equipmentSearchQuery);
                  }
                }
              }}
              placeholder={
                !selectedCustomerId 
                  ? "Prima seleziona una ragione sociale..." 
                  : "Cerca apparecchiatura..."
              }
              disabled={!isEquipmentSearchEnabled()}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            {isSearchingEquipments && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          
          {/* Dropdown con risultati */}
          {showEquipmentDropdown && equipments.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {equipments.map((equipment) => (
                <div
                  key={equipment.id}
                  onClick={() => handleEquipmentSelect(equipment)}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">{equipment.description}</div>
                  <div className="text-sm text-gray-500">
                    Modello: {equipment.model || 'N/A'} | S/N: {equipment.serial_number || 'N/A'}
                  </div>
                  <div className="text-xs text-gray-400">
                    Brand: {equipment.brand_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messaggi informativi */}
        {!selectedCustomerId && (
          <p className="mt-1 text-xs text-gray-500">
            💡 Seleziona prima una ragione sociale per cercare le apparecchiature
          </p>
        )}

        {/* Equipaggiamenti selezionati */}
        {selectedEquipments.length > 0 && (
          <div className="mt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Equipaggiamenti selezionati:</div>
            <div className="space-y-2">
              {selectedEquipments.map((equipment) => (
                <div key={equipment.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{equipment.description}</div>
                    <div className="text-sm text-gray-500">
                      Modello: {equipment.model || 'N/A'} | S/N: {equipment.serial_number || 'N/A'}
                    </div>
                  </div>
                  <button
                    onClick={() => removeEquipment(equipment.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ricambi utilizzati */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ricambi utilizzati
        </label>
        
        {/* Barra di ricerca */}
        <div className="relative article-search-container">
          <div className="relative">
            <input
              type="text"
              value={articleSearchQuery}
              onChange={(e) => setArticleSearchQuery(e.target.value)}
              onFocus={() => {
                // Se ci sono già risultati, mostra il dropdown, altrimenti fai una ricerca
                if (articles.length > 0) {
                  setShowArticleDropdown(true);
                } else {
                  searchArticles(articleSearchQuery);
                }
              }}
              placeholder="Cerca ricambi..."
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            {isSearchingArticles && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          
          {/* Dropdown con risultati */}
          {showArticleDropdown && articles.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {articles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => handleArticleSelect(article)}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">{article.short_description}</div>
                  <div className="text-sm text-gray-500">
                    PNC: {article.pnc_code || 'N/A'} | Stock: {article.quantity_stock || 0}
                  </div>
                  <div className="text-xs text-gray-400">
                    {article.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Articoli selezionati */}
        {selectedArticles.length > 0 && (
          <div className="mt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Ricambi selezionati:</div>
            <div className="space-y-2">
              {selectedArticles.map((selectedArticle) => (
                <div key={selectedArticle.article.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{selectedArticle.article.short_description}</div>
                    <div className="text-sm text-gray-500">
                      PNC: {selectedArticle.article.pnc_code || 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700">Qtà:</label>
                    <input
                      type="number"
                      min="1"
                      value={selectedArticle.quantity}
                      onChange={(e) => updateArticleQuantity(selectedArticle.article.id, Number(e.target.value))}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                    />
                    <button
                      onClick={() => removeArticle(selectedArticle.article.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 