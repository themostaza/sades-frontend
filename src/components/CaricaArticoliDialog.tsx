'use client';

import React from 'react';
import { Package, Search, ArrowLeft, Loader2, AlertTriangle, X, Plus, ChevronDown } from 'lucide-react';
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

interface TransferArticleItem {
  articleId: string;
  articleCode: string;
  articleDescription: string;
  availableQuantity: number;
  transferQuantity: number;
  sourceWarehouseId?: string;
  sourceWarehouseDescription?: string;
}

interface CaricaArticoliDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWarehouse: string;
  warehouses: Warehouse[];
  filteredWarehouses: Warehouse[];
  onSubmitTransfer: (transferArticles: TransferArticleItem[], transferNotes: string) => Promise<void>;
  insertLoading: boolean;
  
  // Stati per i magazzini sorgente
  selectedSourceWarehouses: string[];
  onSourceWarehouseToggle: (warehouseId: string) => void;
  onSelectAllWarehouses: () => void;
  onDeselectAllWarehouses: () => void;
  
  // Stati per gli articoli di trasferimento
  transferSourceArticles: ArticleListItem[];
  transferArticlesLoading: boolean;
  transferSearchTerm: string;
  onTransferSearchChange: (searchTerm: string) => void;
  transferArticlesCurrentPage: number;
  transferArticlesTotalPages: number;
  transferArticlesPerPage: number;
  transferHasMore: boolean;
  onLoadMoreArticles: () => Promise<void>;
  
  // Stati per il carrello
  transferArticles: TransferArticleItem[];
  onAddTransferArticle: (article: ArticleListItem) => void;
  onUpdateTransferQuantity: (articleId: string, quantity: number) => void;
  onRemoveTransferArticle: (articleId: string) => void;
  
  // Note
  transferNotes: string;
  onTransferNotesChange: (notes: string) => void;
  
  // Funzioni helper
  getWarehouseSpecificStock: (article: ArticleListItem) => number;
  getArticlesByWarehouse: () => { [warehouseId: string]: { warehouse: Warehouse, articles: ArticleListItem[] } };
}

export default function CaricaArticoliDialog({
  isOpen,
  onClose,
  selectedWarehouse,
  warehouses,
  filteredWarehouses,
  onSubmitTransfer,
  insertLoading,
  
  selectedSourceWarehouses,
  onSourceWarehouseToggle,
  onSelectAllWarehouses,
  onDeselectAllWarehouses,
  
  transferSourceArticles,
  transferArticlesLoading,
  transferSearchTerm,
  onTransferSearchChange,
  transferArticlesCurrentPage,
  transferArticlesTotalPages,
  transferArticlesPerPage,
  transferHasMore,
  onLoadMoreArticles,
  
  transferArticles,
  onAddTransferArticle,
  onUpdateTransferQuantity,
  onRemoveTransferArticle,
  
  transferNotes,
  onTransferNotesChange,
  
  getWarehouseSpecificStock,
  getArticlesByWarehouse
}: CaricaArticoliDialogProps) {
  if (!isOpen) return null;

  const handleSubmit = async () => {
    await onSubmitTransfer(transferArticles, transferNotes);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Content principale - 3 colonne */}
      <div className="flex-1 flex overflow-hidden">
        {/* Colonna 1: Magazzini Sorgente */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Magazzini Sorgente</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Destinazione: <span className="font-medium">{filteredWarehouses.find(w => w.id === selectedWarehouse)?.description || warehouses.find(w => w.id === selectedWarehouse)?.description}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={onSelectAllWarehouses}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
              >
                Seleziona tutti
              </button>
              <button
                onClick={onDeselectAllWarehouses}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
              >
                Deseleziona tutti
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {warehouses
              .filter(warehouse => warehouse.id !== selectedWarehouse)
              .map((warehouse) => (
                <div
                  key={warehouse.id}
                  onClick={() => onSourceWarehouseToggle(warehouse.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedSourceWarehouses.includes(warehouse.id)
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {warehouse.description}
                      </h4>
                      <div className="text-xs text-gray-500 mt-1">
                        {warehouse.article_count} tipologie • {warehouse.total_stock_quantity.toLocaleString()} pz
                      </div>
                    </div>
                    <div className="ml-2">
                      {selectedSourceWarehouses.includes(warehouse.id) ? (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Colonna 2: Articoli Disponibili */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Articoli Disponibili</h3>
              <div className="flex items-center gap-2">
                {transferArticlesLoading && (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                )}
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {transferSourceArticles.length} visibili
                </span>
              </div>
            </div>
            
            {/* Campo di ricerca */}
            {selectedSourceWarehouses.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Cerca articoli per codice o descrizione..."
                  value={transferSearchTerm}
                  onChange={(e) => onTransferSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-sm"
                />
              </div>
            )}
            
            {/* Info paginazione */}
            {selectedSourceWarehouses.length > 0 && transferSourceArticles.length > 0 && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  Pagina {transferArticlesCurrentPage} di {transferArticlesTotalPages}
                </span>
                <span>
                  {transferSourceArticles.length} di {transferArticlesTotalPages * transferArticlesPerPage} articoli
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {selectedSourceWarehouses.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Seleziona almeno un magazzino</p>
                  <p className="text-sm">Scegli i magazzini sorgente dalla colonna di sinistra</p>
                </div>
              </div>
            ) : transferArticlesLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Caricamento articoli...</p>
                </div>
              </div>
            ) : transferSourceArticles.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Nessun articolo disponibile</p>
                  <p className="text-sm">I magazzini selezionati non hanno articoli con stock &gt; 0</p>
                </div>
              </div>
            ) : (
              <>
                {/* Articoli raggruppati per magazzino */}
                {Object.entries(getArticlesByWarehouse()).map(([warehouseId, { warehouse, articles }]) => (
                  <div key={warehouseId} className="border-b border-gray-300">
                    {/* Header Magazzino */}
                    <div className="sticky top-0 bg-blue-50 border-b border-blue-200 px-4 py-3 z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <h4 className="font-semibold text-blue-900">
                            📦 {warehouse.description}
                          </h4>
                        </div>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          {articles.length} articoli
                        </span>
                      </div>
                    </div>
                    
                    {/* Lista Articoli per questo magazzino */}
                    <div className="divide-y divide-gray-200">
                      {articles.map((article) => (
                        <div key={`${warehouseId}-${article.id}`} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">
                                  {article.id}
                                </p>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                 getWarehouseSpecificStock(article) > 10 ? 'bg-green-100 text-green-700' :
                                 getWarehouseSpecificStock(article) > 0 ? 'bg-orange-100 text-orange-700' :
                                 'bg-red-100 text-red-700'
                               }`}>
                                 {getWarehouseSpecificStock(article)} pz
                               </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {article.short_description}
                              </p>
                              <div className="flex items-center gap-2">
                                {article.family_label && (
                                  <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                    {article.family_label}
                                  </span>
                                )}
                                {article.brand_label && (
                                  <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
                                    {article.brand_label}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => onAddTransferArticle(article)}
                              disabled={transferArticles.some(item => item.articleId === article.id) || getWarehouseSpecificStock(article) <= 0}
                              className="ml-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <Plus size={16} />
                              Aggiungi
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                  </div>
                ))}

              </>
            )}
            
            {/* Pulsante globale "Carica Altri" alla fine di tutti i raggruppamenti */}
            {transferHasMore && transferSourceArticles.length > 0 && (
              <div className="p-6 bg-gray-50 border-t border-gray-300 text-center">
                <button
                  onClick={onLoadMoreArticles}
                  disabled={transferArticlesLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg text-base font-medium transition-colors flex items-center gap-3 mx-auto"
                >
                  {transferArticlesLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Caricamento altri articoli...
                    </>
                  ) : (
                    <>
                      <ChevronDown size={20} />
                      Carica Altri {transferArticlesPerPage} Articoli
                    </>
                  )}
                </button>
                <div className="mt-3 text-sm text-gray-600">
                  Pagina {transferArticlesCurrentPage} di {transferArticlesTotalPages} • 
                  {transferSourceArticles.length} articoli visualizzati
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Colonna 3: Articoli Selezionati */}
        <div className="w-96 bg-blue-50 border-l border-blue-200 flex flex-col">
          <div className="p-4 border-b border-blue-200 bg-blue-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Carrello</h3>
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                {transferArticles.length} articol{transferArticles.length === 1 ? 'o' : 'i'}
              </span>
            </div>
          </div>
          
          {/* Note */}
          <div className="p-4 border-b border-blue-200 bg-white">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note trasferimento
            </label>
            <textarea
              rows={2}
              value={transferNotes}
              onChange={(e) => onTransferNotesChange(e.target.value)}
              placeholder="Note opzionali per il trasferimento..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {transferArticles.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <ArrowLeft className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Nessun articolo nel carrello</p>
                  <p className="text-sm">Aggiungi articoli dalla colonna centrale</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-blue-200">
                {transferArticles.map((item) => (
                  <div key={item.articleId} className="p-4 bg-white mx-2 my-2 rounded-lg border border-blue-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {item.articleCode}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {item.articleDescription}
                        </p>
                        {/* Mostra magazzino di provenienza */}
                        {item.sourceWarehouseDescription && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
                              📦 {item.sourceWarehouseDescription}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => onRemoveTransferArticle(item.articleId)}
                        className="text-red-600 hover:text-red-800 p-1 rounded ml-2"
                        title="Rimuovi dal carrello"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-700 font-medium">Quantità:</label>
                        <input
                          type="number"
                          min="1"
                          max={item.availableQuantity}
                          value={item.transferQuantity}
                          onChange={(e) => onUpdateTransferQuantity(item.articleId, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Disponibili: {item.availableQuantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pulsanti CTA nel carrello */}
          <div className="border-t border-blue-200 p-4 bg-blue-100 space-y-3">
            {transferArticles.length > 0 && (
              <div className="text-sm text-gray-600 text-center">
                {transferArticles.length} articol{transferArticles.length === 1 ? 'o' : 'i'} • 
                {transferArticles.reduce((sum, item) => sum + item.transferQuantity, 0)} pezzi totali
              </div>
            )}
            <div className="space-y-2">
              <button
                onClick={handleSubmit}
                disabled={insertLoading || selectedSourceWarehouses.length === 0 || transferArticles.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
              >
                {insertLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Caricamento...
                  </>
                ) : (
                  <>
                    <ArrowLeft size={18} />
                    Carica
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg bg-white"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
