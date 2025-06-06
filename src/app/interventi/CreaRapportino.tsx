'use client';

import React, { useState } from 'react';
import { ArrowLeft, Clock, Upload, X, Plus } from 'lucide-react';
import { AssistanceInterventionDetail, ConnectedArticle, ConnectedEquipment } from '../../types/assistance-interventions';

interface CreaRapportinoProps {
  isOpen: boolean;
  onClose: () => void;
  interventionData: AssistanceInterventionDetail;
}

interface SelectedArticle {
  article: ConnectedArticle;
  quantity: number;
}

interface EquipmentItem {
  id: string;
  // Equipment and articles
  selectedEquipment: ConnectedEquipment | null;
  selectedArticles: SelectedArticle[];
  notes: string;
  
  // Gas management for this equipment
  hasGas: boolean;
  tipologiaCompressore: string;
  nuovaInstallazione: string;
  tipologiaGasCaricato: string;
  quantitaGasCaricato: string;
  caricaMax: string;
  modelloCompressore: string;
  matricolaCompressore: string;
  numeroUnivoco: string;
  serviziAggiuntivi: string;
  tipologiaGasRecuperato: string;
  quantitaGasRecuperato: string;
  
  // Images for this equipment
  images: AttachedFile[];
}

interface AttachedFile {
  id: string;
  name: string;
  uploadDate: string;
}

export default function CreaRapportino({ isOpen, onClose, interventionData }: CreaRapportinoProps) {
  // Stati per ore di lavoro - ora sono number
  const [oreLavoro, setOreLavoro] = useState<number>(4);
  const [oreViaggio, setOreViaggio] = useState<number>(2);
  
  // Stati per note intervento cliente
  const [noteCliente, setNoteCliente] = useState('*Notes about the repair that the client will read*');
  
  // Stati per gli items (ogni item = 1 apparecchiatura con tutto il resto)
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([
    {
      id: '1',
      selectedEquipment: null,
      selectedArticles: [],
      notes: '*notes about reparing this machine*',
      hasGas: false,
      tipologiaCompressore: 'Ermetico',
      nuovaInstallazione: 'Sì',
      tipologiaGasCaricato: 'R404A',
      quantitaGasCaricato: '12',
      caricaMax: '120',
      modelloCompressore: '123123414',
      matricolaCompressore: '123123414',
      numeroUnivoco: '123123414',
      serviziAggiuntivi: 'Nessuno',
      tipologiaGasRecuperato: 'R404A',
      quantitaGasRecuperato: '12',
      images: []
    }
  ]);
  
  // Stati per intervento non riuscito (globali)
  const [interventoNonRiuscito, setInterventoNonRiuscito] = useState(false);
  const [motivoNonRiuscito, setMotivoNonRiuscito] = useState('');
  
  // Stati per nuova richiesta intervento (globali)
  const [creaNuovaRichiesta, setCreaNuovaRichiesta] = useState(false);
  const [risoltoNellImmediato, setRisoltoNellImmediato] = useState('Sì');
  const [apparecchiaturaInteressata, setApparecchiaturaInteressata] = useState('*Codice e Nome macchin..*');
  const [pezziRicambio, setPezziRicambio] = useState('*Codice e Nome ricambio*...');
  const [noteNuovaRichiesta, setNoteNuovaRichiesta] = useState('*notes*');

  // Funzione helper per determinare se un testo è un placeholder
  const isPlaceholderText = (text: string): boolean => {
    return text.startsWith('*') || text.includes('*') || text === '';
  };

  // Funzione helper per ottenere la classe CSS del testo
  const getTextColorClass = (text: string): string => {
    return isPlaceholderText(text) ? 'text-gray-500' : 'text-gray-700';
  };

  // Funzione per aggiungere un nuovo item (apparecchiatura completa)
  const addEquipmentItem = () => {
    const newItem: EquipmentItem = {
      id: Date.now().toString(),
      selectedEquipment: null,
      selectedArticles: [],
      notes: '',
      hasGas: false,
      tipologiaCompressore: 'Ermetico',
      nuovaInstallazione: 'Sì',
      tipologiaGasCaricato: 'R404A',
      quantitaGasCaricato: '12',
      caricaMax: '120',
      modelloCompressore: '',
      matricolaCompressore: '',
      numeroUnivoco: '',
      serviziAggiuntivi: 'Nessuno',
      tipologiaGasRecuperato: 'R404A',
      quantitaGasRecuperato: '12',
      images: []
    };
    setEquipmentItems([...equipmentItems, newItem]);
  };

  // Funzione per rimuovere un item
  const removeEquipmentItem = (id: string) => {
    setEquipmentItems(equipmentItems.filter(item => item.id !== id));
  };

  // Funzione per aggiornare un item
  const updateEquipmentItem = (id: string, field: keyof EquipmentItem, value: unknown) => {
    setEquipmentItems(equipmentItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Funzione per rimuovere un articolo da un equipment item
  const removeArticleFromItem = (itemId: string, articleId: string) => {
    const item = equipmentItems.find(item => item.id === itemId)!;
    updateEquipmentItem(itemId, 'selectedArticles', 
      item.selectedArticles.filter(art => art.article.id !== articleId)
    );
  };

  // Funzione per aggiornare la quantità di un articolo
  const updateArticleQuantity = (itemId: string, articleId: string, quantity: number) => {
    const item = equipmentItems.find(item => item.id === itemId)!;
    updateEquipmentItem(itemId, 'selectedArticles',
      item.selectedArticles.map(art => 
        art.article.id === articleId ? { ...art, quantity } : art
      )
    );
  };

  // Funzione per gestire il submit
  const handleSubmit = () => {
    // Preparazione dati per l'API secondo la struttura richiesta
    const apiPayload = {
      work_hours: oreLavoro,
      travel_hours: oreViaggio,
      customer_notes: noteCliente,
      is_failed: interventoNonRiuscito,
      failure_reason: motivoNonRiuscito || null,
      status: "DRAFT", // Inizialmente sempre DRAFT
      items: equipmentItems.map(item => ({
        intervention_equipment_id: item.selectedEquipment?.id || 0,
        note: item.notes,
        fl_gas: item.hasGas,
        gas_compressor_types_id: 0, // TODO: mappare da tipologiaCompressore
        is_new_installation: item.nuovaInstallazione === 'Sì',
        rechargeable_gas_types_id: 0, // TODO: mappare da tipologiaGasCaricato
        qty_gas_recharged: parseInt(item.quantitaGasCaricato) || 0,
        max_charge: parseInt(item.caricaMax) || 0,
        compressor_model: item.modelloCompressore,
        compressor_model_img_url: "", // TODO: implementare upload immagini
        compressor_serial_num: item.matricolaCompressore,
        compressor_serial_num_img_url: "", // TODO: implementare upload immagini
        compressor_unique_num: item.numeroUnivoco,
        compressor_unique_num_img_url: "", // TODO: implementare upload immagini
        additional_services: item.serviziAggiuntivi,
        recovered_rech_gas_types_id: 0, // TODO: mappare da tipologiaGasRecuperato
        qty_gas_recovered: parseInt(item.quantitaGasRecuperato) || 0,
        images: item.images.map(file => ({
          file_name: file.name,
          file_url: "" // TODO: implementare upload immagini
        })),
        articles: item.selectedArticles.map(article => ({
          article_id: article.article.id,
          quantity: article.quantity
        }))
      }))
    };

    console.log('Payload per API rapportino:', apiPayload);
    // Qui sarà implementata la chiamata API
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-teal-600 text-white px-4 md:px-6 py-4">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <button 
            onClick={onClose}
            className="flex items-center text-white hover:text-gray-200 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg md:text-xl">
            Compila il rapporto di {interventionData.company_name}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 pb-8">
        {/* Bottone Conferma e procedi */}
        <div className="mb-6">
          <button
            onClick={handleSubmit}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Conferma e procedi
          </button>
        </div>

        {/* Ore di lavoro e viaggio */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ore di lavoro
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="number"
                  value={oreLavoro}
                  onChange={(e) => setOreLavoro(parseInt(e.target.value) || 0)}
                  min="0"
                  step="0.5"
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700`}
                  placeholder="4"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ore di viaggio
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="number"
                  value={oreViaggio}
                  onChange={(e) => setOreViaggio(parseInt(e.target.value) || 0)}
                  min="0"
                  step="0.5"
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700`}
                  placeholder="2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Note intervento per cliente */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Note intervento per cliente
          </label>
          <textarea
            value={noteCliente}
            onChange={(e) => setNoteCliente(e.target.value)}
            rows={4}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none ${getTextColorClass(noteCliente)}`}
            placeholder="*Notes about the repair that the client will read*"
          />
        </div>

        {/* Apparecchiature e pezzi di ricambio */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Apparecchiature e pezzi di ricambio
          </h3>
          
          {equipmentItems.map((item, index) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4 mb-4 last:mb-0">
              {/* Apparecchiatura interessata - larghezza piena */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Apparecchiatura interessata
                </label>
                <select
                  value={item.selectedEquipment?.id || ''}
                  onChange={(e) => {
                    const selectedEquip = interventionData.connected_equipment?.find(eq => eq.id === parseInt(e.target.value));
                    updateEquipmentItem(item.id, 'selectedEquipment', selectedEquip || null);
                  }}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${item.selectedEquipment ? 'text-gray-700' : 'text-gray-500'}`}
                >
                  <option value="">Seleziona un&apos;apparecchiatura</option>
                  {interventionData.connected_equipment?.map((equipment) => (
                    <option key={equipment.id} value={equipment.id.toString()}>
                      {equipment.model} - {equipment.description} (S/N: {equipment.serial_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pezzi di ricambio a larghezza piena */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pezzi di ricambio usati
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value === "") return;
                    
                    const selectedArticle = interventionData.connected_articles?.find(art => art.id === e.target.value);
                    if (selectedArticle) {
                      const newSelectedArticles = [...item.selectedArticles, { article: selectedArticle, quantity: 1 }];
                      updateEquipmentItem(item.id, 'selectedArticles', newSelectedArticles);
                    }
                    
                    e.target.value = "";
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-500"
                >
                  <option value="">Aggiungi un ricambio</option>
                  {interventionData.connected_articles && interventionData.connected_articles.length > 0 ? (
                    interventionData.connected_articles
                      .filter(article => !item.selectedArticles.some(selected => selected.article.id === article.id))
                      .map((article) => (
                        <option key={article.id} value={article.id}>
                          {article.short_description} - {article.description}
                        </option>
                      ))
                  ) : (
                    <option value="" disabled>Nessun ricambio disponibile</option>
                  )}
                </select>
                
                {/* Lista ricambi selezionati con quantità integrate */}
                {item.selectedArticles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm font-medium text-gray-700">Ricambi selezionati:</div>
                    {item.selectedArticles.map((selectedArticle) => (
                      <div key={selectedArticle.article.id} className="flex items-center justify-between bg-teal-50 border border-teal-200 p-3 rounded-lg">
                        <div className="flex-1">
                          <span className="text-gray-900 font-medium">{selectedArticle.article.short_description}</span>
                          <div className="text-sm text-gray-600">{selectedArticle.article.description}</div>
                        </div>
                        <div className="flex items-center gap-3 ml-3">
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Qt:</label>
                            <input
                              type="number"
                              value={selectedArticle.quantity}
                              onChange={(e) => updateArticleQuantity(item.id, selectedArticle.article.id, parseInt(e.target.value) || 1)}
                              min="1"
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-gray-700 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                          </div>
                          <button
                            onClick={() => removeArticleFromItem(item.id, selectedArticle.article.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                            title="Rimuovi ricambio"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {index > 0 && (
                <div className="mb-4">
                  <button
                    onClick={() => removeEquipmentItem(item.id)}
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
                  onChange={(e) => updateEquipmentItem(item.id, 'notes', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none ${getTextColorClass(item.notes)}`}
                  placeholder="*notes about reparing this machine*"
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
                      onChange={(e) => updateEquipmentItem(item.id, 'hasGas', e.target.checked)}
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
                          onChange={(e) => updateEquipmentItem(item.id, 'tipologiaCompressore', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                        >
                          <option value="Ermetico">Ermetico</option>
                          <option value="Semi-ermetico">Semi-ermetico</option>
                          <option value="Aperto">Aperto</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nuova installazione
                        </label>
                        <select
                          value={item.nuovaInstallazione}
                          onChange={(e) => updateEquipmentItem(item.id, 'nuovaInstallazione', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                        >
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
                          onChange={(e) => updateEquipmentItem(item.id, 'tipologiaGasCaricato', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                        >
                          <option value="R404A">R404A</option>
                          <option value="R134A">R134A</option>
                          <option value="R507A">R507A</option>
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
                            onChange={(e) => updateEquipmentItem(item.id, 'quantitaGasCaricato', e.target.value)}
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
                            onChange={(e) => updateEquipmentItem(item.id, 'caricaMax', e.target.value)}
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
                          onChange={(e) => updateEquipmentItem(item.id, 'modelloCompressore', e.target.value)}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${getTextColorClass(item.modelloCompressore)}`}
                        />
                        <button className="text-teal-600 hover:text-teal-700 text-sm mt-1 transition-colors">
                          Carica foto
                        </button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Matricola compressore
                        </label>
                        <input
                          type="text"
                          value={item.matricolaCompressore}
                          onChange={(e) => updateEquipmentItem(item.id, 'matricolaCompressore', e.target.value)}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${getTextColorClass(item.matricolaCompressore)}`}
                        />
                        <button className="text-teal-600 hover:text-teal-700 text-sm mt-1 transition-colors">
                          Carica foto
                        </button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Numero univoco
                        </label>
                        <input
                          type="text"
                          value={item.numeroUnivoco}
                          onChange={(e) => updateEquipmentItem(item.id, 'numeroUnivoco', e.target.value)}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${getTextColorClass(item.numeroUnivoco)}`}
                        />
                        <button className="text-teal-600 hover:text-teal-700 text-sm mt-1 transition-colors">
                          Carica foto
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Servizi aggiuntivi
                      </label>
                      <select
                        value={item.serviziAggiuntivi}
                        onChange={(e) => updateEquipmentItem(item.id, 'serviziAggiuntivi', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                      >
                        <option value="Nessuno">Nessuno</option>
                        <option value="Pulizia">Pulizia</option>
                        <option value="Manutenzione">Manutenzione</option>
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tipologia gas recuperato
                        </label>
                        <select
                          value={item.tipologiaGasRecuperato}
                          onChange={(e) => updateEquipmentItem(item.id, 'tipologiaGasRecuperato', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                        >
                          <option value="R404A">R404A</option>
                          <option value="R134A">R134A</option>
                          <option value="R507A">R507A</option>
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
                            onChange={(e) => updateEquipmentItem(item.id, 'quantitaGasRecuperato', e.target.value)}
                            className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${getTextColorClass(item.quantitaGasRecuperato)}`}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">gr</span>
                        </div>
                      </div>
                    </div>
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
                      checked={item.images.length > 0}
                      onChange={(e) => updateEquipmentItem(item.id, 'images', e.target.checked ? [
                        { id: Date.now().toString(), name: 'img_1.png', uploadDate: '01/10/2024' },
                        { id: (Date.now() + 1).toString(), name: 'img_2.png', uploadDate: '01/10/2024' }
                      ] : [])}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
                
                {item.images.length > 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm font-medium text-gray-700 border-b pb-2">
                        <span>File</span>
                        <span>Data di caricamento</span>
                      </div>
                      {item.images.map((file) => (
                        <div key={file.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <span className="text-sm text-gray-900">{file.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">{file.uploadDate}</span>
                            <button
                              onClick={() => updateEquipmentItem(item.id, 'images', item.images.filter(img => img.id !== file.id))}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <button className="bg-teal-100 hover:bg-teal-200 text-teal-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                      <Upload size={16} />
                      Aggiungi immagine
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          <button
            onClick={addEquipmentItem}
            className="bg-teal-100 hover:bg-teal-200 text-teal-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors mb-6"
          >
            <Plus size={16} />
            Aggiungi apparecchiatura
          </button>
        </div>

        {/* Intervento non riuscito - Sezione globale */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Intervento non riuscito</h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={interventoNonRiuscito}
                onChange={(e) => setInterventoNonRiuscito(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
          
          {interventoNonRiuscito && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scegli un motivo
              </label>
              <select
                value={motivoNonRiuscito}
                onChange={(e) => setMotivoNonRiuscito(e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${motivoNonRiuscito ? 'text-gray-700' : 'text-gray-500'}`}
              >
                <option value="">Seleziona un motivo</option>
                <option value="cliente_assente">1. Cliente assente</option>
                <option value="materiale_mancante">2. Materiale mancante</option>
                <option value="materiale_dimenticato">3. Materiale dimenticato</option>
                <option value="mancanza_di_tempo">4. Mancanza di tempo</option>
                <option value="subentrata_urgenza">5. Subentrata urgenza</option>
                <option value="ricambio_mancante">6. Ricambio mancante</option>
                <option value="ricambio_avariato">7. Ricambio avariato</option>
                <option value="informazioni_mancanti">8. Informazioni mancanti da casa madre</option>
                <option value="intervento_senza_soluzioni">9. Intervento senza soluzioni</option>
              </select>
            </div>
          )}
        </div>

        {/* Crea nuova richiesta intervento */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Crea nuova richiesta intervento</h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={creaNuovaRichiesta}
                onChange={(e) => setCreaNuovaRichiesta(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
          
          {creaNuovaRichiesta && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Risolto nell immediato
                </label>
                <select
                  value={risoltoNellImmediato}
                  onChange={(e) => setRisoltoNellImmediato(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                >
                  <option value="Sì">Sì</option>
                  <option value="No">No</option>
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apparecchiatura interessata
                  </label>
                  <input
                    type="text"
                    value={apparecchiaturaInteressata}
                    onChange={(e) => setApparecchiaturaInteressata(e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${getTextColorClass(apparecchiaturaInteressata)}`}
                    placeholder="*Codice e Nome macchin..*"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pezzi di ricambio
                  </label>
                  <input
                    type="text"
                    value={pezziRicambio}
                    onChange={(e) => setPezziRicambio(e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${getTextColorClass(pezziRicambio)}`}
                    placeholder="*Codice e Nome ricambio*..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note intervento
                </label>
                <textarea
                  value={noteNuovaRichiesta}
                  onChange={(e) => setNoteNuovaRichiesta(e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none ${getTextColorClass(noteNuovaRichiesta)}`}
                  placeholder="*notes*"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="bg-gray-50 border-t border-gray-200 -mx-4 md:-mx-6 px-4 md:px-6 py-4">
          <button
            onClick={handleSubmit}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Conferma e invia rapportino
          </button>
        </div>
      </div>
    </div>
  );
} 