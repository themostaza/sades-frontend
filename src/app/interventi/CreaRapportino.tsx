'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Clock, X, Plus, Eye, Download, Trash2, AlertTriangle, Search } from 'lucide-react';
import Image from 'next/image';
import { AssistanceInterventionDetail, ConnectedArticle, ConnectedEquipment } from '../../types/assistance-interventions';
import S3ImageUploader from '@/components/S3ImageUploader';
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
  
  // Stati per ore di lavoro - ora sono string per gestire meglio punto/virgola
  const [oreLavoro, setOreLavoro] = useState<string>('0');
  const [oreViaggio, setOreViaggio] = useState<string>('0');
  
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
      tipologiaCompressore: '',
      nuovaInstallazione: '',
      tipologiaGasCaricato: '',
      quantitaGasCaricato: '0',
      caricaMax: '0',
      modelloCompressore: '',
      matricolaCompressore: '',
      numeroUnivoco: '',
      serviziAggiuntivi: [],
      tipologiaGasRecuperato: '',
      quantitaGasRecuperato: '0',
      hasImages: false,
      images: []
    }
  ]);
  
  // Stati per intervento non riuscito (globali)
  const [interventoNonRiuscito, setInterventoNonRiuscito] = useState(false);
  const [motivoNonRiuscito, setMotivoNonRiuscito] = useState('');

  // Stati per richiesta nuovo intervento
  const [showRequestNewInterventionDialog, setShowRequestNewInterventionDialog] = useState(false);
  const [requestNewInterventionText, setRequestNewInterventionText] = useState('');
  const [isSubmittingNewIntervention, setIsSubmittingNewIntervention] = useState(false);

  // Stati per notifiche UI
  const [showNotificationMessage, setShowNotificationMessage] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // Stato per il dialog di conferma uscita
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false);
  
  // Stati per ricerca apparecchiature per ogni item e dialog selezione
  const [equipmentSearchQueries, setEquipmentSearchQueries] = useState<{ [itemId: string]: string }>({});
  const [equipmentsResults, setEquipmentsResults] = useState<{ [itemId: string]: ConnectedEquipment[] }>({});
  const [isSearchingEquipments, setIsSearchingEquipments] = useState<{ [itemId: string]: boolean }>({});
  const [showEquipmentSelectorDialogs, setShowEquipmentSelectorDialogs] = useState<{ [itemId: string]: boolean }>({});
  // Stati per selezione ricambi per ogni item
  const [articleSearchQueries, setArticleSearchQueries] = useState<{ [itemId: string]: string }>({});
  const [articleResults, setArticleResults] = useState<{ [itemId: string]: ConnectedArticle[] }>({});
  const [isSearchingArticles, setIsSearchingArticles] = useState<{ [itemId: string]: boolean }>({});
  const [showArticleSelectorDialogs, setShowArticleSelectorDialogs] = useState<{ [itemId: string]: boolean }>({});

  // Funzioni helper per gestire i campi decimali (ore lavoro/viaggio)
  const normalizeDecimalInput = (value: string): string => {
    // Sostituisci punto con virgola per mostrare sempre la virgola
    // Permetti solo numeri, virgola e punto
    const cleaned = value.replace(/[^0-9.,]/g, '');
    return cleaned.replace('.', ',');
  };

  const parseDecimalValue = (value: string): number => {
    // Converti virgola in punto per il parsing numerico
    if (!value || value.trim() === '') return 0;
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Carica i tipi di gas e compressori quando il componente si monta
  useEffect(() => {
    if (isOpen && token) {
      loadGasAndCompressorTypes();
      checkExistingReport();
    }
  }, [isOpen, token]);

  // La selezione apparecchiatura avviene in un dialog dedicato

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

  // Funzioni per gestire le notifiche UI
  const showNotification = (type: 'success' | 'error', title: string, message: string) => {
    setNotificationMessage({ type, title, message });
    setShowNotificationMessage(true);
    
    // Auto-hide dopo 5 secondi per i messaggi di successo
    if (type === 'success') {
      setTimeout(() => {
        setShowNotificationMessage(false);
      }, 5000);
    }
  };

  const hideNotification = () => {
    setShowNotificationMessage(false);
  };

  // Funzioni per gestire la richiesta di nuovo intervento
  const handleRequestNewIntervention = () => {
    setShowRequestNewInterventionDialog(true);
  };

  const handleCloseRequestDialog = () => {
    setShowRequestNewInterventionDialog(false);
    setRequestNewInterventionText('');
  };

  const handleSubmitNewInterventionRequest = async () => {
    if (!requestNewInterventionText.trim()) {
      showNotification('error', 'Campo richiesto', 'Inserisci i dettagli della richiesta');
      return;
    }

    setIsSubmittingNewIntervention(true);
    try {
      // Verifica che il token sia disponibile
      if (!token) {
        showNotification('error', 'Errore di autenticazione', 'Effettuare il login.');
        return;
      }

      // Prepara il payload per la notifica
      const notificationPayload = {
        role: "amministrazione",
        message: `Richiesta nuovo intervento - ${interventionData.company_name}\n\nRichiesta di apertura nuovo intervento per il cliente ${interventionData.company_name}.\n\nDettagli: ${requestNewInterventionText}\n\nRichiesta generata dall'intervento ID: ${interventionData.id}`
      };

      console.log('📤 Payload per notifica nuovo intervento:', notificationPayload);

      // Chiamata API per inviare la notifica
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notificationPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'invio della notifica');
      }

      const notificationData = await response.json();
      console.log('✅ Notifica inviata con successo:', notificationData);
      
      // Chiudi il dialog e resetta il testo
      setShowRequestNewInterventionDialog(false);
      setRequestNewInterventionText('');
      
      // Mostra messaggio di successo
      showNotification('success', 'Richiesta inviata!', 'La richiesta di nuovo intervento è stata inviata con successo all\'amministrazione.');
      
    } catch (error) {
      console.error('💥 Errore durante l\'invio della notifica:', error);
      showNotification('error', 'Errore durante l\'invio', error instanceof Error ? error.message : 'Errore sconosciuto durante l\'invio della richiesta');
    } finally {
      setIsSubmittingNewIntervention(false);
    }
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
      tipologiaCompressore: '',
      nuovaInstallazione: '',
      tipologiaGasCaricato: '',
      quantitaGasCaricato: '0',
      caricaMax: '0',
      modelloCompressore: '',
      matricolaCompressore: '',
      numeroUnivoco: '',
      serviziAggiuntivi: [],
      tipologiaGasRecuperato: '',
      quantitaGasRecuperato: '0',
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

  // Funzione di ricerca live per apparecchiature
  const searchEquipments = async (itemId: string, query: string = '') => {
    if (!interventionData?.customer_id) {
      setEquipmentsResults(prev => ({ ...prev, [itemId]: [] }));
      return;
    }
    try {
      setIsSearchingEquipments(prev => ({ ...prev, [itemId]: true }));
      let apiUrl = `/api/equipments?customer_id=${interventionData.customer_id}`;
      if (interventionData.customer_location_id) {
        apiUrl += `&customer_location_id=${encodeURIComponent(interventionData.customer_location_id)}`;
      }
      if (query.trim()) {
        apiUrl += `&query=${encodeURIComponent(query)}`;
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(apiUrl, { headers });
      if (response.ok) {
        const data = await response.json();
        // Escludi già selezionati in altri items
        const alreadySelectedIds = equipmentItems.map(item => item.selectedEquipment?.id).filter(Boolean);
        const filtered = (data.data || []).filter((eq: ConnectedEquipment) => !alreadySelectedIds.includes(eq.id));
        setEquipmentsResults(prev => ({ ...prev, [itemId]: filtered }));
      } else {
        setEquipmentsResults(prev => ({ ...prev, [itemId]: [] }));
      }
    } catch {
      setEquipmentsResults(prev => ({ ...prev, [itemId]: [] }));
    } finally {
      setIsSearchingEquipments(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Ricerca ricambi come in InterventionDetailsSectionDetail
  const searchArticles = async (itemId: string, query: string = '') => {
    try {
      setIsSearchingArticles(prev => ({ ...prev, [itemId]: true }));
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`/api/articles?query=${encodeURIComponent(query)}`, { headers });
      if (response.ok) {
        const data = await response.json();
        const currentItem = equipmentItems.find(ei => ei.id === itemId);
        const excludeIds = (currentItem?.selectedArticles || []).map(a => a.article.id);
        const mapped: ConnectedArticle[] = (data.data || [])
          .filter((art: ConnectedArticle) => !excludeIds.includes(art.id))
          .map((art: ConnectedArticle) => ({
            id: art.id,
            pnc_code: art.pnc_code ?? null,
            short_description: art.short_description ?? '',
            description: art.description ?? '',
            quantity: 0,
          }));
        setArticleResults(prev => ({ ...prev, [itemId]: mapped }));
      } else {
        setArticleResults(prev => ({ ...prev, [itemId]: [] }));
      }
    } catch {
      setArticleResults(prev => ({ ...prev, [itemId]: [] }));
    } finally {
      setIsSearchingArticles(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const getPlannedArticleQty = (articleId: string): number => {
    const planned = interventionData.connected_articles?.find(a => a.id === articleId);
    return planned?.quantity ?? 0;
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
        work_hours: parseDecimalValue(oreLavoro),
        travel_hours: parseDecimalValue(oreViaggio),
        customer_notes: noteCliente,
        is_failed: interventoNonRiuscito,
        failure_reason: interventoNonRiuscito ? motivoNonRiuscito : null,
        status: "DRAFT" as const, // Inizialmente sempre DRAFT
        items: validItems.map(item => ({
          equipment_id: item.selectedEquipment?.id ?? null,
          note: item.notes,
          fl_gas: item.hasGas,
          images: item.images.map(file => ({
            file_name: file.name,
            file_url: file.url
          })),
          articles: item.selectedArticles.map(article => ({
            article_id: article.article.id,
            quantity: article.quantity
          })),
          // Campi gestione gas: invia SOLO se toggle attivo
          ...(item.hasGas
            ? {
                gas_compressor_types_id: getGasCompressorTypeId(item.tipologiaCompressore) || null,
                is_new_installation: item.nuovaInstallazione === 'Sì',
                rechargeable_gas_types_id: getRechargeableGasTypeId(item.tipologiaGasCaricato) || null,
                qty_gas_recharged: parseInt(item.quantitaGasCaricato) || 0,
                max_charge: parseInt(item.caricaMax) || 0,
                compressor_model: item.modelloCompressore || null,
                compressor_model_img_url: null, // TODO: implementare upload immagini
                compressor_serial_num: item.matricolaCompressore || null,
                compressor_serial_num_img_url: null, // TODO: implementare upload immagini
                compressor_unique_num: item.numeroUnivoco || null,
                compressor_unique_num_img_url: null, // TODO: implementare upload immagini
                additional_services: item.serviziAggiuntivi.length > 0 ? item.serviziAggiuntivi.join(', ') : null,
                // Campi recupero gas: invia SOLO se i campi sono visibili
                ...(shouldShowRecuperoGasFields(item)
                  ? {
                      recovered_rech_gas_types_id: getRechargeableGasTypeId(item.tipologiaGasRecuperato) || null,
                      qty_gas_recovered: parseInt(item.quantitaGasRecuperato) || 0,
                    }
                  : {})
              }
            : {})
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
      
      // Gestisce la duplicazione dell'intervento per rapportini failed
      if (reportData.duplicated_intervention) {
        console.log('✅ Nuovo intervento creato automaticamente:', reportData.duplicated_intervention.id);
        showNotification('success', 'Intervento duplicato!', 
          `Rapportino creato e nuovo intervento #${reportData.duplicated_intervention.id} generato automaticamente per la riprogrammazione.`);
      } else if (reportData.duplication_warning) {
        console.warn('⚠️ Warning nella duplicazione:', reportData.duplication_warning);
        showNotification('error', 'Attenzione', 
          `Rapportino creato ma problema nella duplicazione intervento: ${reportData.duplication_warning}`);
      }
      
      onClose();
      
      // Apri il rapportino in una nuova tab
      if (reportData.id) {
        const reportUrl = `/interventi/rapportino/${reportData.id}`;
        window.open(reportUrl, '_blank');
        console.log('🔗 Rapportino aperto in nuova tab:', reportUrl);
      }
      
      // Reindirizza con refresh alla pagina dell'intervento con deep link
      const interventionUrl = `/interventi?ai=${interventionData.id}`;
      console.log('🔄 Refresh e redirect alla pagina intervento:', interventionUrl);
      window.location.href = interventionUrl;
    } catch (error) {
      console.error('💥 Errore durante la creazione del rapportino:', error);
      alert(`Errore durante la creazione del rapportino: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  };

  // Funzione helper per capire se mostrare i campi recupero gas:
  const shouldShowRecuperoGasFields = (item: EquipmentItem): boolean => {
    // Nascondi solo se l'unico servizio selezionato è 'Ricerca perdite'
    return !(item.serviziAggiuntivi.length === 1 && item.serviziAggiuntivi[0] === 'Ricerca perdite');
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
            Rapportino per {interventionData.company_name}
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
                  type="text"
                  value={oreLavoro}
                  onChange={(e) => setOreLavoro(normalizeDecimalInput(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.currentTarget.select()}
                  inputMode="decimal"
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
                  type="text"
                  value={oreViaggio}
                  onChange={(e) => setOreViaggio(normalizeDecimalInput(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.currentTarget.select()}
                  inputMode="decimal"
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
                    onClick={() => {
                      setShowEquipmentSelectorDialogs(prev => ({ ...prev, [item.id]: true }));
                      // Popola i risultati iniziali
                      searchEquipments(item.id, equipmentSearchQueries[item.id] || '');
                    }}
                    placeholder="Cerca apparecchiatura..."
                    readOnly
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700 cursor-pointer"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>

                {/* Dialog selezione apparecchiatura */}
                {showEquipmentSelectorDialogs[item.id] && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-4 md:p-6 max-w-3xl md:max-w-4xl w-full mx-4 h-[95vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Seleziona apparecchiatura</h3>
                        <button
                          onClick={() => setShowEquipmentSelectorDialogs(prev => ({ ...prev, [item.id]: false }))}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* Apparecchiature già associate all'intervento */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">Apparecchiature già associate all&apos;intervento</label>
                        </div>
                        <div className="border rounded-lg max-h-56 overflow-y-auto">
                          {(interventionData.connected_equipment || []).length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500">Nessuna apparecchiatura associata</div>
                          ) : (
                            (interventionData.connected_equipment || []).map((eq) => {
                              const alreadySelectedIds = equipmentItems
                                .filter(ei => ei.id !== item.id)
                                .map(ei => ei.selectedEquipment?.id)
                                .filter(Boolean) as number[];
                              const isDisabled = alreadySelectedIds.includes(eq.id);
                              return (
                                <div
                                  key={eq.id}
                                  onClick={() => {
                                    if (isDisabled) return;
                                    updateEquipmentItem(item.id, 'selectedEquipment', eq);
                                    setEquipmentSearchQueries(prev => ({ ...prev, [item.id]: '' }));
                                    setShowEquipmentSelectorDialogs(prev => ({ ...prev, [item.id]: false }));
                                  }}
                                  className={`px-4 py-3 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'} text-gray-700`}
                                >
                                  <div className="font-medium text-gray-700">{eq.description}</div>
                                  <div className="text-sm text-gray-500">{eq.brand_name || ''} {eq.model} (S/N: {eq.serial_number}) | ID: {eq.id}</div>
                                  <div className="text-xs text-gray-500">
                                    {eq.subfamily_name && <span className="mr-2">{eq.subfamily_name}</span>}
                                    {eq.customer_name && <span className="mr-2">• Cliente: {eq.customer_name}</span>}
                                    {eq.linked_serials && <span>• Linked: {eq.linked_serials}</span>}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Ricerca apparecchiature */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">Cerca altre apparecchiature del cliente</label>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${interventionData.customer_location_id ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-800'}`}>
                            {interventionData.customer_location_id ? 'Da: Destinazione' : 'Da: Cliente'}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={equipmentSearchQueries[item.id] || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setEquipmentSearchQueries(prev => ({ ...prev, [item.id]: value }));
                              searchEquipments(item.id, value);
                            }}
                            onFocus={() => searchEquipments(item.id, equipmentSearchQueries[item.id] || '')}
                            placeholder="Cerca apparecchiatura..."
                            className="w-full px-3 py-2 pr-10 border rounded-lg text-gray-700"
                          />
                          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                          {isSearchingEquipments[item.id] && (
                            <div className="absolute right-10 top-1/2 transform -translate-y-1/2 w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                          )}
                        </div>
                        {(equipmentsResults[item.id]?.length || 0) > 0 && (
                          <div className="mt-2 border rounded-lg max-h-96 overflow-y-auto">
                            {equipmentsResults[item.id].map(eq => (
                              <div
                                key={eq.id}
                                onClick={() => {
                                  updateEquipmentItem(item.id, 'selectedEquipment', eq);
                                  setEquipmentSearchQueries(prev => ({ ...prev, [item.id]: '' }));
                                  setShowEquipmentSelectorDialogs(prev => ({ ...prev, [item.id]: false }));
                                }}
                                className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-gray-700"
                              >
                                <div className="font-medium text-gray-700">{eq.description}</div>
                                <div className="text-sm text-gray-500">{eq.brand_name || ''} {eq.model} (S/N: {eq.serial_number}) | ID: {eq.id}</div>
                                <div className="text-xs text-gray-500">
                                  {eq.subfamily_name && <span className="mr-2">{eq.subfamily_name}</span>}
                                  {eq.customer_name && <span className="mr-2">• Cliente: {eq.customer_name}</span>}
                                  {eq.linked_serials && <span>• Linked: {eq.linked_serials}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {item.selectedEquipment && (
                  <div className="mt-2 flex items-center justify-between bg-gray-100 p-3 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-700">{item.selectedEquipment.description}</div>
                      <div className="text-sm text-gray-500">Modello: {item.selectedEquipment.model} | S/N: {item.selectedEquipment.serial_number} | ID: {item.selectedEquipment.id}</div>
                    </div>
                    <button
                      onClick={() => {
                        updateEquipmentItem(item.id, 'selectedEquipment', null);
                        setEquipmentSearchQueries(prev => ({ ...prev, [item.id]: '' }));
                      }}
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
                    onClick={() => {
                      setShowArticleSelectorDialogs(prev => ({ ...prev, [item.id]: true }));
                      searchArticles(item.id, articleSearchQueries[item.id] || '');
                    }}
                    placeholder="Cerca o scegli tra i ricambi preventivati..."
                    readOnly
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700 cursor-pointer"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>

                {/* Dialog selezione ricambi */}
                {showArticleSelectorDialogs[item.id] && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-4 md:p-6 max-w-3xl md:max-w-4xl w-full mx-4 h-[95vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Seleziona pezzi di ricambio</h3>
                        <button
                          onClick={() => setShowArticleSelectorDialogs(prev => ({ ...prev, [item.id]: false }))}
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
                          {(interventionData.connected_articles || []).length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500">Nessun ricambio associato</div>
                          ) : (
                            (interventionData.connected_articles || [])
                              .filter(article => !item.selectedArticles.some(sel => sel.article.id === article.id))
                              .map((article) => (
                                <div
                                  key={article.id}
                                  onClick={() => {
                                    const newSelectedArticles = [...item.selectedArticles, { article, quantity: 1 }];
                                    updateEquipmentItem(item.id, 'selectedArticles', newSelectedArticles);
                                    setShowArticleSelectorDialogs(prev => ({ ...prev, [item.id]: false }));
                                  }}
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
                            value={articleSearchQueries[item.id] || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setArticleSearchQueries(prev => ({ ...prev, [item.id]: value }));
                              searchArticles(item.id, value);
                            }}
                            placeholder="Cerca ricambi..."
                            className="w-full px-3 py-2 pr-10 border rounded-lg text-gray-700"
                          />
                          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                          {isSearchingArticles[item.id] && (
                            <div className="absolute right-10 top-1/2 transform -translate-y-1/2 w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                          )}
                        </div>
                        {(articleResults[item.id]?.length || 0) > 0 && (
                          <div className="mt-2 border rounded-lg max-h-96 overflow-y-auto">
                            {articleResults[item.id].map(art => (
                              <div
                                key={art.id}
                                onClick={() => {
                                  const newSelectedArticles = [...item.selectedArticles, { article: art, quantity: 1 }];
                                  updateEquipmentItem(item.id, 'selectedArticles', newSelectedArticles);
                                  setArticleSearchQueries(prev => ({ ...prev, [item.id]: '' }));
                                  setShowArticleSelectorDialogs(prev => ({ ...prev, [item.id]: false }));
                                }}
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
                )}

                {/* Lista ricambi selezionati con quantità e info preventivo */}
                {item.selectedArticles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm font-medium text-gray-700">Ricambi selezionati:</div>
                    {item.selectedArticles.map((selectedArticle) => {
                      const planned = getPlannedArticleQty(selectedArticle.article.id);
                      const currentTotal = equipmentItems.reduce((sum, it) => sum + (it.selectedArticles.find(sa => sa.article.id === selectedArticle.article.id)?.quantity || 0), 0);
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
                                onChange={(e) => updateArticleQuantity(item.id, selectedArticle.article.id, parseInt(e.target.value) || 1)}
                                min="1"
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-gray-700 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                              />
                            </div>
                            <div className="text-xs text-gray-600 whitespace-nowrap">Prev: {planned}</div>
                            {diff > 0 && (
                              <div className="text-xs text-yellow-700 whitespace-nowrap">+{diff} oltre prev.</div>
                            )}
                            <button
                              onClick={() => removeArticleFromItem(item.id, selectedArticle.article.id)}
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
                          onChange={(e) => updateEquipmentItem(item.id, 'nuovaInstallazione', e.target.value)}
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
                          onChange={(e) => updateEquipmentItem(item.id, 'tipologiaGasCaricato', e.target.value)}
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
                    
                    {/* Campi recupero gas: visibili solo se NON è selezionato 'Ricerca perdite' */}
                    {shouldShowRecuperoGasFields(item) && (
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
                              onChange={(e) => updateEquipmentItem(item.id, 'quantitaGasRecuperato', e.target.value)}
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
                      <S3ImageUploader
                        onUploadSuccess={(fileInfo: { cdnUrl: string; name: string }) => 
                          handleImageUpload(item.id, { cdnUrl: fileInfo.cdnUrl, name: fileInfo.name })
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
          ))}
          
          <button
            onClick={addEquipmentItem}
            className="bg-teal-100 hover:bg-teal-200 text-teal-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors mb-6"
          >
            <Plus size={16} />
            Aggiungi apparecchiatura
          </button>
        </div>

        {/* Richiedi nuovo intervento - Sezione globale */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Richiedi nuovo intervento</h3>
              <p className="text-sm text-gray-600 mt-1">
                Invia in automatico una notifica all&apos;amministrazione per aprire un nuovo intervento su questo cliente
              </p>
            </div>
            <button
              onClick={handleRequestNewIntervention}
              disabled={isSubmittingNewIntervention}
              className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {isSubmittingNewIntervention ? 'Invio...' : 'Richiedi'}
            </button>
          </div>
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

      {/* Dialog richiesta nuovo intervento */}
      {showRequestNewInterventionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6 text-teal-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Richiedi nuovo intervento
                </h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-4">
                Descrivi i dettagli della richiesta di apertura del nuovo intervento per il cliente {interventionData.company_name}:
              </p>
                             <textarea
                 value={requestNewInterventionText}
                 onChange={(e) => setRequestNewInterventionText(e.target.value)}
                 rows={4}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none text-gray-700"
                 placeholder="Scrivi qui i dettagli della richiesta di apertura nuovo intervento..."
               />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseRequestDialog}
                disabled={isSubmittingNewIntervention}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmitNewInterventionRequest}
                disabled={isSubmittingNewIntervention || !requestNewInterventionText.trim()}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmittingNewIntervention ? 'Invio...' : 'Invia richiesta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifiche UI */}
      {showNotificationMessage && notificationMessage && (
        <div className="fixed top-4 right-4 z-[60] max-w-md">
          <div className={`rounded-lg p-4 shadow-lg border-l-4 ${
            notificationMessage.type === 'success' 
              ? 'bg-green-50 border-green-400' 
              : 'bg-red-50 border-red-400'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notificationMessage.type === 'success' ? (
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${
                  notificationMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {notificationMessage.title}
                </h3>
                <p className={`mt-1 text-sm ${
                  notificationMessage.type === 'success' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {notificationMessage.message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={hideNotification}
                  className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    notificationMessage.type === 'success' 
                      ? 'text-green-500 hover:bg-green-100 focus:ring-green-600' 
                      : 'text-red-500 hover:bg-red-100 focus:ring-red-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 