'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Download, RefreshCw, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import CustomerSectionDetail from './components/detail/CustomerSectionDetail';
import InterventionDetailsSectionDetail from './components/detail/InterventionDetailsSectionDetail';
import CallDetailsSectionDetail from './components/detail/CallDetailsSectionDetail';
import InterventionStatusAndActions from './components/InterventionStatusAndActions';
import { Equipment } from '../../types/equipment';
import { ArticleListItem } from '../../types/article';
import { AssistanceInterventionDetail, UpdateAssistanceInterventionRequest } from '../../types/assistance-interventions';
import { fetchAssistanceInterventionDetail, updateAssistanceIntervention, downloadAssistanceInterventionPDF, downloadPDFFile } from '../../utils/assistance-interventions-api';
import CreaRapportino from './CreaRapportino';
import CancelInterventionButton from './components/small_components/CancelInterventionButton';
import { getStatusId, toStatusKey } from '../../utils/intervention-status';

interface DettaglioInterventoProps {
  isOpen: boolean;
  onClose: () => void;
  interventionId: number;
  onInterventionUpdated?: () => void;
}

interface SelectedArticle {
  article: ArticleListItem;
  quantity: number;
  allocations?: Array<{
    warehouse_id: string;
    warehouse_description: string;
    quantity: number;
  }>;
}

interface User {
  id: string;
  name: string;
  surname: string | null;
  fiscal_code: string | null;
  email: string;
  phone_number: string | null;
  note: string | null;
  disabled: boolean;
  status: string;
  role: string | null;
}

// Interfaccia per le informazioni utente corrente
interface UserInfo {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone_number: string;
  role: string;
}

// Definisco i tipi per il dialog di successo/errore
interface DialogState {
  isOpen: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

// Tipo semplificato per il report esistente basato sui dati dal payload
interface SimpleReport {
  id: number;
  is_failed: boolean;
}

export default function DettaglioIntervento({ isOpen, onClose, interventionId, onInterventionUpdated }: DettaglioInterventoProps) {
  const auth = useAuth();
  // Stato per caricare i dati dell'intervento
  const [isLoading, setIsLoading] = useState(true);
  const [interventionData, setInterventionData] = useState<AssistanceInterventionDetail | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('da_assegnare');
  // Stati per i campi obbligatori
  const [ragioneSociale, setRagioneSociale] = useState('');
  const [destinazione, setDestinazione] = useState('');
  const [tipologiaIntervento, setTipologiaIntervento] = useState('');
  const [zona, setZona] = useState('');
  const [data, setData] = useState('');
  const [orarioIntervento, setOrarioIntervento] = useState('');
  // Stato per customer ID selezionato
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  // Stato per tracciare se le destinazioni sono state caricate ma sono vuote
  const [customerLocationsLoaded, setCustomerLocationsLoaded] = useState(false);
  const [hasCustomerLocations, setHasCustomerLocations] = useState(false);
  // Stati per l'orario intervento specifico
  const [oraInizio, setOraInizio] = useState('');
  const [oraFine, setOraFine] = useState('');
  // Stato per servizio domicilio
  const [servizioDomicilio, setServizioDomicilio] = useState('Si');
  const [scontoServizioDomicilio, setScontoServizioDomicilio] = useState(false);
  // Stato per preventivo
  const [preventivo, setPreventivo] = useState(0);
  // Campi auto-compilati dal cliente selezionato
  const [codiceCliente, setCodiceCliente] = useState('');
  const [telefonoFisso, setTelefonoFisso] = useState('');
  const [numeroCellulare, setNumeroCellulare] = useState('');
  // Campi auto-compilati dall'utente loggato
  const [nomeOperatore, setNomeOperatore] = useState('');
  const [ruoloOperatore, setRuoloOperatore] = useState('');
  // Nuovi stati per i dati del creatore dell'intervento
  const [dataCreazione, setDataCreazione] = useState('');
  // Nuovi stati per InterventionDetailsSection
  const [selectedEquipments, setSelectedEquipments] = useState<Equipment[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<SelectedArticle[]>([]);
  const [orarioApertura, setOrarioApertura] = useState('');
  const [noteInterne, setNoteInterne] = useState('');
  // Nuovi stati per CallDetailsSection
  const [selectedTechnician, setSelectedTechnician] = useState<User | null>(null);
  const [codiceChiamata, setCodiceChiamata] = useState('');
  // Stato per il dialog di risultato
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });
  // Stato per il download PDF
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  // Stato per l'autosave
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  // Flag per distinguere il caricamento iniziale dalle modifiche utente
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // Stati per la gestione utente e ruoli
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  // Stato per il componente CreaRapportino
  const [showCreaRapportino, setShowCreaRapportino] = useState(false);
  // Stato per il rapportino esistente - uso tipo semplificato
  const [existingReport, setExistingReport] = useState<SimpleReport | null>(null);
  const [isCheckingReport] = useState(false);
  // Stato per il caricamento visualizzazione rapporto
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  // Stato per il refresh dei dati
  const [isRefreshing, setIsRefreshing] = useState(false);


  // Funzione per caricare i dettagli del cliente
  const loadCustomerDetails = async (customerId: number) => {
    try {
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/customers/${customerId}`, {
        headers,
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // Proviamo ad accedere ai dati in modi diversi
        const customerData = responseData.data || responseData; // Potrebbe essere annidato in .data
        
        // Verifica se i campi esistono
        if (customerData.client_code !== undefined) {
        } else {
        }
        
        if (customerData.phone_number !== undefined) {
        } else {
        }
        
        if (customerData.mobile_phone_number !== undefined) {
        } else {
        }
        
        // Popola i campi del cliente
        const clientCode = customerData.client_code || '';
        const phoneNumber = customerData.phone_number || '';
        const mobileNumber = customerData.mobile_phone_number || '';

        setCodiceCliente(clientCode);
        setTelefonoFisso(phoneNumber);
        setNumeroCellulare(mobileNumber);

      } else {
        const errorText = await response.text();
        console.error('❌ Error loading customer details:', response.status, errorText);
        // In caso di errore, lascia i campi vuoti
        setCodiceCliente('');
        setTelefonoFisso('');
        setNumeroCellulare('');
      }
    } catch (error) {
      console.error('❌ Error loading customer details:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      // In caso di errore, lascia i campi vuoti
      setCodiceCliente('');
      setTelefonoFisso('');
      setNumeroCellulare('');
    }
  };

  // Funzione per caricare i dati del creatore dell'intervento
  const loadCreatorDetails = async (createdBy: string) => {
    try {
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/users/${createdBy}`, {
        headers,
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // Basandomi sulla struttura API fornita, la risposta è direttamente l'oggetto utente
        const creatorData = responseData;
        
        // Popola i campi dell'operatore creatore
        const fullName = creatorData.surname 
          ? `${creatorData.name} ${creatorData.surname}` 
          : creatorData.name || '';
        const role = creatorData.role || '';
        
        setNomeOperatore(fullName);
        setRuoloOperatore(role);
        
      } else {
        const errorText = await response.text();
        console.error('❌ Error loading creator details:', response.status, errorText);
        // In caso di errore, lascia i campi vuoti
        setNomeOperatore('');
        setRuoloOperatore('');
      }
    } catch (error) {
      console.error('❌ Error loading creator details:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      // In caso di errore, lascia i campi vuoti
      setNomeOperatore('');
      setRuoloOperatore('');
    }
  };

  // Funzione per caricare i dati dell'intervento
  const loadInterventionData = async () => {
    try {
      setIsLoading(true);
      setIsInitialLoad(true); // Inizio caricamento iniziale
      const data = await fetchAssistanceInterventionDetail(interventionId, auth.token || '');
      setInterventionData(data);
      
      // Carica i dettagli del cliente PRIMA di settare gli altri campi
      if (data.customer_id) {
        await loadCustomerDetails(data.customer_id);
      } else {
        console.warn('⚠️ No customer_id found in intervention data:', data);
      }

      // Carica i dettagli del creatore dell'intervento
      if (data.created_by) {
        await loadCreatorDetails(data.created_by);
      } else {
        console.warn('⚠️ No created_by found in intervention data:', data);
      }

      // Gestione data di creazione
      if (data.created_at) {
        
        try {
          const createdDate = new Date(data.created_at);
          if (!isNaN(createdDate.getTime())) {
            const formattedCreatedDate = createdDate.toLocaleDateString('it-IT');
            setDataCreazione(formattedCreatedDate);
          } else {
            console.error('❌ Invalid created_at date:', data.created_at);
            setDataCreazione('');
          }
        } catch (error) {
          console.error('❌ Error formatting created_at date:', error);
          setDataCreazione('');
        }
      } else {
        console.warn('⚠️ No created_at found in API response');
        setDataCreazione('');
      }
      
      // Popola tutti i campi con i dati ricevuti
      setSelectedStatus(toStatusKey(data.status_label));
      setRagioneSociale(data.company_name);
      setTipologiaIntervento(data.type_id.toString());
      setZona(data.zone_id.toString());
      setSelectedCustomerId(data.customer_id);  
      setDestinazione(data.customer_location_id || '');
      setServizioDomicilio(data.flg_home_service ? 'Si' : 'No');
      setScontoServizioDomicilio(data.flg_discount_home_service);
      setPreventivo(parseFloat(String(data.quotation_price)) || 0);
      setOrarioApertura(data.opening_hours || '');
      setNoteInterne(data.internal_notes || '');
      
      setCodiceChiamata(data.call_code);
      
      // Gestione data e orari
      if (data.date) {
        
        // Formattiamo la data per essere compatibile con input di tipo date (YYYY-MM-DD)
        let formattedDate = '';
        try {
          if (typeof data.date === 'string' && data.date.trim()) {
            // Se è già nel formato YYYY-MM-DD, usa direttamente
            if (data.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
              formattedDate = data.date;
            } else {
              // Altrimenti, prova a parsare e formattare
              const dateObj = new Date(data.date);
              if (!isNaN(dateObj.getTime())) {
                formattedDate = dateObj.toISOString().split('T')[0];
              }
            }
          }
        } catch (error) {
          console.error('❌ Error formatting date:', error);
        }
        
        setData(formattedDate);
      } else {
        setData('');
      }
      if (data.time_slot) {
        setOrarioIntervento(data.time_slot);
      }
      
      // Estrazione ore da datetime
      if (data.from_datetime && data.to_datetime) {
        const fromTime = new Date(data.from_datetime).toTimeString().substring(0, 5);
        const toTime = new Date(data.to_datetime).toTimeString().substring(0, 5);
        setOraInizio(fromTime);
        setOraFine(toTime);
      }
      
      // Gestione equipaggiamenti e articoli collegati
      if (data.connected_equipment) {
        const equipments: Equipment[] = data.connected_equipment.map(eq => ({
          id: eq.id,
          model: eq.model,
          description: eq.description,
          serial_number: eq.serial_number,
          linked_serials: eq.linked_serials ?? null,
          brand_name: eq.brand_name || '',
          subfamily_name: eq.subfamily_name || '',
          customer_name: eq.customer_name || ''
        }));
        setSelectedEquipments(equipments);
      }
      
      if (data.connected_articles) {
        const articles: SelectedArticle[] = data.connected_articles.map(art => ({
          article: {
            id: art.id.toString(),
            pnc_code: art.pnc_code,
            short_description: art.short_description,
            description: art.description,
            model: null,
            order_date: null,
            estimate_arrival_date: null,
            alternative_pnc_code: null,
            place_type_id: null,
            place_id: null,
            created_at: '',
            updated_at: '',
            brand_id: 0,
            family_id: '',
            subfamily_id: null,
            family_label: '',
            subfamily_label: null,
            brand_label: '',
            inventory: [],
            quantity_stock: null,
            quantity_reserved_client: null,
            quantity_ordered: null,
            warehouse_description: null,
            suppliers: null
          },
          quantity: art.quantity || 1 // Usa la quantità dall'API, fallback a 1 se non presente
        }));
        setSelectedArticles(articles);
      }
      
      // Il tecnico assegnato verrà gestito nei componenti figli
      if (data.assigned_to) {
        setSelectedTechnician({
          id: data.assigned_to,
          name: data.assigned_to_name,
          surname: data.assigned_to_surname || null,
          fiscal_code: null,
          email: '',
          phone_number: null,
          note: null,
          disabled: false,
          status: 'active',
          role: null
        });
      }
      
    } catch (error) {
      console.error('❌ Error loading intervention data:', error);
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Errore nel caricamento',
        message: 'Impossibile caricare i dati dell\'intervento. Riprova.'
      });
    } finally {
      setIsLoading(false);
      // Fine caricamento iniziale - ora le modifiche future sono dell'utente
      setTimeout(() => {
        setIsInitialLoad(false);
      }, 500); // Piccolo delay per assicurarsi che tutti gli stati siano settati
    }
  };

  // Carica i dati quando il componente si monta o l'ID cambia
  useEffect(() => {
    if (isOpen && interventionId) {
      loadInterventionData();
    }
  }, [isOpen, interventionId]);

  // Allineamento: nessun ricalcolo client-side dello status; si usa quello del server

  // AutoSave con debounce su tutti i campi modificabili
  useEffect(() => {
    // Reset errore autosave quando l'utente modifica qualcosa
    if (autoSaveError) {
      setAutoSaveError(null);
    }

    // Non fare autosave se siamo in fase di caricamento iniziale
    if (isInitialLoad) {
      return;
    }

    const timer = setTimeout(() => {
      // Solo se il componente è aperto e ci sono dati caricati
      if (isOpen && interventionData && !isLoading) {
        autoSave();
      }
    }, 2000); // 2 secondi di debounce

    return () => clearTimeout(timer);
  }, [
    // Campi modificabili che devono triggerare autosave
    destinazione,
    tipologiaIntervento,
    zona,
    data,
    orarioIntervento,
    oraInizio,
    oraFine,
    servizioDomicilio,
    scontoServizioDomicilio,
    preventivo,
    orarioApertura,
    noteInterne,
    selectedTechnician?.id,
    selectedEquipments,
    selectedArticles,
    // Dipendenze per autoSave
    isOpen,
    interventionData,
    isLoading
    // Rimosso isInitialLoad dalle dipendenze per evitare autosave all'apertura
  ]);

  // Funzione per verificare se tutti i campi obbligatori sono compilati
  const isFormValid = () => {
    // Validazione base - data e orario non sono più obbligatori
    const baseValid = ragioneSociale && tipologiaIntervento && zona;
    
    // Per la destinazione: è valida se:
    // 1. È compilata, OPPURE
    // 2. Le location sono state caricate ma sono vuote (cliente senza destinazioni)
    // Se un cliente è selezionato ma le location non sono ancora state caricate, non è valido
    const destinationValid = destinazione || (selectedCustomerId && customerLocationsLoaded && !hasCustomerLocations);
    
    // Validazione incrociata data/orario:
    // - Se c'è data DEVE esserci anche orario
    // - Se c'è orario DEVE esserci anche data
    const dateTimeValid = (!data && !orarioIntervento) || (data && orarioIntervento);
    
    return baseValid && destinationValid && dateTimeValid;
  };

  // Funzione per costruire datetime string
  const buildDateTime = (date: string, timeSlot: string, specificTime?: string): string => {
    if (!date) {
      console.warn('⚠️ buildDateTime called with empty date');
      return '';
    }
    
    if (timeSlot === 'fascia_oraria' && specificTime) {
      const result = `${date}T${specificTime}:00`;
      return result;
    } else if (timeSlot === 'mattina') {
      const result = `${date}T08:00:00`; // 8:00  
      return result;
    } else if (timeSlot === 'pomeriggio') {
      const result = `${date}T14:00:00`; // 14:00
      return result;
    } else if (timeSlot === 'tutto_il_giorno') {
      const result = `${date}T08:00:00`; // 8:00
      return result;
    } else {
      // Default fallback per time slots vuoti o non riconosciuti - usa la mattina
      const result = `${date}T08:00:00`;
      return result;
    }
  };

  // Funzione per costruire datetime di fine
  const buildEndDateTime = (date: string, timeSlot: string, specificTime?: string): string => {
    if (!date) {
      console.warn('⚠️ buildEndDateTime called with empty date');
      return '';
    }
    
    if (timeSlot === 'fascia_oraria' && specificTime) {
      const result = `${date}T${specificTime}:00`;
      return result;
    } else if (timeSlot === 'mattina') {
      const result = `${date}T13:00:00`; // 13:00
      return result;
    } else if (timeSlot === 'pomeriggio') {
      const result = `${date}T18:00:00`; // 18:00
      return result;
    } else if (timeSlot === 'tutto_il_giorno') {
      const result = `${date}T18:00:00`; // 18:00
      return result;
    } else {
      // Default fallback per time slots vuoti o non riconosciuti - usa la mattina
      const result = `${date}T13:00:00`;
      return result;
    }
  };

  // Funzione per autosave (senza dialoghi)
  const autoSave = async () => {
    if (!isFormValid()) {
      return;
    }

    // Validazione aggiuntiva per l'autosave
    if (orarioIntervento === 'fascia_oraria' && (!oraInizio || !oraFine)) {
      return;
    }

    if (!selectedCustomerId || !tipologiaIntervento || !zona) {
      return;
    }

    try {
      setAutoSaveError(null);

      const requestData: UpdateAssistanceInterventionRequest = {
        customer_id: selectedCustomerId || 0,
        type_id: parseInt(tipologiaIntervento) || 0,
        zone_id: parseInt(zona) || 0,
        customer_location_id: destinazione || '',
        flg_home_service: servizioDomicilio === 'Si',
        flg_discount_home_service: servizioDomicilio === 'Si' ? scontoServizioDomicilio : false,
        date: data || null,
        time_slot: orarioIntervento || null,
        from_datetime: data && orarioIntervento ? buildDateTime(data, orarioIntervento, oraInizio) : null,
        to_datetime: data && orarioIntervento 
          ? (orarioIntervento === 'fascia_oraria' 
              ? buildDateTime(data, orarioIntervento, oraFine) 
              : buildEndDateTime(data, orarioIntervento))
          : null,
        quotation_price: preventivo,
        opening_hours: orarioApertura,
        assigned_to: selectedTechnician?.id || '',
        call_code: codiceChiamata,
        internal_notes: noteInterne,
        status_id: interventionData?.status_id ?? (getStatusId(selectedStatus) ?? 1),
        equipments: selectedEquipments.map(eq => eq.id),
        articles: selectedArticles.map(art => ({
          article_id: art.article.id,
          quantity: art.quantity
        }))
      };

      await updateAssistanceIntervention(interventionId, requestData, auth.token || '');
      
      // 🆕 Ricarica i dati dell'intervento per aggiornare l'UI con eventuali modifiche server-side
      setIsInitialLoad(true); // Previeni ulteriori autosave durante il reload
      
      try {
        const updatedData = await fetchAssistanceInterventionDetail(interventionId, auth.token || '');
        setInterventionData(updatedData);
        
        // Aggiorna lo status usando la label del server
        const newKey = toStatusKey(updatedData.status_label);
        if (newKey !== selectedStatus) {
          setSelectedStatus(newKey);
        }
        
      } catch (reloadError) {
        console.error('❌ AutoSave: Error reloading data:', reloadError);
        // Non blocchiamo l'operazione se il reload fallisce
      } finally {
        // Riattiva gli autosave dopo un breve delay
        setTimeout(() => {
          setIsInitialLoad(false);
        }, 500);
      }

      // Notifica il parent component dell'aggiornamento
      if (onInterventionUpdated) {
        onInterventionUpdated();
      }
    } catch (error) {
      console.error('❌ AutoSave error:', error);
      setAutoSaveError('Errore nel salvataggio automatico');
    } finally {
    }
  };

  // Funzione per scaricare il PDF
  const downloadPDF = async () => {
    try {
      setIsDownloadingPDF(true);
      
      const pdfBlob = await downloadAssistanceInterventionPDF(interventionId, auth.token || '');
      downloadPDFFile(pdfBlob, `intervento-${interventionId}.pdf`);
      
    } catch (error) {
      console.error('❌ Error downloading PDF:', error);
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Errore download PDF',
        message: 'Impossibile scaricare il PDF dell\'intervento. Riprova.'
      });
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Funzione per gestire il caricamento delle destinazioni del cliente
  const handleCustomerLocationsLoaded = (hasLocations: boolean) => {
    setCustomerLocationsLoaded(true);
    setHasCustomerLocations(hasLocations);
  };

  // Funzione per chiudere il dialog
  const closeDialog = () => {
    setDialog({ ...dialog, isOpen: false });
  };

  // Disabilita/abilita lo scroll del body quando il modal è aperto/chiuso
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup: ripristina lo scroll quando il componente viene smontato
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Funzione per recuperare le informazioni dell'utente
  const fetchUserInfo = async () => {
    try {
      setUserLoading(true);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch('/api/auth/me', {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Sessione scaduta, effettuando logout');    
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch user info');
      }
      
      const userData: UserInfo = await response.json();
      setUserInfo(userData);
    } catch (err) {
      console.error('Error fetching user info:', err);
    } finally {
      setUserLoading(false);
    }
  };

  // Funzione per determinare se l'utente è amministratore
  const isAdmin = () => {
    return userInfo?.role === 'amministrazione';
  };

  // Funzione per determinare se l'utente è tecnico
  const isTechnician = userInfo?.role === 'tecnico';

  // Effect per caricare le informazioni utente al mount
  useEffect(() => {
    if (auth.token && isOpen) {
      fetchUserInfo();
    }
  }, [auth.token, isOpen]);

  // Funzione per aggiornare i dati dell'intervento
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await loadInterventionData();
    } catch (error) {
      console.error('❌ Error refreshing intervention data:', error);
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Errore aggiornamento',
        message: 'Impossibile aggiornare i dati dell\'intervento. Riprova.'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Funzione per determinare se il pulsante annulla intervento deve essere visibile
  const shouldShowCancelButton = () => {
    // Il tasto per annullare deve esserci solo nel caso in cui siamo nello status "completato" o inferiori
    // Non può esserci in "Non completato" (7), "Fatturato" (9), "Collocamento" (10) e "Annullato" (8)
    const statusId = interventionData?.status_id ?? getStatusId(selectedStatus);
    return statusId !== null && statusId <= 6 && selectedStatus !== 'annullato';
  };

  // Funzione per visualizzare il rapporto in una nuova tab
  const visualizzaRapporto = async () => {
    try {
      setIsLoadingReport(true);
      
      // Usa il report_id dal payload invece di fare chiamate API
      const reportId = interventionData?.report_id;
      
      if (reportId) {
        const url = `/interventi/rapportino/${reportId}`;
        window.open(url, '_blank');
      } else {
        setDialog({
          isOpen: true,
          type: 'error',
          title: 'Rapporto non disponibile',
          message: 'Non è possibile visualizzare il rapporto in questo momento.'
        });
      }
    } catch (error) {
      console.error('❌ Error opening report:', error);
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Errore visualizzazione rapporto',
        message: 'Si è verificato un errore durante l\'apertura del rapporto. Riprova.'
      });
    } finally {
      setIsLoadingReport(false);
    }
  };

  // Logica automatica per servizio domicilio in base a tipologia intervento
  useEffect(() => {
    if (tipologiaIntervento === '12' || tipologiaIntervento === '4') {
      setServizioDomicilio('Si');
      setScontoServizioDomicilio(false);
    } else if (tipologiaIntervento) {
      setServizioDomicilio('No');
      setScontoServizioDomicilio(false);
    }
    // Se tipologiaIntervento è vuoto, non forzare nulla
  }, [tipologiaIntervento]);

  // Effect per impostare existingReport basandosi sui dati dal payload
  useEffect(() => {
    if (interventionData && !isInitialLoad) {
      if (interventionData.report_id) {
        // Creo un oggetto report dal payload
        setExistingReport({
          id: interventionData.report_id,
          is_failed: interventionData.report_is_failed || false
        });
      } else {
        setExistingReport(null);
      }
    }
  }, [interventionData, isInitialLoad]);

  // Funzione per confermare il rapporto
  const confermaRapporto = async () => {
    try {
      // Determina il nuovo status basandosi su is_failed
      const isFailed = existingReport?.is_failed === true;
      const newStatus = isFailed ? 'non_completato' : 'completato';
      const newStatusId = isFailed ? 7 : 6;
      
      // Prepara i dati per l'aggiornamento mantenendo tutti i valori esistenti
      const requestData: UpdateAssistanceInterventionRequest = {
        customer_id: selectedCustomerId || 0,
        type_id: parseInt(tipologiaIntervento) || 0,
        zone_id: parseInt(zona) || 0,
        customer_location_id: destinazione || '',
        flg_home_service: servizioDomicilio === 'Si',
        flg_discount_home_service: servizioDomicilio === 'Si' ? scontoServizioDomicilio : false,
        date: data || null,
        time_slot: orarioIntervento || null,
        from_datetime: data && orarioIntervento ? buildDateTime(data, orarioIntervento, oraInizio) : null,
        to_datetime: data && orarioIntervento 
          ? (orarioIntervento === 'fascia_oraria' 
              ? buildDateTime(data, orarioIntervento, oraFine) 
              : buildEndDateTime(data, orarioIntervento))
          : null,
        quotation_price: preventivo,
        opening_hours: orarioApertura,
        assigned_to: selectedTechnician?.id || '',
        call_code: codiceChiamata,
        internal_notes: noteInterne,
        status_id: newStatusId, // Questo è il cambio importante
        approved_by: userInfo?.id || '', // Aggiunto campo approved_by con ID utente corrente
        equipments: selectedEquipments.map(eq => eq.id),
        articles: selectedArticles.map(art => ({
          article_id: art.article.id,
          quantity: art.quantity
        }))
      };

      // Chiamata API per aggiornare l'intervento
      await updateAssistanceIntervention(interventionId, requestData, auth.token || '');
      
      // 🆕 Ricarica i dati dell'intervento per sincronizzare l'UI
      try {
        const updatedData = await fetchAssistanceInterventionDetail(interventionId, auth.token || '');
        setInterventionData(updatedData);
        
        // Aggiorna lo status usando la label del server
        setSelectedStatus(toStatusKey(updatedData.status_label));
        
      } catch (reloadError) {
        console.error('❌ Conferma rapporto: Error reloading data:', reloadError);
        // Fallback: aggiorna almeno lo status locale
        setSelectedStatus(newStatus);
      }
      
      // Mostra messaggio di successo
      setDialog({
        isOpen: true,
        type: 'success',
        title: 'Rapporto confermato',
        message: `Il rapporto è stato confermato con successo. L'intervento è ora ${newStatus === 'completato' ? 'completato' : 'non completato'}.`
      });
      
      // Notifica il parent component dell'aggiornamento
      if (onInterventionUpdated) {
        onInterventionUpdated();
      }
      
    } catch (error) {
      console.error('❌ Error confirming report:', error);
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Errore conferma rapporto',
        message: 'Si è verificato un errore durante la conferma del rapporto. Riprova.'
      });
    }
  };

  // Funzione per mandare in fatturazione
  const mandaInFatturazione = async () => {
    try {
      // Prepara i dati per l'aggiornamento mantenendo tutti i valori esistenti
      const requestData: UpdateAssistanceInterventionRequest = {
        customer_id: selectedCustomerId || 0,
        type_id: parseInt(tipologiaIntervento) || 0,
        zone_id: parseInt(zona) || 0,
        customer_location_id: destinazione || '',
        flg_home_service: servizioDomicilio === 'Si',
        flg_discount_home_service: servizioDomicilio === 'Si' ? scontoServizioDomicilio : false,
        date: data || null,
        time_slot: orarioIntervento || null,
        from_datetime: data && orarioIntervento ? buildDateTime(data, orarioIntervento, oraInizio) : null,
        to_datetime: data && orarioIntervento 
          ? (orarioIntervento === 'fascia_oraria' 
              ? buildDateTime(data, orarioIntervento, oraFine) 
              : buildEndDateTime(data, orarioIntervento))
          : null,
        quotation_price: preventivo,
        opening_hours: orarioApertura,
        assigned_to: selectedTechnician?.id || '',
        call_code: codiceChiamata,
        internal_notes: noteInterne,
        status_id: 9, // Status "fatturato" ha ID 9
        invoiced_by: userInfo?.id || '', // Aggiunto campo invoiced_by con ID utente corrente
        equipments: selectedEquipments.map(eq => eq.id),
        articles: selectedArticles.map(art => ({
          article_id: art.article.id,
          quantity: art.quantity
        }))
      };

      // Chiamata API per aggiornare l'intervento
      await updateAssistanceIntervention(interventionId, requestData, auth.token || '');
      
      // 🆕 Ricarica i dati dell'intervento per sincronizzare l'UI
      try {
        const updatedData = await fetchAssistanceInterventionDetail(interventionId, auth.token || '');
        setInterventionData(updatedData);
        
        // Aggiorna lo status usando la label del server
        setSelectedStatus(toStatusKey(updatedData.status_label));
        
      } catch (reloadError) {
        console.error('❌ Manda in fatturazione: Error reloading data:', reloadError);
        // Fallback: aggiorna almeno lo status locale
        setSelectedStatus('fatturato');
      }
      
      // Mostra messaggio di successo
      setDialog({
        isOpen: true,
        type: 'success',
        title: 'Mandato in fatturazione',
        message: 'L\'intervento è stato mandato in fatturazione con successo.'
      });
      
      // Notifica il parent component dell'aggiornamento
      if (onInterventionUpdated) {
        onInterventionUpdated();
      }
      
    } catch (error) {
      console.error('❌ Error sending to invoicing:', error);
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Errore fatturazione',
        message: 'Si è verificato un errore durante l\'invio in fatturazione. Riprova.'
      });
    }
  };

  // Funzione per annullare l'intervento
  const annullaIntervento = async () => {
    try {
      // Prepara i dati per l'aggiornamento mantenendo tutti i valori esistenti
      const requestData: UpdateAssistanceInterventionRequest = {
        customer_id: selectedCustomerId || 0,
        type_id: parseInt(tipologiaIntervento) || 0,
        zone_id: parseInt(zona) || 0,
        customer_location_id: destinazione || '',
        flg_home_service: servizioDomicilio === 'Si',
        flg_discount_home_service: servizioDomicilio === 'Si' ? scontoServizioDomicilio : false,
        date: data || null,
        time_slot: orarioIntervento || null,
        from_datetime: data && orarioIntervento ? buildDateTime(data, orarioIntervento, oraInizio) : null,
        to_datetime: data && orarioIntervento 
          ? (orarioIntervento === 'fascia_oraria' 
              ? buildDateTime(data, orarioIntervento, oraFine) 
              : buildEndDateTime(data, orarioIntervento))
          : null,
        quotation_price: preventivo,
        opening_hours: orarioApertura,
        assigned_to: selectedTechnician?.id || '',
        call_code: codiceChiamata,
        internal_notes: noteInterne,
        status_id: 8, // Status "annullato" ha ID 8
        cancelled_by: userInfo?.id || '', // Aggiunto campo cancelled_by con ID utente corrente
        equipments: selectedEquipments.map(eq => eq.id),
        articles: selectedArticles.map(art => ({
          article_id: art.article.id,
          quantity: art.quantity
        }))
      };

      // Chiamata API per aggiornare l'intervento
      await updateAssistanceIntervention(interventionId, requestData, auth.token || '');
      
      // 🆕 Ricarica i dati dell'intervento per sincronizzare l'UI
      try {
        const updatedData = await fetchAssistanceInterventionDetail(interventionId, auth.token || '');
        setInterventionData(updatedData);
        
        // Aggiorna lo status usando la label del server
        setSelectedStatus(toStatusKey(updatedData.status_label));
        
      } catch (reloadError) {
        console.error('❌ Annulla intervento: Error reloading data:', reloadError);
        // Fallback: aggiorna almeno lo status locale
        setSelectedStatus('annullato');
      }
      
      // Mostra messaggio di successo
      setDialog({
        isOpen: true,
        type: 'success',
        title: 'Intervento annullato',
        message: 'L\'intervento è stato annullato con successo.'
      });
      
      // Notifica il parent component dell'aggiornamento
      if (onInterventionUpdated) {
        onInterventionUpdated();
      }
      
    } catch (error) {
      console.error('❌ Error cancelling intervention:', error);
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Errore annullamento',
        message: 'Si è verificato un errore durante l\'annullamento dell\'intervento. Riprova.'
      });
    }
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed top-0 left-16 right-0 bottom-0 bg-white z-50 overflow-y-auto">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Dettaglio intervento</h1>
          </div>
        </div>
        
        <div className="p-6 max-w-6xl mx-auto pb-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Caricamento dati intervento...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-16 right-0 bottom-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Dettaglio intervento</h1>
              {interventionData && (
                <p className="text-sm text-gray-500">
                  Codice: {interventionData.call_code} | ID: #{interventionData.id}
                </p>
              )}
            </div>
          </div>
          
          {/* Pulsanti azioni */}
          <div className="flex items-center gap-3">
            {/* Pulsante aggiorna dati */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
              title="Aggiorna dati intervento"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            
            {/* Pulsante annulla intervento - solo per status completato o inferiori e solo admin */}
            {shouldShowCancelButton() && userInfo && isAdmin() && (
              <CancelInterventionButton
                onCancel={annullaIntervento}
                disabled={isRefreshing || isDownloadingPDF}
              />
            )}
            
            {/* Pulsante download PDF */}
            <button
              onClick={downloadPDF}
              disabled={isDownloadingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              {isDownloadingPDF ? 'Download...' : 'Scarica PDF'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6 max-w-6xl mx-auto pb-8">
        {/* Status e pulsanti rapporto */}
        <InterventionStatusAndActions
          selectedStatus={selectedStatus}
          userInfo={userInfo}
          userLoading={userLoading}
          existingReport={existingReport}
          isCheckingReport={isCheckingReport}
          isLoadingReport={isLoadingReport}
          interventionId={interventionId}
          onCreateReport={() => setShowCreaRapportino(true)}
          onViewReport={visualizzaRapporto}
          onConfirmReport={confermaRapporto}
          onSendToInvoicing={mandaInFatturazione}
        />

        {/* Form sections */}
        <div className="space-y-8 mt-4">
          {/* Customer Section */}
          <CustomerSectionDetail
            ragioneSociale={ragioneSociale}
            setRagioneSociale={setRagioneSociale}
            destinazione={destinazione}
            setDestinazione={setDestinazione}
            tipologiaIntervento={tipologiaIntervento}
            setTipologiaIntervento={setTipologiaIntervento}
            zona={zona}
            setZona={setZona}
            codiceCliente={codiceCliente}
            setCodiceCliente={setCodiceCliente}
            telefonoFisso={telefonoFisso}
            setTelefonoFisso={setTelefonoFisso}
            numeroCellulare={numeroCellulare}
            setNumeroCellulare={setNumeroCellulare}
            selectedCustomerId={selectedCustomerId}
            setSelectedCustomerId={setSelectedCustomerId}
            onCustomerLocationsLoaded={handleCustomerLocationsLoaded}
            statusId={interventionData?.status_id ?? undefined}
            disabled={isTechnician}
            hasSelectedEquipments={selectedEquipments.length > 0}
            onClearSelectedEquipments={() => setSelectedEquipments([])}
          />

          {/* Intervention Details Section */}
          <InterventionDetailsSectionDetail
            data={data}
            setData={setData}
            orarioIntervento={orarioIntervento}
            setOrarioIntervento={setOrarioIntervento}
            oraInizio={oraInizio}
            setOraInizio={setOraInizio}
            oraFine={oraFine}
            setOraFine={setOraFine}
            servizioDomicilio={servizioDomicilio}
            setServizioDomicilio={setServizioDomicilio}
            scontoServizioDomicilio={scontoServizioDomicilio}
            setScontoServizioDomicilio={setScontoServizioDomicilio}
            preventivo={preventivo}
            setPreventivo={setPreventivo}
            selectedCustomerId={selectedCustomerId}
            destinazione={destinazione}
            selectedEquipments={selectedEquipments}
            setSelectedEquipments={setSelectedEquipments}
            selectedArticles={selectedArticles}
            setSelectedArticles={setSelectedArticles}
            orarioApertura={orarioApertura}
            setOrarioApertura={setOrarioApertura}
            noteInterne={noteInterne}
            setNoteInterne={setNoteInterne}
            onCustomerLocationsLoaded={handleCustomerLocationsLoaded}
            statusId={interventionData?.status_id ?? undefined}
            disabled={isTechnician}
          />

          {/* Call Details Section */}
          {isAdmin() && (
            <CallDetailsSectionDetail
              nomeOperatore={nomeOperatore}
              setNomeOperatore={setNomeOperatore}
              ruoloOperatore={ruoloOperatore}
              setRuoloOperatore={setRuoloOperatore}
              selectedTechnician={selectedTechnician}
              setSelectedTechnician={setSelectedTechnician}
              codiceChiamata={codiceChiamata}
              setCodiceChiamata={setCodiceChiamata}
              dataCreazione={dataCreazione}
              statusId={interventionData?.status_id ?? undefined}
              disabled={isTechnician}
            />
          )}

          {/* Form sections completato - tutto viene salvato automaticamente */}
        </div>
      </div>

      {/* Dialog di risultato */}
      {dialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              {dialog.type === 'success' ? (
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              )}
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  {dialog.title}
                </h3>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                {dialog.message}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={closeDialog}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Componente Crea Rapportino */}
      {showCreaRapportino && interventionData && (
        <CreaRapportino
          isOpen={showCreaRapportino}
          onClose={() => setShowCreaRapportino(false)}
          interventionData={interventionData}
        />
      )}
    </div>
  );
} 