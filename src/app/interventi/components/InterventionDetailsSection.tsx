'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { Equipment } from '../../../types/equipment';
import { ArticleListItem } from '../../../types/article';

interface InterventionDetailsSectionProps {
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
  preventivo: number;
  setPreventivo: (value: number) => void;
  selectedCustomerId: number | null;
  selectedEquipments: Equipment[];
  setSelectedEquipments: (equipments: Equipment[]) => void;
  selectedArticles: SelectedArticle[];
  setSelectedArticles: (articles: SelectedArticle[]) => void;
  orarioApertura: string;
  setOrarioApertura: (value: string) => void;
  noteInterne: string;
  setNoteInterne: (value: string) => void;
}

interface SelectedArticle {
  article: ArticleListItem;
  quantity: number;
}

export default function InterventionDetailsSection({
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
  preventivo,
  setPreventivo,
  selectedCustomerId,
  selectedEquipments,
  setSelectedEquipments,
  selectedArticles,
  setSelectedArticles,
  orarioApertura,
  setOrarioApertura,
  noteInterne,
  setNoteInterne
}: InterventionDetailsSectionProps) {
  const auth = useAuth();

  // Stati per le apparecchiature
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
  const [isSearchingEquipments, setIsSearchingEquipments] = useState(false);

  // Stati per gli articoli (pezzi di ricambio)
  const [articleSearchQuery, setArticleSearchQuery] = useState('');
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [showArticleDropdown, setShowArticleDropdown] = useState(false);
  const [isSearchingArticles, setIsSearchingArticles] = useState(false);

  // Funzione per cercare le apparecchiature
  const searchEquipments = async (query: string = '') => {
    if (!selectedCustomerId) {
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

        const response = await fetch(
          `/api/equipments?customer_id=${selectedCustomerId}`,
          { headers }
        );

        if (response.ok) {
          const data = await response.json();
          // Filtra le apparecchiature già selezionate
          const filteredEquipments = (data.data || []).filter(
            (equipment: Equipment) => !selectedEquipments.find(selected => selected.id === equipment.id)
          );
          setEquipments(filteredEquipments);
          setShowEquipmentDropdown(true);
        } else {
          console.error('Errore nella ricerca apparecchiature');
          setEquipments([]);
          setShowEquipmentDropdown(false);
        }
      } catch (error) {
        console.error('Errore nella ricerca apparecchiature:', error);
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

      const response = await fetch(
        `/api/equipments?customer_id=${selectedCustomerId}&query=${encodeURIComponent(query)}`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        // Filtra le apparecchiature già selezionate
        const filteredEquipments = (data.data || []).filter(
          (equipment: Equipment) => !selectedEquipments.find(selected => selected.id === equipment.id)
        );
        setEquipments(filteredEquipments);
        setShowEquipmentDropdown(true);
      } else {
        console.error('Errore nella ricerca apparecchiature');
        setEquipments([]);
        setShowEquipmentDropdown(false);
      }
    } catch (error) {
      console.error('Errore nella ricerca apparecchiature:', error);
      setEquipments([]);
      setShowEquipmentDropdown(false);
    } finally {
      setIsSearchingEquipments(false);
    }
  };

  // Gestisce la selezione di un'apparecchiatura
  const handleEquipmentSelect = (equipment: Equipment) => {
    // Verifica se l'apparecchiatura è già selezionata
    if (!selectedEquipments.find(eq => eq.id === equipment.id)) {
      setSelectedEquipments([...selectedEquipments, equipment]);
    }
    setEquipmentSearchQuery('');
    setShowEquipmentDropdown(false);
  };

  // Rimuove un'apparecchiatura dalla selezione
  const removeSelectedEquipment = (equipmentId: number) => {
    setSelectedEquipments(selectedEquipments.filter(eq => eq.id !== equipmentId));
    
    // Se ci sono risultati di ricerca attivi, aggiorna il filtro
    if (equipments.length > 0 || showEquipmentDropdown) {
      // Ri-esegui la ricerca per includere l'elemento appena rimosso
      setTimeout(() => {
        if (selectedCustomerId) {
          searchEquipments(equipmentSearchQuery);
        }
      }, 100);
    }
  };

  // Gestisce il click fuori dal dropdown per chiuderlo
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

    if (showEquipmentDropdown || showArticleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEquipmentDropdown, showArticleDropdown]);

  // Debounce per la ricerca apparecchiature
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedCustomerId && equipmentSearchQuery.trim() && equipmentSearchQuery.length >= 2) {
        searchEquipments(equipmentSearchQuery);
      } else if (equipmentSearchQuery.trim() === '' && equipments.length > 0) {
        // Se l'utente ha cancellato tutto e c'erano già risultati, mantienili
        // (il fetch iniziale li ha già caricati)
        return;
      } else if (equipmentSearchQuery.length > 0 && equipmentSearchQuery.length < 2) {
        // Se c'è del testo ma meno di 2 caratteri, nascondi il dropdown
        setShowEquipmentDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [equipmentSearchQuery, selectedCustomerId]);

  // Reset apparecchiature quando cambia il cliente
  useEffect(() => {
    setSelectedEquipments([]);
    setEquipmentSearchQuery('');
    setEquipments([]);
    setShowEquipmentDropdown(false);
  }, [selectedCustomerId]);

  // Funzione per cercare gli articoli
  const searchArticles = async (query: string = '') => {
    // Per query vuota, fai comunque una ricerca per mostrare i primi risultati
    if (!query.trim()) {
      // Fetch iniziale senza filtro di testo
      try {
        setIsSearchingArticles(true);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        }

        const response = await fetch('/api/articles', { headers });

        if (response.ok) {
          const data = await response.json();
          console.log('🔍 Raw articles API response:', data);
          console.log('🔍 First article in response:', data.data?.[0]);
          console.log('🔍 Article IDs from API:', data.data?.map((art: ArticleListItem) => ({ id: art.id, type: typeof art.id })));
          
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
      return;
    }

    // Per query con testo, usa il filtro di ricerca
    if (query.length < 2) {
      setArticles([]);
      setShowArticleDropdown(false);
      return;
    }

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
        console.log('🔍 First article in response:', data.data?.[0]);
        console.log('🔍 Article IDs from API:', data.data?.map((art: ArticleListItem) => ({ id: art.id, type: typeof art.id })));
        
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
    console.log('🎯 Selected article ID:', { id: article.id, type: typeof article.id });
    
    // Verifica se l'articolo è già selezionato
    if (!selectedArticles.find(selected => selected.article.id === article.id)) {
      setSelectedArticles([...selectedArticles, { article, quantity: 1 }]);
    }
    setArticleSearchQuery('');
    setShowArticleDropdown(false);
  };

  // Rimuove un articolo dalla selezione
  const removeSelectedArticle = (articleId: string) => {
    setSelectedArticles(selectedArticles.filter(selected => selected.article.id !== articleId));
    
    // Se ci sono risultati di ricerca attivi, aggiorna il filtro
    if (articles.length > 0 || showArticleDropdown) {
      // Ri-esegui la ricerca per includere l'elemento appena rimosso
      setTimeout(() => {
        searchArticles(articleSearchQuery);
      }, 100);
    }
  };

  // Aggiorna la quantità di un articolo selezionato
  const updateArticleQuantity = (articleId: string, quantity: number) => {
    if (quantity < 0) return; // Non permette quantità negative
    
    setSelectedArticles(selectedArticles.map(selected => 
      selected.article.id === articleId 
        ? { ...selected, quantity } 
        : selected
    ));
  };

  // Debounce per la ricerca articoli
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (articleSearchQuery.trim() && articleSearchQuery.length >= 2) {
        searchArticles(articleSearchQuery);
      } else if (articleSearchQuery.trim() === '' && articles.length > 0) {
        // Se l'utente ha cancellato tutto e c'erano già risultati, mantienili
        return;
      } else if (articleSearchQuery.length > 0 && articleSearchQuery.length < 2) {
        // Se c'è del testo ma meno di 2 caratteri, nascondi il dropdown
        setShowArticleDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [articleSearchQuery, selectedArticles]);

  return (
    <div className="space-y-6">
      {/* Note */}
      <div>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <input type="checkbox" className="mr-2" />
              <span className="text-sm text-gray-600">Sconto sul servizio domicilio</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data
          </label>
          <div className="relative">
            <input
              type="date"
              value={data}
              onChange={(e) => {
                setData(e.target.value);
                // Se cancellano la data, resetta anche l'orario per mantenere la validazione
                if (!e.target.value) {
                  setOrarioIntervento('');
                  setOraInizio('');
                  setOraFine('');
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Orario intervento
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      <div>
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
                if (selectedCustomerId) {
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
              disabled={!selectedCustomerId}
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
          {showEquipmentDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {equipments.length > 0 ? (
                equipments.map((equipment) => (
                  <div
                    key={equipment.id}
                    onClick={() => handleEquipmentSelect(equipment)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{equipment.description}</div>
                    <div className="text-sm text-gray-500">
                      {equipment.brand_name} {equipment.model ? `- ${equipment.model}` : ''}
                    </div>
                    <div className="text-xs text-gray-400">
                      {equipment.serial_number ? `S/N: ${equipment.serial_number}` : 'Senza numero seriale'} | 
                      {equipment.subfamily_name}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-center text-gray-500">
                  <p className="text-sm">
                    {equipmentSearchQuery.trim() 
                      ? 'Nessuna apparecchiatura trovata' 
                      : 'Tutte le apparecchiature sono già selezionate'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Messaggio informativo */}
        {!selectedCustomerId && (
          <p className="mt-1 text-xs text-gray-500">
            💡 Seleziona prima una ragione sociale per cercare le apparecchiature
          </p>
        )}

        {/* Apparecchiature selezionate */}
        {selectedEquipments.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Apparecchiature selezionate ({selectedEquipments.length})
            </h4>
            <div className="space-y-2">
              {selectedEquipments.map((equipment) => (
                <div
                  key={equipment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{equipment.description}</div>
                    <div className="text-sm text-gray-500">
                      {equipment.brand_name} {equipment.model ? `- ${equipment.model}` : ''}
                    </div>
                    <div className="text-xs text-gray-400">
                      {equipment.serial_number ? `S/N: ${equipment.serial_number}` : 'Senza numero seriale'} | 
                      {equipment.subfamily_name}
                    </div>
                  </div>
                  <button
                    onClick={() => removeSelectedEquipment(equipment.id)}
                    className="ml-2 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Rimuovi apparecchiatura"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pezzi di ricambio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pezzi di ricambio
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
              placeholder="Cerca pezzo di ricambio..."
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
          {showArticleDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {articles.length > 0 ? (
                articles.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => handleArticleSelect(article)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{article.short_description}</div>
                    <div className="text-sm text-gray-500">
                      {article.brand_label} {article.model ? `- ${article.model}` : ''}
                    </div>
                    <div className="text-xs text-gray-400">
                      {article.pnc_code ? `PNC: ${article.pnc_code}` : 'Senza codice PNC'} | 
                      {article.family_label}
                      {article.quantity_stock !== null && (
                        <span className="ml-2 text-teal-600">
                          Stock: {article.quantity_stock}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-center text-gray-500">
                  <p className="text-sm">
                    {articleSearchQuery.trim() 
                      ? 'Nessun articolo trovato' 
                      : 'Tutti gli articoli sono già selezionati'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Articoli selezionati */}
        {selectedArticles.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Pezzi di ricambio selezionati ({selectedArticles.length})
            </h4>
            <div className="space-y-2">
              {selectedArticles.map((selectedArticle) => (
                <div
                  key={selectedArticle.article.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{selectedArticle.article.short_description}</div>
                    <div className="text-sm text-gray-500">
                      {selectedArticle.article.brand_label} {selectedArticle.article.model ? `- ${selectedArticle.article.model}` : ''}
                    </div>
                    <div className="text-xs text-gray-400">
                      {selectedArticle.article.pnc_code ? `PNC: ${selectedArticle.article.pnc_code}` : 'Senza codice PNC'} | 
                      {selectedArticle.article.family_label}
                      {selectedArticle.article.quantity_stock !== null && (
                        <span className="ml-2 text-teal-600">
                          Stock: {selectedArticle.article.quantity_stock}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="flex items-center">
                      <label className="text-xs text-gray-500 mr-1">Qtà:</label>
                      <input
                        type="number"
                        min="0"
                        value={selectedArticle.quantity}
                        onChange={(e) => updateArticleQuantity(selectedArticle.article.id, parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-sm border text-gray-700 border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <button
                      onClick={() => removeSelectedArticle(selectedArticle.article.id)}
                      className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Rimuovi articolo"
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

      {/* Richiedi pezzi di ricambio mancanti */}
      {/* <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Richiedi pezzi di ricambio mancanti
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Cerca"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <input
            type="number"
            placeholder="0"
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg">
            Aggiungi
          </button>
        </div>
      </div> */}
    </div>
  );
} 