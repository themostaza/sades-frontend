'use client';

import React from 'react';
import { X, Search, Eye, Download, Trash2 } from 'lucide-react';
import Image from 'next/image';
import S3ImageUploader from '@/components/S3ImageUploader';
import type { EditableEquipmentItem } from './types';

interface EquipmentItemEditableProps {
  item: EditableEquipmentItem;
  index: number;
  equipmentSearchQueries: { [itemId: string]: string };
  articleSearchQueries: { [itemId: string]: string };
  onOpenEquipmentDialog: (itemId: string) => void;
  onOpenArticleDialog: (itemId: string) => void;
  onRemoveEquipment: () => void;
  onUpdateItem: (field: keyof EditableEquipmentItem, value: unknown) => void;
  onRemoveArticle: (articleId: string) => void;
  onUpdateArticleQuantity: (articleId: string, quantity: number) => void;
  onImageUpload: (fileInfo: { cdnUrl?: string; name?: string }) => void;
  onRemoveImage: (imageId: string) => void;
  onToggleServizio: (servizio: string) => void;
  getPlannedArticleQty: (articleId: string) => number;
  shouldShowRecuperoGasFields: () => boolean;
  getTextColorClass: (text: string) => string;
  lightboxUrl: string | null;
  setLightboxUrl: (url: string | null) => void;
  allItems: EditableEquipmentItem[];
}

export default function EquipmentItemEditable({
  item,
  index,
  equipmentSearchQueries,
  articleSearchQueries,
  onOpenEquipmentDialog,
  onOpenArticleDialog,
  onRemoveEquipment,
  onUpdateItem,
  onRemoveArticle,
  onUpdateArticleQuantity,
  onImageUpload,
  onRemoveImage,
  onToggleServizio,
  getPlannedArticleQty,
  shouldShowRecuperoGasFields,
  getTextColorClass,
  setLightboxUrl,
  allItems
}: EquipmentItemEditableProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
      {/* Apparecchiatura interessata - selezione via dialog */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Apparecchiatura interessata
        </label>
        <div className="relative">
          <input
            type="text"
            value={equipmentSearchQueries[item.id] || ''}
            onChange={() => {}}
            onClick={() => onOpenEquipmentDialog(item.id)}
            placeholder="Cerca apparecchiatura..."
            readOnly
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700 cursor-pointer"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        </div>

        {item.selectedEquipment && (
          <div className="mt-2 flex items-center justify-between bg-gray-100 p-3 rounded-lg">
            <div>
              <div className="font-medium text-gray-700">{item.selectedEquipment.description}</div>
              <div className="text-sm text-gray-500">Modello: {item.selectedEquipment.model} | S/N: {item.selectedEquipment.serial_number} | PNC: {item.selectedEquipment.pnc_code || 'N/A'} | Data vendita: {item.selectedEquipment.sale_date ? new Date(item.selectedEquipment.sale_date).toLocaleDateString('it-IT') : 'N/A'} | ID: {item.selectedEquipment.id}</div>
            </div>
            <button
              onClick={() => onUpdateItem('selectedEquipment', null)}
              className="text-red-500"
              title="Rimuovi apparecchiatura"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Pezzi di ricambio - selezione via dialog */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pezzi di ricambio usati
        </label>
        <div className="relative">
          <input
            type="text"
            value={articleSearchQueries[item.id] || ''}
            onChange={() => {}}
            onClick={() => onOpenArticleDialog(item.id)}
            placeholder="Cerca o scegli tra i ricambi preventivati..."
            readOnly
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700 cursor-pointer"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        </div>

        {/* Lista ricambi selezionati con quantità e info preventivo */}
        {item.selectedArticles.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-sm font-medium text-gray-700">Ricambi selezionati:</div>
            {item.selectedArticles.map((selectedArticle) => {
              const planned = getPlannedArticleQty(selectedArticle.article.id);
              const currentTotal = allItems.reduce((sum, it) => sum + (it.selectedArticles.find(sa => sa.article.id === selectedArticle.article.id)?.quantity || 0), 0);
              const diff = Math.max(0, currentTotal - planned);
              return (
                <div key={selectedArticle.article.id} className="flex items-center justify-between bg-teal-50 border border-teal-200 p-3 rounded-lg">
                  <div className="flex-1">
                    <span className="text-gray-900 font-medium">{selectedArticle.article.short_description}</span>
                    <div className="text-sm text-gray-600">{selectedArticle.article.description}</div>
                    <div className="text-xs text-gray-500 mt-1">PNC: {selectedArticle.article.pnc_code || 'N/A'} | ID: {selectedArticle.article.id}</div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Qt:</label>
                      <input
                        type="number"
                        value={selectedArticle.quantity}
                        onChange={(e) => onUpdateArticleQuantity(selectedArticle.article.id, parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-gray-700 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div className="text-xs text-gray-600 whitespace-nowrap">Prev: {planned}</div>
                    {diff > 0 && (
                      <div className="text-xs text-yellow-700 whitespace-nowrap">+{diff} oltre prev.</div>
                    )}
                    <button
                      onClick={() => onRemoveArticle(selectedArticle.article.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                      title="Rimuovi ricambio"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {index > 0 && (
        <div className="mb-4">
          <button
            onClick={onRemoveEquipment}
            className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm transition-colors"
          >
            Rimuovi apparecchiatura
          </button>
        </div>
      )}

      {/* Note per questa apparecchiatura */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Note intervento per questa apparecchiatura
        </label>
        <textarea
          value={item.notes}
          onChange={(e) => onUpdateItem('notes', e.target.value)}
          rows={3}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none ${getTextColorClass(item.notes)}`}
          placeholder="*Note che saranno leggibili dal cliente"
        />
      </div>

      {/* Gestione gas per questa apparecchiatura */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900">Gestione gas per questa apparecchiatura</h4>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={item.hasGas}
              onChange={(e) => onUpdateItem('hasGas', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>
        
        {item.hasGas && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipologia compressore
                </label>
                <select
                  value={item.tipologiaCompressore}
                  onChange={(e) => onUpdateItem('tipologiaCompressore', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                >
                  <option value="">Seleziona tipologia</option>
                  <option value="ermetico">Ermetico</option>
                  <option value="semiermetico">Semiermetico</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nuova installazione
                </label>
                <select
                  value={item.nuovaInstallazione}
                  onChange={(e) => onUpdateItem('nuovaInstallazione', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                >
                  <option value="">Seleziona opzione</option>
                  <option value="Sì">Sì</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipologia gas caricato
                </label>
                <select
                  value={item.tipologiaGasCaricato}
                  onChange={(e) => onUpdateItem('tipologiaGasCaricato', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                >
                  <option value="">Seleziona gas</option>
                  <option value="R404A">R404A</option>
                  <option value="R134A">R134A</option>
                  <option value="R422A">R422A (BASSA) vedi R427A</option>
                  <option value="R422D">R422D (ALTA)</option>
                  <option value="R452A">R452A</option>
                  <option value="R437A">R437A</option>
                  <option value="R290">R290</option>
                  <option value="R427A">R427A</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantità gas caricato
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={item.quantitaGasCaricato}
                    onChange={(e) => onUpdateItem('quantitaGasCaricato', e.target.value)}
                    className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${getTextColorClass(item.quantitaGasCaricato)}`}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">gr</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Carica max
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={item.caricaMax}
                    onChange={(e) => onUpdateItem('caricaMax', e.target.value)}
                    className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${getTextColorClass(item.caricaMax)}`}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">gr</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modello compressore
                </label>
                <input
                  type="text"
                  value={item.modelloCompressore}
                  onChange={(e) => onUpdateItem('modelloCompressore', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${getTextColorClass(item.modelloCompressore)}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Matricola compressore
                </label>
                <input
                  type="text"
                  value={item.matricolaCompressore}
                  onChange={(e) => onUpdateItem('matricolaCompressore', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${getTextColorClass(item.matricolaCompressore)}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numero univoco
                </label>
                <input
                  type="text"
                  value={item.numeroUnivoco}
                  onChange={(e) => onUpdateItem('numeroUnivoco', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${getTextColorClass(item.numeroUnivoco)}`}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Servizi aggiuntivi
              </label>
              <div className="space-y-2">
                {[
                  'Ricerca perdite',
                  'Smaltimento compressore',
                  'Smaltimento gas',
                  'Smantellamento',
                  'Recupero gas'
                ].map((servizio) => (
                  <label key={servizio} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={item.serviziAggiuntivi.includes(servizio)}
                      onChange={() => onToggleServizio(servizio)}
                      className="rounded border-gray-300 text-teal-600 shadow-sm focus:border-teal-500 focus:ring focus:ring-teal-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">{servizio}</span>
                  </label>
                ))}
              </div>
              {item.serviziAggiuntivi.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">Nessun servizio aggiuntivo selezionato</p>
              )}
            </div>
            
            {/* Campi recupero gas: visibili solo se NON è selezionato 'Ricerca perdite' */}
            {shouldShowRecuperoGasFields() && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipologia gas recuperato
                  </label>
                  <select
                    value={item.tipologiaGasRecuperato}
                    onChange={(e) => onUpdateItem('tipologiaGasRecuperato', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                  >
                    <option value="">Seleziona gas</option>
                    <option value="R404A">R404A</option>
                    <option value="R134A">R134A</option>
                    <option value="R422A">R422A (BASSA) vedi R427A</option>
                    <option value="R422D">R422D (ALTA)</option>
                    <option value="R452A">R452A</option>
                    <option value="R437A">R437A</option>
                    <option value="R290">R290</option>
                    <option value="R427A">R427A</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantità gas recuperato
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={item.quantitaGasRecuperato}
                      onChange={(e) => onUpdateItem('quantitaGasRecuperato', e.target.value)}
                      className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${getTextColorClass(item.quantitaGasRecuperato)}`}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">gr</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Immagini per questa apparecchiatura */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900">Immagini per questa apparecchiatura</h4>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={item.hasImages}
              onChange={(e) => onUpdateItem('hasImages', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>
        
        {item.hasImages && (
          <>
            {/* Griglia delle immagini caricate */}
            {item.images.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {item.images.map((image) => (
                  <div key={image.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                    {/* Preview dell'immagine */}
                    <div className="mb-3">
                      <Image 
                        src={image.url} 
                        alt={image.name}
                        width={200}
                        height={150}
                        className="w-full h-32 object-cover rounded-lg bg-gray-100 cursor-zoom-in"
                        onClick={() => setLightboxUrl(image.url)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600 truncate" title={image.name}>
                        {image.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {image.uploadDate}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button 
                            className="text-blue-600 hover:text-blue-700 p-1"
                            onClick={() => window.open(image.url, '_blank')}
                            title="Visualizza immagine"
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            className="text-green-600 hover:text-green-700 p-1"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = image.url;
                              link.download = image.name;
                              link.click();
                            }}
                            title="Scarica immagine"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                        <button
                          onClick={() => onRemoveImage(image.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                          title="Rimuovi immagine"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Uploader per aggiungere nuove immagini */}
            <div>
              <S3ImageUploader
                onUploadSuccess={(fileInfo: { cdnUrl: string; name: string }) => 
                  onImageUpload({ cdnUrl: fileInfo.cdnUrl, name: fileInfo.name })
                }
                onUploadFailed={(error: Error) => {
                  console.error('Error uploading equipment image:', error);
                  alert('Errore durante il caricamento dell\'immagine dell\'apparecchiatura');
                }}
                multiple={true}
                folder="intervention-report-images"
              />
            </div>
            
            {item.images.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                Nessuna immagine caricata per questa apparecchiatura
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

