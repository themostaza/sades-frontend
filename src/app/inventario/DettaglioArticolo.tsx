'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Article } from '../../types/article';

interface DettaglioArticoloProps {
  articleId: string;
  onBack: () => void;
  onArticleUpdated?: () => void;
}

interface ArticleInventory {
  warehouse: string;
  disponible: number;
  riservata_cliente: number;
  in_stock: number;
  ordinata: number;
  data_primo_ordine: string | null;
}

export default function DettaglioArticolo({ articleId, onBack }: DettaglioArticoloProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth = useAuth();

  // Fetch article details
  const fetchArticleDetails = async () => {
    if (!articleId) return;
    
    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/articles/${articleId}`, {
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch article details');
      }

      const data = await response.json();
      setArticle(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching article details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (articleId) {
      fetchArticleDetails();
    }
  }, [articleId]);

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  // Format date for input
  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  // Check if date has value for styling
  const hasDateValue = (dateString: string | null) => {
    return dateString && dateString.trim() !== '';
  };

  // Mock inventory data for now - replace with real data when API is available
  const mockInventoryData: ArticleInventory[] = [
    {
      warehouse: 'Magazzino',
      disponible: 0,
      riservata_cliente: 0,
      in_stock: 0,
      ordinata: 0,
      data_primo_ordine: null
    },
    {
      warehouse: 'Kit 1',
      disponible: 0,
      riservata_cliente: 0,
      in_stock: 0,
      ordinata: 0,
      data_primo_ordine: null
    },
    {
      warehouse: 'Furgone',
      disponible: 0,
      riservata_cliente: 0,
      in_stock: 0,
      ordinata: 0,
      data_primo_ordine: null
    }
  ];

  if (loading && !article) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Caricamento dettagli articolo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">Errore nel caricamento dell&apos;articolo</p>
            <button 
              onClick={fetchArticleDetails}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg"
            >
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">
            {article?.short_description || 'Articolo'}
          </h1>
        </div>
      </div>

      {article && (
        <div className="space-y-6">
          {/* Informazioni Articolo */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Dettagli Articolo</h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colonna Sinistra */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      ID articolo
                    </label>
                    <input
                      type="text"
                      value={article.id}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Data ordine
                    </label>
                    <div className="relative">
                      <Calendar className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                        hasDateValue(article.order_date) ? 'text-gray-400' : 'text-gray-300'
                      }`} size={16} />
                      <input
                        type="date"
                        value={formatDateForInput(article.order_date)}
                        readOnly
                        className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 ${
                          hasDateValue(article.order_date) ? 'text-gray-700' : 'text-gray-400'
                        }`}
                        placeholder={!hasDateValue(article.order_date) ? 'Data non disponibile' : ''}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Famiglia
                    </label>
                    <input
                      type="text"
                      value={article.family_label}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={article.brand_label}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Descrizione
                    </label>
                    <input
                      type="text"
                      value={article.short_description}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Codice PNC
                    </label>
                    <input
                      type="text"
                      value={article.pnc_code || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                </div>

                {/* Colonna Destra */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 h-16">
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Data stimata arrivo
                    </label>
                    <div className="relative">
                      <Calendar className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                        hasDateValue(article.estimate_arrival_date) ? 'text-gray-400' : 'text-gray-300'
                      }`} size={16} />
                      <input
                        type="date"
                        value={formatDateForInput(article.estimate_arrival_date)}
                        readOnly
                        className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 ${
                          hasDateValue(article.estimate_arrival_date) ? 'text-gray-700' : 'text-gray-400'
                        }`}
                        placeholder={!hasDateValue(article.estimate_arrival_date) ? 'Data non disponibile' : ''}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Sottofamiglia
                    </label>
                    <input
                      type="text"
                      value={article.subfamily_label || 'Nome sottofamiglia'}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Modello
                    </label>
                    <input
                      type="text"
                      value={article.model || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Descrizione completa
                    </label>
                    <textarea
                      rows={3}
                      value={article.description || 'Descrizione completa'}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Codice PNC sostitutivo
                    </label>
                    <input
                      type="text"
                      value={article.alternative_pnc_code || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gestione Magazzino */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Gestione Magazzino</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {/* Empty header for warehouse names */}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Disponibile
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Riservata cliente
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      In stock
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordinata
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data primo ordine
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mockInventoryData.map((inventory, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {inventory.warehouse}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="number"
                          value={inventory.disponible}
                          readOnly
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded bg-gray-50 text-gray-700"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="number"
                          value={inventory.riservata_cliente}
                          readOnly
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded bg-gray-50 text-gray-700"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="number"
                          value={inventory.in_stock}
                          readOnly
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded bg-gray-50 text-gray-700"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="number"
                          value={inventory.ordinata}
                          readOnly
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded bg-gray-50 text-gray-700"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="text"
                          value={inventory.data_primo_ordine ? formatDate(inventory.data_primo_ordine) : 'gg/mm/aaaa'}
                          readOnly
                          className={`w-24 px-2 py-1 text-center border border-gray-300 rounded bg-gray-50 text-xs ${
                            inventory.data_primo_ordine ? 'text-gray-700' : 'text-gray-400'
                          }`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Informazioni Fornitore */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Informazioni Fornitore</h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Codice del fornitore
                  </label>
                  <input
                    type="text"
                    value="000000"
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Codice articolo del fornitore
                  </label>
                  <input
                    type="text"
                    value="0000"
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 