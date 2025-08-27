'use client';

import React, { useState, useEffect } from 'react';
import { Package, ArrowRight, Loader2, X, Trash2 } from 'lucide-react';
import { ArticleListItem } from '../types/article';

interface Warehouse {
  id: string;
  description: string;
  article_count: number;
  total_stock_quantity: number;
  total_reserved_quantity: number;
  total_ordered_quantity: number;
  total_all_quantities: number;
}

interface SendArticleItem {
  articleId: string;
  articleCode: string;
  articleDescription: string;
  availableQuantity: number;
  sendQuantity: number;
}

interface InviaArticoliDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWarehouse: string;
  warehouses: Warehouse[];
  selectedArticles: string[];
  warehouseArticles: ArticleListItem[];
  onSubmitSend: (targetWarehouseId: string, sendArticles: SendArticleItem[], sendNotes: string) => Promise<void>;
  sendLoading: boolean;
  getTotalStock: (article: ArticleListItem) => number;
}

export default function InviaArticoliDialog({
  isOpen,
  onClose,
  sourceWarehouse,
  warehouses,
  selectedArticles,
  warehouseArticles,
  onSubmitSend,
  sendLoading,
  getTotalStock
}: InviaArticoliDialogProps) {
  const [selectedTargetWarehouse, setSelectedTargetWarehouse] = useState('');
  const [sendArticles, setSendArticles] = useState<SendArticleItem[]>([]);
  const [sendNotes, setSendNotes] = useState('');

  // Reset when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedTargetWarehouse('');
      setSendNotes('');
      
      // Initialize send articles from selected articles
      const initialSendArticles: SendArticleItem[] = selectedArticles
        .map(articleId => {
          const article = warehouseArticles.find(a => a.id === articleId);
          if (!article) return null;
          
          const availableQty = getTotalStock(article);
          return {
            articleId: article.id,
            articleCode: article.id,
            articleDescription: article.short_description,
            availableQuantity: availableQty,
            sendQuantity: availableQty // Default alla quantità massima disponibile
          };
        })
        .filter(Boolean) as SendArticleItem[];
      
      setSendArticles(initialSendArticles);
    }
  }, [isOpen, selectedArticles, warehouseArticles, getTotalStock]);

  if (!isOpen) return null;

  const sourceWarehouseData = warehouses.find(w => w.id === sourceWarehouse);
  const availableTargetWarehouses = warehouses.filter(w => w.id !== sourceWarehouse);

  const updateSendQuantity = (articleId: string, quantity: number) => {
    setSendArticles(prev => prev.map(item => 
      item.articleId === articleId 
        ? { ...item, sendQuantity: Math.max(1, Math.min(quantity, item.availableQuantity)) }
        : item
    ));
  };

  const removeSendArticle = (articleId: string) => {
    setSendArticles(prev => prev.filter(item => item.articleId !== articleId));
  };

  const handleSubmit = async () => {
    if (!selectedTargetWarehouse || sendArticles.length === 0) return;
    await onSubmitSend(selectedTargetWarehouse, sendArticles, sendNotes);
  };

  const canSubmit = selectedTargetWarehouse && sendArticles.length > 0 && !sendLoading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-[60vw] min-w-[600px] h-[95vh] flex flex-col max-h-screen">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-white rounded-t-lg flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-semibold text-gray-900">Invia Articoli</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              disabled={sendLoading}
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Da: <span className="font-medium">{sourceWarehouseData?.description}</span>
          </p>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
          
          {/* Selezione magazzino destinazione */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Magazzino di destinazione *
            </label>
            <select
              value={selectedTargetWarehouse}
              onChange={(e) => setSelectedTargetWarehouse(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
              disabled={sendLoading}
            >
              <option value="">Seleziona un magazzino...</option>
              {availableTargetWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.description}
                </option>
              ))}
            </select>
          </div>

          {/* Note invio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note invio (opzionale)
            </label>
            <textarea
              value={sendNotes}
              onChange={(e) => setSendNotes(e.target.value)}
              placeholder="Aggiungi note per questo invio..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700 resize-none"
              rows={3}
              disabled={sendLoading}
            />
          </div>

          {/* Lista articoli da inviare */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">
                Articoli da inviare ({sendArticles.length})
              </h3>
            </div>
            
            <div className="bg-gray-50 rounded-lg">
              {sendArticles.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <div className="text-center">
                    <Package className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p>Nessun articolo selezionato</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {sendArticles.map((item) => (
                    <div key={item.articleId} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 text-sm">
                              {item.articleCode}
                            </h4>
                            <button
                              onClick={() => removeSendArticle(item.articleId)}
                              className="text-red-600 hover:text-red-800 transition-colors p-1"
                              disabled={sendLoading}
                              title="Rimuovi articolo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 mb-3">
                            {item.articleDescription}
                          </p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Disponibile:</span>
                              <span className="text-xs font-medium text-green-600">
                                {item.availableQuantity}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-500">Quantità da inviare:</label>
                              <input
                                type="number"
                                min="1"
                                max={item.availableQuantity}
                                value={item.sendQuantity}
                                onChange={(e) => updateSendQuantity(item.articleId, parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                                disabled={sendLoading}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={sendLoading}
            >
              Annulla
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {sendLoading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Invio in corso...
                </>
              ) : (
                <>
                  <ArrowRight size={16} />
                  Invia {sendArticles.length} articol{sendArticles.length === 1 ? 'o' : 'i'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
