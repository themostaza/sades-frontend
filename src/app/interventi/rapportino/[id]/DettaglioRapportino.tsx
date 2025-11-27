'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, PenTool, Trash2, Plus } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { InterventionReportDetail } from '../../../../types/intervention-reports';
import { EquipmentDetail } from '../../../../types/equipment';
import type { AssistanceInterventionDetail, ConnectedArticle, ConnectedEquipment } from '../../../../types/assistance-interventions';
import type { Article } from '../../../../types/article';
import { 
  EquipmentItemEditable, 
  EquipmentItemReadOnly, 
  EquipmentSelectorDialog, 
  ArticleSelectorDialog,
  BasicInfoSection,
  SignatureSection,
  SignatureDialog,
  DeleteConfirmDialog,
  ResultDialog,
  Lightbox
} from './components';
import type { EditableEquipmentItem, SelectedArticle, AttachedFile, GasCompressorType, RechargeableGasType } from './components/types';

// Interfaccia per il tipo SignatureCanvas (per gestione stato locale)
interface SignatureCanvasRef {
  clear: () => void;
  toDataURL: () => string;
  isEmpty: () => boolean;
}

// Interface per la PUT request - compatibile con i tipi esistenti
interface UpdateInterventionReportRequest {
  work_hours: number;
  travel_hours: number;
  customer_notes: string;
  is_failed: boolean;
  failure_reason: string;
  status: string;
  signature_url: string;
  items: Array<{
    id: number;
    equipment_id: number;
    note: string;
    fl_gas: boolean;
    gas_compressor_types_id: number;
    is_new_installation: boolean;
    rechargeable_gas_types_id: number;
    qty_gas_recharged: number;
    max_charge: number;
    compressor_model: string;
    compressor_model_img_url: string;
    compressor_serial_num: string;
    compressor_serial_num_img_url: string;
    compressor_unique_num: string;
    compressor_unique_num_img_url: string;
    additional_services: string;
    recovered_rech_gas_types_id: number;
    qty_gas_recovered: number;
    images: Array<{
      id: number;
      file_name: string;
      file_url: string;
    }>;
    articles: Array<{
      id: number;
      article_id: string;
      quantity: number;
    }>;
  }>;
}

interface DettaglioRapportinoProps {
  reportData: InterventionReportDetail;
  interventionData: AssistanceInterventionDetail | null;
}

export default function DettaglioRapportino({ reportData, interventionData }: DettaglioRapportinoProps) {
  const [signatureRef, setSignatureRef] = useState<SignatureCanvasRef | null>(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [resultDialogType, setResultDialogType] = useState<'success' | 'error'>('success');
  const [resultDialogMessage, setResultDialogMessage] = useState('');
  const [shouldRedirectOnClose, setShouldRedirectOnClose] = useState(false);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [updatedReportData, setUpdatedReportData] = useState<InterventionReportDetail>(reportData);
  const { token } = useAuth();

  // Stati per la modifica del rapportino - ore gestite come string per supporto punto/virgola
  const [editableWorkHours, setEditableWorkHours] = useState<string>(reportData.work_hours.toString().replace('.', ','));
  const [editableTravelHours, setEditableTravelHours] = useState<string>(reportData.travel_hours.toString().replace('.', ','));
  const [editableCustomerNotes, setEditableCustomerNotes] = useState<string>(reportData.customer_notes || '');
  const [showNotesField, setShowNotesField] = useState<boolean>(!!reportData.customer_notes);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Stati per la modifica degli items (apparecchiature, ricambi, gas, immagini)
  const [editableItems, setEditableItems] = useState<EditableEquipmentItem[]>([]);
  
  // Stati per ricerca apparecchiature
  const [equipmentSearchQueries, setEquipmentSearchQueries] = useState<{ [itemId: string]: string }>({});
  const [equipmentsResults, setEquipmentsResults] = useState<{ [itemId: string]: ConnectedEquipment[] }>({});
  const [isSearchingEquipments, setIsSearchingEquipments] = useState<{ [itemId: string]: boolean }>({});
  const [showEquipmentSelectorDialogs, setShowEquipmentSelectorDialogs] = useState<{ [itemId: string]: boolean }>({});
  
  // Stati per selezione ricambi
  const [articleSearchQueries, setArticleSearchQueries] = useState<{ [itemId: string]: string }>({});
  const [articleResults, setArticleResults] = useState<{ [itemId: string]: ConnectedArticle[] }>({});
  const [isSearchingArticles, setIsSearchingArticles] = useState<{ [itemId: string]: boolean }>({});
  const [showArticleSelectorDialogs, setShowArticleSelectorDialogs] = useState<{ [itemId: string]: boolean }>({});

  // Stati per tipi gas/compressori
  const [gasCompressorTypes, setGasCompressorTypes] = useState<GasCompressorType[]>([]);
  const [rechargeableGasTypes, setRechargeableGasTypes] = useState<RechargeableGasType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true); // Stato per tracciare caricamento tipi

  // Lookup cache per dettagli apparecchiature e articoli
  const [equipmentById, setEquipmentById] = useState<Record<number, EquipmentDetail>>({});
  const [articleById, setArticleById] = useState<Record<string, Article>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [interventionDetail, setInterventionDetail] = useState<AssistanceInterventionDetail | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  // Helper function per convertire string con virgola/punto in number
  const parseDecimalValue = (value: string): number => {
    // Converti virgola in punto per il parsing numerico
    if (!value || value.trim() === '') return 0;
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper function per formattare la data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function per formattare i servizi aggiuntivi
  const formatAdditionalServices = (services: string) => {
    if (!services || services.trim() === '') return 'Nessun servizio aggiuntivo';
    return services.split(',').map(s => s.trim()).filter(s => s).join(', ');
  };

  // Helper function per convertire items del report in items editabili
  const convertReportItemsToEditable = (items: InterventionReportDetail['items']): EditableEquipmentItem[] => {
    if (!items || items.length === 0) return [];
    
    return items.map((item, index) => {
      // Converti equipment_id in ConnectedEquipment se disponibile
      const equipment = item.equipment_id ? equipmentById[item.equipment_id] : null;
      const connectedEquipment: ConnectedEquipment | null = equipment ? {
        id: equipment.id,
        description: equipment.description,
        model: equipment.model,
        serial_number: equipment.serial_number,
        brand_name: equipment.brand_label || '',
        subfamily_name: equipment.subfamily_label || '',
        customer_name: '', // Non disponibile in EquipmentDetail
        linked_serials: ''
      } : null;

      // Converti articles in SelectedArticle[]
      const selectedArticles: SelectedArticle[] = (item.articles || []).map(art => {
        const articleData = articleById[art.article_id];
        return {
          article: {
            id: art.article_id,
            pnc_code: articleData?.pnc_code || null,
            short_description: articleData?.short_description || art.article_name || '',
            description: articleData?.description || art.article_description || '',
            quantity: art.quantity
          },
          quantity: art.quantity,
          relationId: typeof art.id === 'string' ? parseInt(art.id) : art.id // ✅ Salva l'ID della relazione dal DB (convertito a numero)
        };
      });

      // Converti images
      const images: AttachedFile[] = (item.images || []).map(img => ({
        id: img.id?.toString() || Date.now().toString(),
        name: img.file_name,
        uploadDate: new Date().toLocaleDateString('it-IT'),
        url: img.file_url
      }));

      // Ottieni nomi dei tipi gas
      const compressorTypeName = item.gas_compressor_types_id 
        ? getCompressorTypeName(item.gas_compressor_types_id) 
        : '';
      const gasTypeName = item.rechargeable_gas_types_id 
        ? getRechargeableGasTypeName(item.rechargeable_gas_types_id) 
        : '';
      const recoveredGasTypeName = item.recovered_rech_gas_types_id 
        ? getRechargeableGasTypeName(item.recovered_rech_gas_types_id) 
        : '';

      return {
        id: item.id?.toString() || `item_${index}`,
        originalId: item.id,
        selectedEquipment: connectedEquipment,
        selectedArticles,
        notes: item.note || '',
        hasGas: item.fl_gas,
        tipologiaCompressore: compressorTypeName,
        nuovaInstallazione: item.is_new_installation ? 'Sì' : 'No',
        tipologiaGasCaricato: gasTypeName,
        quantitaGasCaricato: (item.qty_gas_recharged || 0).toString(),
        caricaMax: (item.max_charge || 0).toString(),
        modelloCompressore: item.compressor_model || '',
        matricolaCompressore: item.compressor_serial_num || '',
        numeroUnivoco: item.compressor_unique_num || '',
        serviziAggiuntivi: item.additional_services ? item.additional_services.split(',').map(s => s.trim()) : [],
        tipologiaGasRecuperato: recoveredGasTypeName,
        quantitaGasRecuperato: (item.qty_gas_recovered || 0).toString(),
        hasImages: images.length > 0,
        images
      };
    });
  };

  // Helper per mappare label compressore/gas al suo ID
  const getGasCompressorTypeId = (typeLabel: string): number => {
    if (!gasCompressorTypes || gasCompressorTypes.length === 0 || !typeLabel) return 0;
    const type = gasCompressorTypes.find(t => t && t.label && t.label.toLowerCase() === typeLabel.toLowerCase());
    return type ? type.id : 0;
  };

  const getRechargeableGasTypeId = (gasLabel: string): number => {
    if (!rechargeableGasTypes || rechargeableGasTypes.length === 0 || !gasLabel) return 0;
    const type = rechargeableGasTypes.find(t => t && t.label && t.label.toLowerCase() === gasLabel.toLowerCase());
    return type ? type.id : 0;
  };

  // Helper per determinare se mostrare campi recupero gas
  const shouldShowRecuperoGasFields = (item: EditableEquipmentItem): boolean => {
    return !(item.serviziAggiuntivi.length === 1 && item.serviziAggiuntivi[0] === 'Ricerca perdite');
  };

  // Helper per controllare se un testo è placeholder
  const isPlaceholderText = (text: string): boolean => {
    return text.startsWith('*') || text.includes('*') || text === '';
  };

  const getTextColorClass = (text: string): string => {
    return isPlaceholderText(text) ? 'text-gray-500' : 'text-gray-700';
  };

  // Carica mapping tipi gas/compressori per visualizzare i nomi
  useEffect(() => {
    const loadTypes = async () => {
      if (!token) {
        setIsLoadingTypes(false);
        return;
      }
      
      setIsLoadingTypes(true);
      try {
        const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };
        const [gcRes, rgRes] = await Promise.all([
          fetch('/api/gas-compressor-types', { headers }),
          fetch('/api/rechargeable-gas-types', { headers })
        ]);
        if (gcRes.ok) {
          const data = await gcRes.json();
          setGasCompressorTypes(Array.isArray(data) ? data : []);
        }
        if (rgRes.ok) {
          const data = await rgRes.json();
          setRechargeableGasTypes(Array.isArray(data) ? data : []);
        }
      } catch {
        // best effort: mantieni ID se fallisce
      } finally {
        setIsLoadingTypes(false);
      }
    };
    loadTypes();
  }, [token]);

  const getCompressorTypeName = (id?: number) => {
    if (!id) return '';
    return gasCompressorTypes.find(t => t.id === id)?.label || `ID: ${id}`;
  };

  const getRechargeableGasTypeName = (id?: number) => {
    if (!id) return '';
    return rechargeableGasTypes.find(t => t.id === id)?.label || `ID: ${id}`;
  };

  // Sincronizza gli stati editabili quando updatedReportData cambia
  useEffect(() => {
    setEditableWorkHours(updatedReportData.work_hours.toString().replace('.', ','));
    setEditableTravelHours(updatedReportData.travel_hours.toString().replace('.', ','));
    setEditableCustomerNotes(updatedReportData.customer_notes || '');
    setShowNotesField(!!updatedReportData.customer_notes);
  }, [updatedReportData]);

  // Inizializza editableItems quando i dati del report sono pronti
  useEffect(() => {
    // Aspetta che tutti i fetch siano completati prima di convertire
    // Non richiediamo più che i tipi abbiano length > 0, basta che il caricamento sia finito
    if (!isFetchingDetails && !isLoadingTypes && updatedReportData.items) {
      const converted = convertReportItemsToEditable(updatedReportData.items);
      setEditableItems(converted);
    }
  }, [updatedReportData.items, equipmentById, articleById, gasCompressorTypes, rechargeableGasTypes, isFetchingDetails, isLoadingTypes]);

  // Detecta modifiche non salvate
  useEffect(() => {
    const workHoursChanged = parseDecimalValue(editableWorkHours) !== updatedReportData.work_hours;
    const travelHoursChanged = parseDecimalValue(editableTravelHours) !== updatedReportData.travel_hours;
    const notesChanged = editableCustomerNotes !== (updatedReportData.customer_notes || '');
    
    // Controlla se gli items sono stati modificati (solo se canDeleteReport è true)
    const itemsChanged = canDeleteReport() && JSON.stringify(editableItems) !== JSON.stringify(convertReportItemsToEditable(updatedReportData.items || []));
    
    setHasUnsavedChanges(workHoursChanged || travelHoursChanged || notesChanged || itemsChanged);
  }, [editableWorkHours, editableTravelHours, editableCustomerNotes, editableItems, updatedReportData]);

 

  // Carica dettagli dell'intervento associato per controlli UI (es. eliminazione)
  useEffect(() => {
    const loadIntervention = async () => {
      if (!token || !updatedReportData?.intervention_id) return;
      
      try {
        const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };
        const res = await fetch(`/api/assistance-interventions/${updatedReportData.intervention_id}`, { headers });
        if (res.ok) {
          const data: AssistanceInterventionDetail = await res.json();
          setInterventionDetail(data);
        }
      } finally {
      }
    };
    loadIntervention();
  }, [token, updatedReportData?.intervention_id]);

  const canDeleteReport = (): boolean => {
    // Se non abbiamo info, lascia abilitato per retrocompatibilità
    if (!interventionDetail) return true;
    const label = (interventionDetail.status_label || '').toLowerCase();
    // Blocca per stati non cancellabili
    const blocked = [
      'completato',
      'non completato',
      'annullato',
      'fatturato',
      'collocamento'
    ];
    return !blocked.some(b => label.includes(b));
  };

  // Determina se i campi base (ore e note) sono modificabili
  // ECCEZIONE: questi campi sono modificabili anche con stato "completato"
  const canEditBasicFields = (): boolean => {
    if (!interventionDetail) return true;
    const label = (interventionDetail.status_label || '').toLowerCase();
    // Blocca solo per stati definitivi (escluso "completato" che è permesso)
    const blocked = [
      'non completato',
      'annullato',
      'fatturato',
      'collocamento'
    ];
    return !blocked.some(b => label.includes(b));
  };

  // Carica dettagli apparecchiature e articoli usati nel report
  useEffect(() => {
    if (!updatedReportData?.items) return;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Equipments
    const equipmentIds = Array.from(new Set(
      updatedReportData.items
        .map(i => i.equipment_id)
        .filter((v): v is number => typeof v === 'number' && v > 0)
    ));
    const missingEquipments = equipmentIds.filter(id => !equipmentById[id]);

    // Articles
    const articleIds = Array.from(new Set(
      updatedReportData.items.flatMap(i => (i.articles || []).map(a => a.article_id)).filter(Boolean)
    ));
    const missingArticles = articleIds.filter(id => !articleById[id]);

    const fetchAll = async () => {
      setIsFetchingDetails(true);
      try {
        // Batch fetch: prima fetcha tutti gli equipments
        const equipmentPromises = missingEquipments.map(async (id) => {
          const res = await fetch(`/api/equipments/${id}`, { headers });
          if (!res.ok) return null;
          const data: EquipmentDetail = await res.json();
          return { id, data };
        });

        // Poi fetcha tutti gli articles
        const articlePromises = missingArticles.map(async (id) => {
          const res = await fetch(`/api/articles/${encodeURIComponent(id)}`, { headers });
          if (!res.ok) return null;
          const data: Article = await res.json();
          return { id, data };
        });

        // Aspetta che TUTTI i fetch siano completati
        const [equipmentResults, articleResults] = await Promise.all([
          Promise.all(equipmentPromises),
          Promise.all(articlePromises)
        ]);

        // Aggiorna lo stato UNA VOLTA SOLA con tutti i dati
        const newEquipments: Record<number, EquipmentDetail> = {};
        equipmentResults.forEach(result => {
          if (result) newEquipments[result.id] = result.data;
        });
        if (Object.keys(newEquipments).length > 0) {
          setEquipmentById(prev => ({ ...prev, ...newEquipments }));
        }

        const newArticles: Record<string, Article> = {};
        articleResults.forEach(result => {
          if (result) newArticles[result.id] = result.data;
        });
        if (Object.keys(newArticles).length > 0) {
          setArticleById(prev => ({ ...prev, ...newArticles }));
        }
      } catch (error) {
        console.error('❌ Error fetching equipment/article details:', error);
        // best effort; in caso di errore si mostrano fallback
      } finally {
        setIsFetchingDetails(false);
      }
    };

    if (missingEquipments.length > 0 || missingArticles.length > 0) {
      fetchAll();
    }
  }, [updatedReportData, token]);

  // Funzioni per gestire gli items editabili
  const addEquipmentItem = () => {
    const newItem: EditableEquipmentItem = {
      id: Date.now().toString(),
      originalId: undefined, // Nuovo item senza ID dal DB
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
    setEditableItems([...editableItems, newItem]);
  };

  const removeEquipmentItem = (id: string) => {
    setEditableItems(editableItems.filter(item => item.id !== id));
  };

  const updateEquipmentItem = (id: string, field: keyof EditableEquipmentItem, value: unknown) => {
    setEditableItems(editableItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeArticleFromItem = (itemId: string, articleId: string) => {
    const item = editableItems.find(item => item.id === itemId)!;
    updateEquipmentItem(itemId, 'selectedArticles', 
      item.selectedArticles.filter(art => art.article.id !== articleId)
    );
  };

  const updateArticleQuantity = (itemId: string, articleId: string, quantity: number) => {
    const item = editableItems.find(item => item.id === itemId)!;
    updateEquipmentItem(itemId, 'selectedArticles',
      item.selectedArticles.map(art => 
        art.article.id === articleId ? { ...art, quantity } : art
      )
    );
  };

  const handleImageUpload = (itemId: string, fileInfo: { cdnUrl?: string; name?: string }) => {
    console.log('Uploadcare success for item:', itemId, fileInfo);
    if (fileInfo && fileInfo.cdnUrl) {
      const item = editableItems.find(item => item.id === itemId);
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

  const removeImageFromItem = (itemId: string, imageId: string) => {
    const item = editableItems.find(item => item.id === itemId);
    if (item) {
      const updatedImages = item.images.filter(img => img.id !== imageId);
      updateEquipmentItem(itemId, 'images', updatedImages);
    }
  };

  const handleServiziAggiuntiviToggle = (itemId: string, servizio: string) => {
    const item = editableItems.find(item => item.id === itemId);
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
        const alreadySelectedIds = editableItems.map(item => item.selectedEquipment?.id).filter(Boolean);
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

  // Ricerca ricambi
  const searchArticles = async (itemId: string, query: string = '') => {
    try {
      setIsSearchingArticles(prev => ({ ...prev, [itemId]: true }));
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`/api/articles?query=${encodeURIComponent(query)}`, { headers });
      if (response.ok) {
        const data = await response.json();
        const currentItem = editableItems.find(ei => ei.id === itemId);
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
    const planned = interventionData?.connected_articles?.find(a => a.id === articleId);
    return planned?.quantity ?? 0;
  };

  // Funzione per convertire canvas in blob
  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });
  };

  // Funzione per upload automatico tramite S3
  const uploadSignatureToS3 = async (signatureBlob: Blob): Promise<string> => {
    // Step 1: Richiedi presigned URL
    const presignedResponse = await fetch('/api/s3/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: `signature_${Date.now()}.png`,
        fileType: 'image/png',
        folder: 'intervention-signatures',
      }),
    });

    if (!presignedResponse.ok) {
      throw new Error('Errore durante la richiesta del presigned URL');
    }

    const { presignedUrl, fileUrl } = await presignedResponse.json();

    // Step 2: Carica il file su S3
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: signatureBlob,
      headers: {
        'Content-Type': 'image/png',
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Errore durante il caricamento su S3');
    }

    return fileUrl;
  };

  // Funzione per costruire il payload completo della PUT
  const buildCompletePayload = (signatureUrl: string): UpdateInterventionReportRequest => {
    // Usa editableItems se canDeleteReport() è true, altrimenti usa i dati originali
    const itemsToSave = canDeleteReport() && editableItems.length > 0 
      ? editableItems.map(item => ({
          id: item.originalId || 0, // 0 per nuovi items
          equipment_id: item.selectedEquipment?.id ?? 0,
          note: item.notes,
          fl_gas: item.hasGas,
          gas_compressor_types_id: getGasCompressorTypeId(item.tipologiaCompressore) || 0,
          is_new_installation: item.nuovaInstallazione === 'Sì',
          rechargeable_gas_types_id: getRechargeableGasTypeId(item.tipologiaGasCaricato) || 0,
          qty_gas_recharged: parseInt(item.quantitaGasCaricato) || 0,
          max_charge: parseInt(item.caricaMax) || 0,
          compressor_model: item.modelloCompressore || '',
          compressor_model_img_url: '', // TODO: implementare upload immagini
          compressor_serial_num: item.matricolaCompressore || '',
          compressor_serial_num_img_url: '', // TODO: implementare upload immagini
          compressor_unique_num: item.numeroUnivoco || '',
          compressor_unique_num_img_url: '', // TODO: implementare upload immagini
          additional_services: item.serviziAggiuntivi.length > 0 ? item.serviziAggiuntivi.join(', ') : '',
          recovered_rech_gas_types_id: shouldShowRecuperoGasFields(item) 
            ? (getRechargeableGasTypeId(item.tipologiaGasRecuperato) || 0)
            : 0,
          qty_gas_recovered: shouldShowRecuperoGasFields(item) 
            ? (parseInt(item.quantitaGasRecuperato) || 0)
            : 0,
          images: item.images.map(file => ({
            id: parseInt(file.id) || 0,
            file_name: file.name,
            file_url: file.url
          })),
          articles: item.selectedArticles.map(article => ({
            id: article.relationId || 0, // ✅ Usa l'ID esistente se disponibile, 0 per nuovi articoli
            article_id: article.article.id,
            quantity: article.quantity
          }))
        }))
      : updatedReportData.items?.map(item => ({
        id: item.id,
        equipment_id: item.equipment_id,
        note: item.note || '',
        fl_gas: item.fl_gas,
        gas_compressor_types_id: item.gas_compressor_types_id || 0,
        is_new_installation: item.is_new_installation,
        rechargeable_gas_types_id: item.rechargeable_gas_types_id || 0,
        qty_gas_recharged: item.qty_gas_recharged || 0,
        max_charge: item.max_charge || 0,
        compressor_model: item.compressor_model || '',
        compressor_model_img_url: item.compressor_model_img_url || '',
        compressor_serial_num: item.compressor_serial_num || '',
        compressor_serial_num_img_url: item.compressor_serial_num_img_url || '',
        compressor_unique_num: item.compressor_unique_num || '',
        compressor_unique_num_img_url: item.compressor_unique_num_img_url || '',
        additional_services: item.additional_services || '',
        recovered_rech_gas_types_id: item.recovered_rech_gas_types_id || 0,
        qty_gas_recovered: item.qty_gas_recovered || 0,
        images: item.images?.map(img => ({
          id: img.id || 0,
          file_name: img.file_name,
          file_url: img.file_url
        })) || [],
        articles: item.articles?.map(art => ({
          id: parseInt(art.id) || 0,
          article_id: art.article_id,
          quantity: art.quantity
        })) || []
        })) || [];

    return {
      work_hours: updatedReportData.work_hours,
      travel_hours: updatedReportData.travel_hours,
      customer_notes: updatedReportData.customer_notes || '',
      is_failed: updatedReportData.is_failed,
      failure_reason: updatedReportData.failure_reason || '',
      status: updatedReportData.status,
      signature_url: signatureUrl,
      items: itemsToSave
    };
  };

  // Funzione per aggiornare il rapportino tramite PUT
  const updateInterventionReport = async (payload: UpdateInterventionReportRequest) => {
    if (!token) {
      throw new Error('Token di autenticazione non disponibile');
    }

    const response = await fetch(`/api/intervention-reports/${updatedReportData.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Errore durante l\'aggiornamento del rapportino');
    }

    return await response.json();
  };

  // Funzione per ricaricare i dati del rapportino dal server
  const reloadReportData = async () => {
    if (!token) {
      throw new Error('Token di autenticazione non disponibile');
    }

    const response = await fetch(`/api/intervention-reports/${updatedReportData.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Errore durante il ricaricamento dei dati');
    }

    return await response.json();
  };

  // Funzioni per gestire la firma
  const clearSignature = () => {
    if (signatureRef && signatureRef.clear) {
      signatureRef.clear();
    }
  };

  const saveSignature = async () => {
    if (!signatureRef || signatureRef.isEmpty()) {
      setResultDialogType('error');
      setResultDialogMessage('Per favore, inserisci una firma prima di salvare.');
      setShowResultDialog(true);
      return;
    }

    try {
      setIsSavingSignature(true);

      // 1. Converti canvas in blob
      const signatureDataURL = signatureRef.toDataURL();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Impossibile ottenere il context del canvas');
      }
      
      const img = document.createElement('img');
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Errore caricamento immagine'));
        img.src = signatureDataURL;
      });

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const signatureBlob = await canvasToBlob(canvas);

      // 2. Upload automatico tramite S3
      console.log('🔄 Uploading signature to S3...');
      const uploadedSignatureUrl = await uploadSignatureToS3(signatureBlob);
      console.log('✅ Signature uploaded:', uploadedSignatureUrl);

      // 3. Costruisci payload completo
      const payload = buildCompletePayload(uploadedSignatureUrl);
      console.log('📤 Updating intervention report with signature...');

      // 4. Chiama PUT per aggiornare il rapportino
      await updateInterventionReport(payload);
      console.log('✅ Report updated successfully');

      // 5. Ricarica i dati freschi dal server per aggiornare il componente
      console.log('🔄 Reloading fresh data from server...');
      const freshReportData = await reloadReportData();
      console.log('✅ Fresh data loaded:', freshReportData);
      
      // 6. Aggiorna lo stato locale con i dati freschi
      setUpdatedReportData(freshReportData);
      setShowSignatureDialog(false);

      setResultDialogType('success');
      setResultDialogMessage('Firma o documento salvato con successo!');
      setShowResultDialog(true);

    } catch (error) {
      console.error('❌ Error saving signature:', error);
      setResultDialogType('error');
      setResultDialogMessage(error instanceof Error ? error.message : 'Errore durante il salvataggio della firma o documento.');
      setShowResultDialog(true);
    } finally {
      setIsSavingSignature(false);
    }
  };

  // Funzione per gestire l'upload diretto di file (immagini o PDF)
  const handleFileUpload = async (fileInfo: { cdnUrl: string; name: string; type: string }) => {
    try {
      setIsSavingSignature(true);
      console.log('🔄 Saving uploaded file as signature:', fileInfo);

      // 1. Costruisci payload completo con l'URL del file caricato
      const payload = buildCompletePayload(fileInfo.cdnUrl);
      console.log('📤 Updating intervention report with uploaded file...');

      // 2. Chiama PUT per aggiornare il rapportino
      await updateInterventionReport(payload);
      console.log('✅ Report updated successfully');

      // 3. Ricarica i dati freschi dal server
      console.log('🔄 Reloading fresh data from server...');
      const freshReportData = await reloadReportData();
      console.log('✅ Fresh data loaded:', freshReportData);
      
      // 4. Aggiorna lo stato locale con i dati freschi
      setUpdatedReportData(freshReportData);

      setResultDialogType('success');
      setResultDialogMessage('Documento caricato e salvato con successo!');
      setShowResultDialog(true);

    } catch (error) {
      console.error('❌ Error saving uploaded file:', error);
      setResultDialogType('error');
      setResultDialogMessage(error instanceof Error ? error.message : 'Errore durante il salvataggio del documento.');
      setShowResultDialog(true);
    } finally {
      setIsSavingSignature(false);
    }
  };

  const openSignatureDialog = () => {
    setShowSignatureDialog(true);
  };

  // Funzione per salvare le modifiche al rapportino
  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges || isSaving || !canEditBasicFields()) return;

    try {
      setIsSaving(true);
      console.log('💾 Salvataggio modifiche rapportino...');

      // Costruisci il payload aggiornato con i nuovi valori
      const payload = buildCompletePayload(updatedReportData.signature_url || '');
      
      // Sovrascrivi con i valori modificati (converti stringhe con virgola in numeri)
      payload.work_hours = parseDecimalValue(editableWorkHours);
      payload.travel_hours = parseDecimalValue(editableTravelHours);
      payload.customer_notes = editableCustomerNotes;

      console.log('📤 Payload aggiornato:', payload);

      // Chiama la PUT per aggiornare il rapportino
      await updateInterventionReport(payload);
      console.log('✅ Modifiche salvate con successo');

      // Ricarica i dati freschi dal server
      console.log('🔄 Ricaricamento dati aggiornati...');
      const freshReportData = await reloadReportData();
      console.log('✅ Dati ricaricati:', freshReportData);
      
      // Aggiorna lo stato locale
      setUpdatedReportData(freshReportData);
      
      // Mostra notifica di successo
      setResultDialogType('success');
      setResultDialogMessage('Modifiche salvate con successo!');
      setShowResultDialog(true);

    } catch (error) {
      console.error('❌ Errore durante il salvataggio:', error);
      setResultDialogType('error');
      setResultDialogMessage(error instanceof Error ? error.message : 'Errore durante il salvataggio delle modifiche.');
      setShowResultDialog(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      // Verifica che il token sia disponibile
      if (!token) {
        setResultDialogType('error');
        setResultDialogMessage('Errore di autenticazione. Effettuare il login.');
        setShowResultDialog(true);
        return;
      }

      const response = await fetch(`/api/intervention-reports/${updatedReportData.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'accept': 'application/json',
        },
      });

      if (response.ok) {
        setResultDialogType('success');
        setResultDialogMessage('Rapportino eliminato con successo!');
        setShowResultDialog(true);
        setShouldRedirectOnClose(true);
        console.log('✅ Eliminazione riuscita - flag redirect impostato a true');
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Errore durante l\'eliminazione del rapportino.';
        setResultDialogType('error');
        setResultDialogMessage(errorMessage);
        setShowResultDialog(true);
        console.error('❌ Error deleting report:', response.status, errorData);
      }
    } catch (error) {
      console.error('❌ Errore durante la richiesta di eliminazione:', error);
      setResultDialogType('error');
      setResultDialogMessage('Errore durante la richiesta di eliminazione.');
      setShowResultDialog(true);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-teal-600 text-white px-4 md:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl">
                Rapportino Intervento #{updatedReportData.intervention_id}
              </h1>
              {/* Nome Cliente */}
              {interventionData?.company_name && (
                <p className="text-teal-100 mt-1 font-bold">
                  {interventionData.company_name}
                </p>
              )}
              {/* Tipologia Intervento */}
              {interventionData?.type_label && (
                <p className="text-teal-100 text-sm md:text-base mt-1 font-medium">
                  {interventionData.type_label}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Pulsante Salva - visibile se i campi base sono modificabili */}
              {canEditBasicFields() && (
                <button
                  onClick={handleSaveChanges}
                  disabled={!hasUnsavedChanges || isSaving}
                  className="flex items-center gap-2 bg-white text-teal-600 px-4 py-2 rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-teal-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Salva
                    </>
                  )}
                </button>
              )}
              
              {/* Badge Intervento Fallito */}
              {updatedReportData.is_failed && (
                <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg border-2 border-red-400 shadow-lg">
                  <XCircle size={20} className="text-red-200" />
                  <span className="font-bold text-sm md:text-base">INTERVENTO FALLITO</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Data di creazione sotto al titolo */}
        <div className="mb-6">
          <p className="text-gray-600 text-sm">
            Creato il {formatDate(updatedReportData.created_at)}
          </p>
        </div>

        {/* Sezione Firma Cliente */}
        <SignatureSection
          signatureUrl={updatedReportData.signature_url}
          status={updatedReportData.status}
          isSavingSignature={isSavingSignature}
          onOpenSignatureDialog={openSignatureDialog}
        />

        {/* Informazioni principali */}
        <BasicInfoSection
          editableWorkHours={editableWorkHours}
          editableTravelHours={editableTravelHours}
          editableCustomerNotes={editableCustomerNotes}
          showNotesField={showNotesField}
          interventionId={updatedReportData.intervention_id}
          isFailed={updatedReportData.is_failed}
          failureReason={updatedReportData.failure_reason}
          canEditBasicFields={canEditBasicFields()}
          onWorkHoursChange={setEditableWorkHours}
          onTravelHoursChange={setEditableTravelHours}
          onCustomerNotesChange={setEditableCustomerNotes}
          onShowNotesField={() => setShowNotesField(true)}
        />

        {/* Apparecchiature e ricambi */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Apparecchiature e Ricambi</h2>
          
          {/* Mostra spinner durante il caricamento dei dettagli o dei tipi */}
          {isFetchingDetails || isLoadingTypes ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 text-sm">Caricamento dati apparecchiature e ricambi...</p>
            </div>
          ) : (
            <>
              {/* Rendering condizionale: editabile se canDeleteReport() è true */}
              {canDeleteReport() ? (
            /* VERSIONE EDITABILE */
            <div className="space-y-6">
              {editableItems.map((item, index) => (
                <EquipmentItemEditable
                  key={item.id}
                  item={item}
                  index={index}
                  equipmentSearchQueries={equipmentSearchQueries}
                  articleSearchQueries={articleSearchQueries}
                  onOpenEquipmentDialog={(itemId) => {
                    setShowEquipmentSelectorDialogs(prev => ({ ...prev, [itemId]: true }));
                    searchEquipments(itemId, equipmentSearchQueries[itemId] || '');
                  }}
                  onOpenArticleDialog={(itemId) => {
                    setShowArticleSelectorDialogs(prev => ({ ...prev, [itemId]: true }));
                    searchArticles(itemId, articleSearchQueries[itemId] || '');
                  }}
                  onRemoveEquipment={() => removeEquipmentItem(item.id)}
                  onUpdateItem={(field, value) => updateEquipmentItem(item.id, field, value)}
                  onRemoveArticle={(articleId) => removeArticleFromItem(item.id, articleId)}
                  onUpdateArticleQuantity={(articleId, quantity) => updateArticleQuantity(item.id, articleId, quantity)}
                  onImageUpload={(fileInfo) => handleImageUpload(item.id, fileInfo)}
                  onRemoveImage={(imageId) => removeImageFromItem(item.id, imageId)}
                  onToggleServizio={(servizio) => handleServiziAggiuntiviToggle(item.id, servizio)}
                  getPlannedArticleQty={getPlannedArticleQty}
                  shouldShowRecuperoGasFields={() => shouldShowRecuperoGasFields(item)}
                  getTextColorClass={getTextColorClass}
                  lightboxUrl={lightboxUrl}
                  setLightboxUrl={setLightboxUrl}
                  allItems={editableItems}
                  gasCompressorTypes={gasCompressorTypes}
                  rechargeableGasTypes={rechargeableGasTypes}
                />
              ))}
              
              <button
                onClick={addEquipmentItem}
                className="bg-teal-100 hover:bg-teal-200 text-teal-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors mb-6"
              >
                <Plus size={16} />
                Aggiungi apparecchiatura
              </button>
                        </div>
          ) : (
            /* VERSIONE READ-ONLY */
            updatedReportData.items && updatedReportData.items.length > 0 ? (
              <div className="space-y-6">
                {updatedReportData.items.map((item) => (
                  <EquipmentItemReadOnly
                    key={item.id}
                    item={item}
                    equipmentById={equipmentById}
                    articleById={articleById}
                    getCompressorTypeName={getCompressorTypeName}
                    getRechargeableGasTypeName={getRechargeableGasTypeName}
                    formatAdditionalServices={formatAdditionalServices}
                    setLightboxUrl={setLightboxUrl}
                  />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">Nessuna apparecchiatura registrata per questo rapportino</div>
            )
          )}
            </>
          )}
        </div>

        {/* Pulsanti azione */}
        <div className="mt-6 flex justify-end gap-3">
          {updatedReportData.status === 'DRAFT' && (
            <button
              onClick={openSignatureDialog}
              disabled={isSavingSignature}
              className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSavingSignature ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <PenTool size={16} />
                  {updatedReportData.signature_url ? 'Modifica Firma o Documento' : 'Firma o importa documento'}
                </>
              )}
            </button>
          )}
          {canDeleteReport() && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Trash2 size={16} />
              Elimina rapportino
            </button>
          )}
        </div>
      </div>

      {/* Dialog selezione apparecchiature e ricambi */}
      {canDeleteReport() && editableItems.map((item) => (
        <React.Fragment key={`dialogs-${item.id}`}>
          {showEquipmentSelectorDialogs[item.id] && (
            <EquipmentSelectorDialog
              itemId={item.id}
              interventionData={interventionData}
              equipmentSearchQuery={equipmentSearchQueries[item.id] || ''}
              setEquipmentSearchQuery={(query) => setEquipmentSearchQueries(prev => ({ ...prev, [item.id]: query }))}
              equipmentsResults={equipmentsResults[item.id] || []}
              isSearching={isSearchingEquipments[item.id] || false}
              onSearch={(query) => searchEquipments(item.id, query)}
              onSelect={(equipment) => {
                updateEquipmentItem(item.id, 'selectedEquipment', equipment);
                setEquipmentSearchQueries(prev => ({ ...prev, [item.id]: '' }));
                setShowEquipmentSelectorDialogs(prev => ({ ...prev, [item.id]: false }));
              }}
              onClose={() => setShowEquipmentSelectorDialogs(prev => ({ ...prev, [item.id]: false }))}
              alreadySelectedEquipmentIds={editableItems
                .filter(ei => ei.id !== item.id)
                .map(ei => ei.selectedEquipment?.id)
                .filter((id): id is number => typeof id === 'number')
              }
            />
          )}

          {showArticleSelectorDialogs[item.id] && (
            <ArticleSelectorDialog
              itemId={item.id}
              interventionData={interventionData}
              articleSearchQuery={articleSearchQueries[item.id] || ''}
              setArticleSearchQuery={(query) => setArticleSearchQueries(prev => ({ ...prev, [item.id]: query }))}
              articleResults={articleResults[item.id] || []}
              isSearching={isSearchingArticles[item.id] || false}
              onSearch={(query) => searchArticles(item.id, query)}
              onSelect={(article) => {
                const newSelectedArticles = [...item.selectedArticles, { article, quantity: 1 }];
                updateEquipmentItem(item.id, 'selectedArticles', newSelectedArticles);
                setShowArticleSelectorDialogs(prev => ({ ...prev, [item.id]: false }));
              }}
              onClose={() => setShowArticleSelectorDialogs(prev => ({ ...prev, [item.id]: false }))}
              selectedArticles={item.selectedArticles}
            />
          )}
        </React.Fragment>
      ))}

      {/* Dialog Firma */}
      <SignatureDialog
        isOpen={showSignatureDialog}
        isSaving={isSavingSignature}
        signatureRef={signatureRef}
        setSignatureRef={setSignatureRef}
        onClose={() => setShowSignatureDialog(false)}
        onClear={clearSignature}
        onSave={saveSignature}
        onFileUpload={handleFileUpload}
      />

      {/* Dialog Conferma Eliminazione */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {/* Dialog Risultato */}
      <ResultDialog
        isOpen={showResultDialog}
        type={resultDialogType}
        message={resultDialogMessage}
        shouldRedirectOnClose={shouldRedirectOnClose}
        interventionId={updatedReportData.intervention_id}
        onClose={() => setShowResultDialog(false)}
      />

      {/* Lightbox immagine a tutto schermo */}
      <Lightbox imageUrl={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
} 
