'use client';

import React from 'react';
import { X, Search } from 'lucide-react';
import type { ConnectedArticle, AssistanceInterventionDetail } from '../../../../../types/assistance-interventions';
import type { SelectedArticle } from './types';

interface ArticleSelectorDialogProps {
  itemId: string;
  interventionData: AssistanceInterventionDetail | null;
  articleSearchQuery: string;
  setArticleSearchQuery: (query: string) => void;
  articleResults: ConnectedArticle[];
  isSearching: boolean;
  onSearch: (query: string) => void;
  onSelect: (article: ConnectedArticle) => void;
  onClose: () => void;
  selectedArticles: SelectedArticle[];
}

export default function ArticleSelectorDialog({
  interventionData,
  articleSearchQuery,
  setArticleSearchQuery,
  articleResults,
  isSearching,
  onSearch,
  onSelect,
  onClose,
  selectedArticles
}: ArticleSelectorDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 md:p-6 max-w-3xl md:max-w-4xl w-full mx-4 h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Seleziona pezzi di ricambio</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Ricambi già associati all'intervento */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Ricambi già associati all&apos;intervento</label>
            <span className="text-xs text-gray-500">Quantità preventivate</span>
          </div>
          <div className="border rounded-lg max-h-56 overflow-y-auto">
            {(interventionData?.connected_articles || []).length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">Nessun ricambio associato</div>
            ) : (
              (interventionData?.connected_articles || [])
                .filter(article => !selectedArticles.some(sel => sel.article.id === article.id))
                .map((article) => (
                  <div
                    key={article.id}
                    onClick={() => onSelect(article)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-gray-700"
                  >
                    <div className="font-medium text-gray-700">{article.short_description}</div>
                    <div className="text-sm text-gray-500">PNC: {article.pnc_code} | Prev: {article.quantity} | <span className="text-gray-600 ml-1">ID: {article.id}</span></div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Ricerca ricambi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cerca altri ricambi</label>
          <div className="relative">
            <input
              type="text"
              value={articleSearchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setArticleSearchQuery(value);
                onSearch(value);
              }}
              placeholder="Cerca ricambi..."
              className="w-full px-3 py-2 pr-10 border rounded-lg text-gray-700"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            {isSearching && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2 w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
          {articleResults.length > 0 && (
            <div className="mt-2 border rounded-lg max-h-96 overflow-y-auto">
              {articleResults.map(art => (
                <div
                  key={art.id}
                  onClick={() => onSelect(art)}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-gray-700"
                >
                  <div className="font-medium text-gray-700">{art.short_description}</div>
                  <div className="text-sm text-gray-500">PNC: {art.pnc_code} | <span className="text-gray-600 ml-1">ID: {art.id}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

