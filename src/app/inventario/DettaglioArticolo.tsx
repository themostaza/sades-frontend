'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Article } from '../../types/article';

interface DettaglioArticoloProps {
  articleId: string;
  onBack: () => void;
  onArticleUpdated?: () => void;
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

  // Helper function to get stock value (preferring in_stock over quantity_stock)
  const getStockValue = (inv: any): number => {
    const stockVal = typeof inv.in_stock === 'number' && inv.in_stock != null
      ? inv.in_stock
      : (inv.quantity_stock || 0);
    return stockVal || 0;
  };

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
              {(() => {
                // Calcola i totali prima di renderizzare la tabella
                const clInventory = article.inventory?.find(inv => {
                  const warehouseId = String(inv.warehouse_id ?? inv.warehouse ?? '');
                  return warehouseId === 'CL';
                });
                const clStock = clInventory ? getStockValue(clInventory) : 0;

                const filteredInventory = article.inventory?.filter(inv => {
                  const warehouseId = String(inv.warehouse_id ?? inv.warehouse ?? '');
                  return warehouseId !== 'CL';
                }) || [];

                const totalStock = filteredInventory.reduce((sum, inv) => sum + getStockValue(inv), 0);

                return (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Magazzino
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          In stock <span className="text-gray-900 font-bold">({totalStock})</span>
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Riservata cliente (CL) <span className="text-gray-900 font-bold">({clStock})</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {article.inventory && article.inventory.length > 0 ? (
                        filteredInventory.map((inventory, index) => {
                          const stockValue = getStockValue(inventory);
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {inventory.warehouse_description || inventory.warehouse || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center justify-center w-20 px-2 py-1 text-center border border-gray-300 rounded bg-gray-50 ${
                                  stockValue > 0 ? 'text-green-600 font-semibold' : 'text-gray-500'
                                }`}>
                                  {stockValue}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center justify-center w-20 px-2 py-1 text-center border border-gray-300 rounded bg-gray-50 ${
                                  clStock > 0 ? 'text-blue-600 font-semibold' : 'text-gray-500'
                                }`}>
                                  {clStock}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                            Nessun dato di inventario disponibile per questo articolo
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>

          {/* Informazioni Fornitore */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Informazioni Fornitore</h2>
            </div>
            
            <div className="p-6">
              {article.suppliers && article.suppliers.length > 0 ? (
                <div className="space-y-6">
                  {article.suppliers.map((supplier, index) => (
                    <div key={index} className="pb-6 border-b border-gray-200 last:border-b-0 last:pb-0">
                      <div className="mb-3 text-sm font-semibold text-gray-900">
                        Fornitore {index + 1}
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            Codice fornitore
                          </label>
                          <input
                            type="text"
                            value={supplier.supplier_code || 'N/A'}
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
                            value={supplier.supplier_article_code || 'N/A'}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nessun fornitore disponibile per questo articolo
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 