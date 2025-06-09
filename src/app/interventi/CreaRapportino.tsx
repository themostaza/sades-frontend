'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Clock, X, Plus, Eye, Download, Trash2, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { AssistanceInterventionDetail, ConnectedArticle, ConnectedEquipment } from '../../types/assistance-interventions';
import { FileUploaderRegular } from "@uploadcare/react-uploader/next";
import "@uploadcare/react-uploader/core.css";
import { InterventionReportSummary } from '../../types/intervention-reports';

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
  serviziAggiuntivi: string[];
  tipologiaGasRecuperato: string;
  quantitaGasRecuperato: string;
  
  // Images for this equipment
  hasImages: boolean;
  images: AttachedFile[];
}

interface AttachedFile {
  id: string;
  name: string;
  uploadDate: string;
  url: string;
}

interface GasCompressorType {
  id: number;
  name: string;
  description?: string;
}

interface RechargeableGasType {
  id: number;
  name: string;
  description?: string;
}

export default function CreaRapportino({ isOpen, onClose, interventionData }: CreaRapportinoProps) {
  const { token } = useAuth();
  
  // Stati per ore di lavoro - ora sono number
  const [oreLavoro, setOreLavoro] = useState<number>(4);
  const [oreViaggio, setOreViaggio] = useState<number>(2);
  
  // Stati per note intervento cliente
  const [noteCliente, setNoteCliente] = useState('');
  
  // Stati per tipi di gas e compressori
  const [gasCompressorTypes, setGasCompressorTypes] = useState<GasCompressorType[]>([]);
  const [rechargeableGasTypes, setRechargeableGasTypes] = useState<RechargeableGasType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  
  // Stati per rapportino esistente
  const [existingReport, setExistingReport] = useState<InterventionReportSummary | null>(null);
  const [isLoadingExistingReport, setIsLoadingExistingReport] = useState(false);
  
  // Stati per gli items (ogni item = 1 apparecchiatura con tutto il resto)
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([
    {
      id: '1',
      selectedEquipment: null,
      selectedArticles: [],
      notes: '',
      hasGas: false,
      tipologiaCompressore: 'ermetico',
      nuovaInstallazione: '',
      tipologiaGasCaricato: '',
      quantitaGasCaricato: '',
      caricaMax: '',
      modelloCompressore: '',
      matricolaCompressore: '',
      numeroUnivoco: '',
      serviziAggiuntivi: [],
      tipologiaGasRecuperato: '',
      quantitaGasRecuperato: '',
      hasImages: false,
      images: []
    }
  ]);
  
  // Stati per intervento non riuscito (globali)
  const [interventoNonRiuscito, setInterventoNonRiuscito] = useState(false);
  const [motivoNonRiuscito, setMotivoNonRiuscito] = useState('');

  // Stato per il dialog di conferma uscita
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false);
  
  // Carica i tipi di gas e compressori quando il componente si monta
  useEffect(() => {
    if (isOpen && token) {
      loadGasAndCompressorTypes();
      checkExistingReport();
    }
  }, [isOpen, token]);

  // Funzione per caricare i tipi di gas e compressori
  const loadGasAndCompressorTypes = async () => {
    setIsLoadingTypes(true);
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };

      const [gasCompressorResponse, rechargeableGasResponse] = await Promise.all([
        fetch('/api/gas-compressor-types', { headers }),
        fetch('/api/rechargeable-gas-types', { headers })
      ]);

      if (gasCompressorResponse.ok) {
        const gasCompressorData = await gasCompressorResponse.json();
        setGasCompressorTypes(gasCompressorData);
      } else {
        console.error('Errore nel caricamento dei tipi di compressore');
      }

      if (rechargeableGasResponse.ok) {
        const rechargeableGasData = await rechargeableGasResponse.json();
        setRechargeableGasTypes(rechargeableGasData);
      } else {
        console.error('Errore nel caricamento dei tipi di gas ricaricabile');
      }
    } catch (error) {
      console.error('Errore nel caricamento dei dati:', error);
    } finally {
      setIsLoadingTypes(false);
    }
  };

  // Funzione per verificare se esiste già un rapportino
  const checkExistingReport = async () => {
    setIsLoadingExistingReport(true);
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch(`/api/assistance-interventions/${interventionData.id}/reports`, { headers });
      
      if (response.ok) {
        const reportData = await response.json();
        setExistingReport(reportData);
        console.log('📋 Rapportino esistente trovato:', reportData);
      } else if (response.status === 404) {
        // Nessun rapportino esistente, va bene
        setExistingReport(null);
        console.log('📝 Nessun rapportino esistente per questo intervento');
      } else {
        console.error('Errore nel controllo del rapportino esistente');
      }
    } catch (error) {
      console.error('Errore nel controllo del rapportino esistente:', error);
    } finally {
      setIsLoadingExistingReport(false);
    }
  };

  // Helper function per mappare il nome del compressore al suo ID
  const getGasCompressorTypeId = (typeName: string): number => {
    // Controlli di sicurezza
    if (!gasCompressorTypes || gasCompressorTypes.length === 0 || !typeName) {
      return 0;
    }
    
    const type = gasCompressorTypes.find(t => 
      t && t.name && t.name.toLowerCase() === typeName.toLowerCase()
    );
    return type ? type.id : 0;
  };

  // Helper function per mappare il nome del gas al suo ID
  const getRechargeableGasTypeId = (gasName: string): number => {
    // Controlli di sicurezza
    if (!rechargeableGasTypes || rechargeableGasTypes.length === 0 || !gasName) {
      return 0;
    }
    
    const type = rechargeableGasTypes.find(t => 
      t && t.name && t.name.toLowerCase() === gasName.toLowerCase()
    );
    return type ? type.id : 0;
  };

  // Funzione helper per determinare se un testo è un placeholder
  const isPlaceholderText = (text: string): boolean => {
    return text.startsWith('*') || text.includes('*') || text === '';
  };

  // Funzione helper per ottenere la classe CSS del testo
  const getTextColorClass = (text: string): string => {
    return isPlaceholderText(text) ? 'text-gray-500' : 'text-gray-700';
  };

  // Funzione per gestire il click del pulsante indietro
  const handleBackClick = () => {
    setShowExitConfirmDialog(true);
  };

  // Funzione per confermare l'uscita (perdendo i dati)
  const confirmExit = () => {
    setShowExitConfirmDialog(false);
    onClose();
  };

  // Funzione per annullare l'uscita
  const cancelExit = () => {
    setShowExitConfirmDialog(false);
  };

  // Funzione per validare il form
  const isFormValid = (): boolean => {
    // Se l'intervento è marcato come non riuscito, deve essere selezionato un motivo
    if (interventoNonRiuscito && !motivoNonRiuscito) {
      return false;
    }
    
    // Se l'intervento NON è fallito, deve avere almeno un item valido
    if (!interventoNonRiuscito && getValidItems().length === 0) {
      return false;
    }
    
    return true;
  };

  // Funzione per determinare se un item è vuoto/inutile
  const isItemEmpty = (item: EquipmentItem): boolean => {
    return (
      !item.selectedEquipment &&           // Nessuna apparecchiatura selezionata
      item.selectedArticles.length === 0 &&  // Nessun articolo selezionato
      !item.notes.trim() &&                  // Nessuna nota
      !item.hasGas &&                        // Nessuna gestione gas
      !item.hasImages                        // Nessuna immagine
    );
  };

  // Funzione per filtrare gli items validi
  const getValidItems = (): EquipmentItem[] => {
    return equipmentItems.filter(item => !isItemEmpty(item));
  };

  // Funzione per aggiungere un nuovo item (apparecchiatura completa)
  const addEquipmentItem = () => {
    const newItem: EquipmentItem = {
      id: Date.now().toString(),
      selectedEquipment: null,
      selectedArticles: [],
      notes: '',
      hasGas: false,
      tipologiaCompressore: 'ermetico',
      nuovaInstallazione: 'Sì',
      tipologiaGasCaricato: 'R404A',
      quantitaGasCaricato: '12',
      caricaMax: '120',
      modelloCompressore: '',
      matricolaCompressore: '',
      numeroUnivoco: '',
      serviziAggiuntivi: [],
      tipologiaGasRecuperato: 'R404A',
      quantitaGasRecuperato: '12',
      hasImages: false,
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

  // Funzione per gestire l'upload con Uploadcare per un equipmentItem specifico
  const handleImageUpload = (itemId: string, fileInfo: { cdnUrl?: string; name?: string }) => {
    console.log('Uploadcare success for item:', itemId, fileInfo);
    if (fileInfo && fileInfo.cdnUrl) {
      const item = equipmentItems.find(item => item.id === itemId);
      if (item) {
        const newImage: AttachedFile = {
          id: Date.now().toString(),
          name: fileInfo.name || `image_${Date.now()}.jpg`,
          uploadDate: new Date().toLocaleDateString('it-IT'),
          url: fileInfo.cdnUrl
        };
        
        const updatedImages = [...item.images, newImage];
        updateEquipmentItem(itemId, 'images', updatedImages);
      }
    }
  };

  // Funzione per rimuovere un'immagine da un equipment item
  const removeImageFromItem = (itemId: string, imageId: string) => {
    const item = equipmentItems.find(item => item.id === itemId);
    if (item) {
      const updatedImages = item.images.filter(img => img.id !== imageId);
      updateEquipmentItem(itemId, 'images', updatedImages);
    }
  };

  // Funzione per gestire la selezione multipla dei servizi aggiuntivi
  const handleServiziAggiuntiviToggle = (itemId: string, servizio: string) => {
    const item = equipmentItems.find(item => item.id === itemId);
    if (item) {
      const currentServizi = item.serviziAggiuntivi;
      const updatedServizi = currentServizi.includes(servizio)
        ? currentServizi.filter(s => s !== servizio)
        : [...currentServizi, servizio];
      
      updateEquipmentItem(itemId, 'serviziAggiuntivi', updatedServizi);
    }
  };

  // Funzione per gestire il submit
  const handleSubmit = async () => {
    try {
      // Verifica che il token sia disponibile
      if (!token) {
        alert('Errore di autenticazione. Effettuare il login.');
        return;
      }

      // Preparazione dati per l'API secondo la struttura richiesta
      const validItems = getValidItems();
      console.log('📋 Items originali:', equipmentItems.length);
      console.log('📋 Items validi dopo filtro:', validItems.length);
      console.log('📋 Items filtrati:', equipmentItems.filter(item => isItemEmpty(item)).length);
      
      const apiPayload = {
        work_hours: oreLavoro,
        travel_hours: oreViaggio,
        customer_notes: noteCliente,
        is_failed: interventoNonRiuscito,
        failure_reason: interventoNonRiuscito ? motivoNonRiuscito : null,
        status: "DRAFT" as const, // Inizialmente sempre DRAFT
        items: validItems.map(item => ({
          intervention_equipment_id: item.selectedEquipment?.id || 0,
          note: item.notes,
          fl_gas: item.hasGas,
          gas_compressor_types_id: item.hasGas ? (getGasCompressorTypeId(item.tipologiaCompressore) || null) : null,
          is_new_installation: item.nuovaInstallazione === 'Sì',
          rechargeable_gas_types_id: item.hasGas ? (getRechargeableGasTypeId(item.tipologiaGasCaricato) || null) : null,
          qty_gas_recharged: parseInt(item.quantitaGasCaricato) || 0,
          max_charge: parseInt(item.caricaMax) || 0,
          compressor_model: item.modelloCompressore || null,
          compressor_model_img_url: null, // TODO: implementare upload immagini
          compressor_serial_num: item.matricolaCompressore || null,
          compressor_serial_num_img_url: null, // TODO: implementare upload immagini
          compressor_unique_num: item.numeroUnivoco || null,
          compressor_unique_num_img_url: null, // TODO: implementare upload immagini
          additional_services: item.serviziAggiuntivi.length > 0 ? item.serviziAggiuntivi.join(', ') : null,
          recovered_rech_gas_types_id: item.hasGas ? (getRechargeableGasTypeId(item.tipologiaGasRecuperato) || null) : null,
          qty_gas_recovered: parseInt(item.quantitaGasRecuperato) || 0,
          images: item.images.map(file => ({
            file_name: file.name,
            file_url: file.url
          })),
          articles: item.selectedArticles.map(article => ({
            article_id: article.article.id,
            quantity: article.quantity
          }))
        }))
      };

      console.log('📤 Payload per API rapportino:', apiPayload);
      console.log('🔑 Token disponibile:', !!token);
      
      // Chiamata API per creare il rapportino
      const response = await fetch(`/api/assistance-interventions/${interventionData.id}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante la creazione del rapportino');
      }

      const reportData = await response.json();
      console.log('✅ Rapportino creato con successo:', reportData);
      
      onClose();
      
      // Apri il rapportino in una nuova tab invece di navigare nella stessa pagina
      if (reportData.id) {
        const reportUrl = `/interventi/rapportino/${reportData.id}`;
        window.open(reportUrl, '_blank');
        console.log('🔗 Rapportino aperto in nuova tab:', reportUrl);
      }
    } catch (error) {
      console.error('💥 Errore durante la creazione del rapportino:', error);
      alert(`Errore durante la creazione del rapportino: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-teal-600 text-white px-4 md:px-6 py-4">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <button 
            onClick={handleBackClick}
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
        {/* Indicatore di caricamento */}
        {(isLoadingTypes || isLoadingExistingReport || !token) && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-blue-800">
                {!token ? 'Autenticazione in corso...' : 'Caricamento dati...'}
              </span>
            </div>
          </div>
        )}

        {/* Messaggio rapportino esistente */}
        {existingReport && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Rapportino già esistente</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  Esiste già un rapportino per questo intervento (ID: {existingReport.id}, Stato: {existingReport.status}).
                  Procedendo con la creazione di un nuovo rapportino, quello esistente potrebbe essere sovrascritto.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bottone Conferma e procedi */}
        <div className="mb-6">
          <button
            onClick={handleSubmit}
            disabled={isLoadingTypes || isLoadingExistingReport || !token || !isFormValid()}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {existingReport ? 'Aggiorna rapportino esistente' : 'Conferma e invia rapportino'}
          </button>
          
          {/* Messaggio di validazione */}
          {interventoNonRiuscito && !motivoNonRiuscito && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">
                    Seleziona un motivo per l&apos;intervento non riuscito
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    È necessario specificare il motivo per cui l&apos;intervento non è riuscito prima di poter creare il rapportino.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Messaggio di validazione per apparecchiature */}
          {!interventoNonRiuscito && getValidItems().length === 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">
                    Aggiungi almeno un&apos;apparecchiatura o attività
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Per un intervento riuscito è necessario specificare almeno un&apos;apparecchiatura, un articolo utilizzato, delle note o altre attività svolte.
                  </p>
                </div>
              </div>
            </div>
          )}
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
            placeholder="*Note che saranno leggibili dal cliente"
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
                              onChange={() => handleServiziAggiuntiviToggle(item.id, servizio)}
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
                      checked={item.hasImages}
                      onChange={(e) => updateEquipmentItem(item.id, 'hasImages', e.target.checked)}
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
                                className="w-full h-32 object-cover rounded-lg bg-gray-100"
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
                                  onClick={() => removeImageFromItem(item.id, image.id)}
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
                      <FileUploaderRegular
                        pubkey={process.env.NEXT_PUBLIC_UPLOADER_PUBLIC_KEY || ''}
                        onFileUploadSuccess={(fileInfo: { cdnUrl?: string; name?: string }) => 
                          handleImageUpload(item.id, fileInfo)
                        }
                        onFileUploadFailed={(e: { status: string; [key: string]: unknown }) => {
                          console.error('Error uploading equipment image:', e);
                          alert('Errore durante il caricamento dell\'immagine dell\'apparecchiatura');
                        }}
                        imgOnly={true}
                        multiple={true}
                        sourceList="local,url,camera,dropbox,gdrive"
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
        {/* <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
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
        </div> */}

        {/* Bottom actions */}
        <div className="bg-gray-50 border-t border-gray-200 -mx-4 md:-mx-6 px-4 md:px-6 py-4">
          <button
            onClick={handleSubmit}
            disabled={isLoadingTypes || isLoadingExistingReport || !token || !isFormValid()}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {existingReport ? 'Aggiorna rapportino esistente' : 'Conferma e invia rapportino'}
          </button>
          
          {/* Messaggio di validazione */}
          {interventoNonRiuscito && !motivoNonRiuscito && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">
                    Seleziona un motivo per l&apos;intervento non riuscito
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    È necessario specificare il motivo per cui l&apos;intervento non è riuscito prima di poter creare il rapportino.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Messaggio di validazione per apparecchiature */}
          {!interventoNonRiuscito && getValidItems().length === 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">
                    Aggiungi almeno un&apos;apparecchiatura o attività
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Per un intervento riuscito è necessario specificare almeno un&apos;apparecchiatura, un articolo utilizzato, delle note o altre attività svolte.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog di conferma uscita */}
      {showExitConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Attenzione: dati non salvati
                </h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Se torni indietro ora, tutti i dati inseriti andranno persi. 
                Sei sicuro di voler uscire senza salvare il rapportino?
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelExit}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={confirmExit}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Torna indietro comunque
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 