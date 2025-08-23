'use client';

import React from 'react';
import { MapPin, Search, ArrowRight, ArrowLeft, Loader2, Filter } from 'lucide-react';
import { ArticleListItem, PlaceType, ArticlePlace } from '../types/article';

interface Warehouse {
  id: string;
  description: string;
  article_count: number;
  total_stock_quantity: number;
  total_reserved_quantity: number;
  total_ordered_quantity: number;
  total_all_quantities: number;
}

interface ArticleFilters {
  searchTerm: string;
  stock: string;
  placeType: string;
  place: string;
}

interface DettaglioMagazzinoProps {
  selectedWarehouse: string;
  warehouses: Warehouse[];
  filteredWarehouses: Warehouse[];
  
  // Gestione articoli
  warehouseArticles: ArticleListItem[];
  articlesLoading: boolean;
  loadingMoreArticles: boolean;
  articlesError: string | null;
  articlesCurrentPage: number;
  articlesTotalPages: number;
  onFetchWarehouseArticles: (warehouseId: string, page: number, append: boolean) => void;
  
  // Filtri articoli
  articleFilters: ArticleFilters;
  onArticleFilterChange: (key: keyof ArticleFilters, value: string) => void;
  onResetArticleFilters: () => void;
  placeTypes: PlaceType[];
  articlePlaces: ArticlePlace[];
  
  // Selezione articoli
  selectedArticles: string[];
  onSelectArticle: (articleId: string, selected: boolean) => void;
  onSelectAllArticles: (selected: boolean) => void;
  onClearArticleSelection: () => void;
  
  // Azioni
  onOpenInsertDialog: () => void;
  //onOpenSendDialog: () => void;
  onArticleClick: (articleId: string) => void;
  onOpenInventoryDialog: (article: ArticleListItem) => void;
  
  // Funzioni helper
  getTotalStock: (article: ArticleListItem) => number;
  getTotalReserved: (article: ArticleListItem) => number;
  formatArticleDate: (dateString: string | null) => string;
  hasDateValue: (dateString: string | null) => boolean;
}

export default function DettaglioMagazzino({
  selectedWarehouse,
  warehouses,
  filteredWarehouses,
  
  warehouseArticles,
  articlesLoading,
  loadingMoreArticles,
  articlesError,
  articlesCurrentPage,
  articlesTotalPages,
  onFetchWarehouseArticles,
  
  articleFilters,
  onArticleFilterChange,
  onResetArticleFilters,
  placeTypes,
  articlePlaces,
  
  selectedArticles,
  onSelectArticle,
  onSelectAllArticles,
  onClearArticleSelection,
  
  onOpenInsertDialog,
  //onOpenSendDialog,
  onArticleClick,
  onOpenInventoryDialog,
  
  getTotalStock,
  getTotalReserved,
  formatArticleDate,
  hasDateValue
}: DettaglioMagazzinoProps) {
  if (!selectedWarehouse) return null;

  const selectedWarehouseData = filteredWarehouses.find(w => w.id === selectedWarehouse) || 
                                warehouses.find(w => w.id === selectedWarehouse);

  return (
    <div id="warehouse-detail-section" className="mt-8 scroll-mt-6">
      <div className="bg-gray-50 rounded-lg p-6 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="text-lg font-medium text-gray-900">
            <span className="font-bold">{selectedWarehouseData?.description}</span>
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenInsertDialog}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Carico
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
              onChange={(e) => onArticleFilterChange('searchTerm', e.target.value)}
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
              onChange={(e) => onArticleFilterChange('stock', e.target.value)}
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
              onChange={(e) => onArticleFilterChange('placeType', e.target.value)}
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
                onChange={(e) => onArticleFilterChange('place', e.target.value)}
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
              onClick={onResetArticleFilters}
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
              visibili {warehouseArticles.length} su {selectedWarehouseData?.article_count || 0} tipologie totali
              {articlesTotalPages > 1 && (
                <span className="text-gray-500 ml-2">
                  (pagina {articlesCurrentPage} di {articlesTotalPages})
                </span>
              )}
            </h4>
            {articlesCurrentPage < articlesTotalPages && (
              <button
                onClick={() => onFetchWarehouseArticles(selectedWarehouse, articlesCurrentPage + 1, true)}
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
                  onClick={onClearArticleSelection}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Deseleziona tutto
                </button>
              </div>
              <button
                //onClick={onOpenSendDialog}
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
              onClick={() => onFetchWarehouseArticles(selectedWarehouse, 1, false)}
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
                    onChange={(e) => onSelectAllArticles(e.target.checked)}
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
                          onSelectArticle(article.id, e.target.checked);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                      onClick={() => onArticleClick(article.id)}
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
                      {(() => {
                        const totalStock = getTotalStock(article);
                        const totalReserved = getTotalReserved(article);
                        const hasStock = totalStock > 0;
                        
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hasStock) onOpenInventoryDialog(article);
                            }}
                            disabled={!hasStock}
                            className={`text-left font-medium transition-colors ${
                              hasStock 
                                ? 'hover:underline cursor-pointer' 
                                : 'cursor-not-allowed'
                            } ${
                              totalStock === 0 
                                ? 'text-red-600' 
                                : totalStock < 10 
                                  ? 'text-orange-600' 
                                  : 'text-green-600'
                            }`}
                            title={hasStock ? 'Clicca per vedere la divisione per magazzini' : 'Nessuno stock disponibile'}
                          >
                            <span>{totalStock}</span>
                            {totalReserved > 0 && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({totalReserved} ris.)
                              </span>
                            )}
                          </button>
                        );
                      })()}
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
              onClick={() => onFetchWarehouseArticles(selectedWarehouse, articlesCurrentPage + 1, true)}
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
  );
}
