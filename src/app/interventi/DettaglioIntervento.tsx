'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, AlertCircle, Download, RefreshCw } from 'lucide-react';
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

interface DettaglioInterventoProps {
  isOpen: boolean;
  onClose: () => void;
  interventionId: number;
  onInterventionUpdated?: () => void;
}

interface SelectedArticle {
  article: ArticleListItem;
  quantity: number;
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
  console.log('🚀 DettaglioIntervento component loaded, isOpen:', isOpen, 'interventionId:', interventionId);
  
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

  // Funzione per calcolare lo stato corretto basato sulla logica frontend (stessa di page.tsx)
  const calculateStatus = (interventionData: AssistanceInterventionDetail): { label: string; key: string } => {
    // Priorità massima: se invoiced_by è valorizzato → fatturato
    if (interventionData.invoiced_by) {
      return { label: 'Fatturato', key: 'fatturato' };
    }
    
    // Priorità alta: se cancelled_by è valorizzato → annullato
    if (interventionData.cancelled_by) {
      return { label: 'Annullato', key: 'annullato' };
    }
    
    // Controllo dei campi obbligatori per l'assegnazione
    const requiredFields = [
      interventionData.assigned_to,
      interventionData.date,
      interventionData.time_slot,
      interventionData.from_datetime,
      interventionData.to_datetime
    ];
    
    // Se uno dei campi obbligatori non è valorizzato → da_assegnare
    if (requiredFields.some(field => !field || field.trim() === '')) {
      return { label: 'Da assegnare', key: 'da_assegnare' };
    }
    
    // Tutti i campi obbligatori sono valorizzati → in_carico
    let currentStatus = { label: 'In carico', key: 'in_carico' };
    
    // Se c'è un report_id → da_confermare
    if (interventionData.report_id !== null) {
      currentStatus = { label: 'Da confermare', key: 'da_confermare' };
      
      // Se c'è anche approved_by → controllo report_is_failed
      if (interventionData.approved_by) {
        if (interventionData.report_is_failed === true) {
          currentStatus = { label: 'Non completato', key: 'non_completato' };
        } else if (interventionData.report_is_failed === false || interventionData.report_is_failed === null) {
          currentStatus = { label: 'Completato', key: 'completato' };
        }
      }
    }
    
    return currentStatus;
  };

  // Funzione per mappare i valori degli stati ai corrispondenti ID
  const getStatusId = (): number => {
    const statusMap: Record<string, number> = {
      'da_assegnare': 1,
      'attesa_preventivo': 2,
      'attesa_ricambio': 3,
      'in_carico': 4,
      'da_confermare': 5,
      'completato': 6,
      'non_completato': 7,
      'annullato': 8,
      'fatturato': 9,
      'collocamento': 10
    };
    return statusMap[selectedStatus] || 1;
  };

  // Funzione per caricare i dettagli del cliente
  const loadCustomerDetails = async (customerId: number) => {
    try {
      console.log('🔄 Loading customer details for ID:', customerId);
      console.log('🔑 Auth token available:', !!auth.token);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
        console.log('🔑 Authorization header set');
      }

      console.log('📡 Making API call to:', `/api/customers/${customerId}`);
      const response = await fetch(`/api/customers/${customerId}`, {
        headers,
      });

      console.log('📡 Customer API response status:', response.status);
      console.log('📡 Customer API response headers:', response.headers);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Customer details loaded - FULL RESPONSE:', responseData);
        console.log('🔍 Response structure analysis:', {
          isObject: typeof responseData === 'object',
          hasData: 'data' in responseData,
          keys: Object.keys(responseData),
          dataKeys: responseData.data ? Object.keys(responseData.data) : 'no data key'
        });
        
        // Proviamo ad accedere ai dati in modi diversi
        const customerData = responseData.data || responseData; // Potrebbe essere annidato in .data
        console.log('🔍 Customer data extracted:', customerData);
        console.log('📋 Customer data structure:', {
          client_code: customerData.client_code,
          phone_number: customerData.phone_number,
          mobile_phone_number: customerData.mobile_phone_number
        });
        
        // Verifica se i campi esistono
        if (customerData.client_code !== undefined) {
          console.log('✅ client_code field found:', customerData.client_code);
        } else {
          console.warn('⚠️ client_code field is undefined');
        }
        
        if (customerData.phone_number !== undefined) {
          console.log('✅ phone_number field found:', customerData.phone_number);
        } else {
          console.warn('⚠️ phone_number field is undefined');
        }
        
        if (customerData.mobile_phone_number !== undefined) {
          console.log('✅ mobile_phone_number field found:', customerData.mobile_phone_number);
        } else {
          console.warn('⚠️ mobile_phone_number field is undefined');
        }
        
        // Popola i campi del cliente
        const clientCode = customerData.client_code || '';
        const phoneNumber = customerData.phone_number || '';
        const mobileNumber = customerData.mobile_phone_number || '';
        
        console.log('🔄 Setting customer fields:', {
          codiceCliente: clientCode,
          telefonoFisso: phoneNumber,
          numeroCellulare: mobileNumber
        });
        
        setCodiceCliente(clientCode);
        setTelefonoFisso(phoneNumber);
        setNumeroCellulare(mobileNumber);
        
        console.log('✅ Customer fields set successfully');
        
        // Verifica immediata degli stati dopo l'aggiornamento
        setTimeout(() => {
          console.log('🔍 Verification - Current state values after setting:', {
            codiceCliente: clientCode,
            telefonoFisso: phoneNumber,
            numeroCellulare: mobileNumber
          });
        }, 100);
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
      console.log('🔄 Loading creator details for ID:', createdBy);
      console.log('🔑 Auth token available:', !!auth.token);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
        console.log('🔑 Authorization header set');
      }

      console.log('📡 Making API call to:', `/api/users/${createdBy}`);
      const response = await fetch(`/api/users/${createdBy}`, {
        headers,
      });

      console.log('📡 Creator API response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Creator details loaded - FULL RESPONSE:', responseData);
        
        // Basandomi sulla struttura API fornita, la risposta è direttamente l'oggetto utente
        const creatorData = responseData;
        console.log('🔍 Creator data extracted:', creatorData);
        
        // Popola i campi dell'operatore creatore
        const fullName = creatorData.surname 
          ? `${creatorData.name} ${creatorData.surname}` 
          : creatorData.name || '';
        const role = creatorData.role || '';
        
        console.log('🔄 Setting creator fields:', {
          nomeOperatore: fullName,
          ruoloOperatore: role
        });
        
        setNomeOperatore(fullName);
        setRuoloOperatore(role);
        
        console.log('✅ Creator fields set successfully');
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
        console.log('🔄 About to load customer details for customer_id:', data.customer_id);
        await loadCustomerDetails(data.customer_id);
        console.log('✅ Customer details loading completed');
      } else {
        console.warn('⚠️ No customer_id found in intervention data:', data);
      }

      // Carica i dettagli del creatore dell'intervento
      if (data.created_by) {
        console.log('🔄 About to load creator details for created_by:', data.created_by);
        await loadCreatorDetails(data.created_by);
        console.log('✅ Creator details loading completed');
      } else {
        console.warn('⚠️ No created_by found in intervention data:', data);
      }

      // Gestione data di creazione
      if (data.created_at) {
        console.log('🗓️ Raw created_at from API:', data.created_at, 'Type:', typeof data.created_at);
        
        try {
          const createdDate = new Date(data.created_at);
          if (!isNaN(createdDate.getTime())) {
            const formattedCreatedDate = createdDate.toLocaleDateString('it-IT');
            console.log('🗓️ Formatted creation date:', formattedCreatedDate);
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
      const statusInfo = calculateStatus(data);
      setSelectedStatus(statusInfo.key);
      setRagioneSociale(data.company_name);
      setTipologiaIntervento(data.type_id.toString());
      setZona(data.zone_id.toString());
      setSelectedCustomerId(data.customer_id); // Ora questo viene settato DOPO aver caricato i dati del cliente
      setDestinazione(data.customer_location_id || '');
      setServizioDomicilio(data.flg_home_service ? 'Si' : 'No');
      setScontoServizioDomicilio(data.flg_discount_home_service);
      setPreventivo(parseFloat(String(data.quotation_price)) || 0);
      setOrarioApertura(data.opening_hours || '');
      setNoteInterne(data.internal_notes || '');
      console.log('📝 Setting noteInterne with value:', data.internal_notes);
      console.log('🕐 Setting orarioApertura with value:', data.opening_hours);
      console.log('🔍 API data structure for fields:', {
        opening_hours: data.opening_hours,
        internal_notes: data.internal_notes,
        opening_hours_type: typeof data.opening_hours,
        internal_notes_type: typeof data.internal_notes
      });
      setCodiceChiamata(data.call_code);
      
      // Gestione data e orari
      if (data.date) {
        console.log('🗓️ Raw date from API:', data.date, 'Type:', typeof data.date);
        
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
        
        console.log('🗓️ Formatted date for input:', formattedDate);
        setData(formattedDate);
      } else {
        console.log('⚠️ No date found in API response');
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
          linked_serials: null,
          brand_name: '',
          subfamily_name: '',
          customer_name: ''
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
          quantity: 1 // La quantità non viene fornita dall'API detail, impostiamo 1 come default
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
      
      console.log('✅ Intervention data loaded successfully:', data);
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
    console.log('🔄 useEffect triggered - isOpen:', isOpen, 'interventionId:', interventionId);
    if (isOpen && interventionId) {
      console.log('✅ Starting to load intervention data...');
      loadInterventionData();
    }
  }, [isOpen, interventionId]);

  // useEffect per recalcolare lo status dinamicamente quando cambiano i valori correlati
  useEffect(() => {
    // Non calcolare durante il caricamento iniziale per evitare modifiche non necessarie
    if (isInitialLoad || isLoading || !interventionData) {
      return;
    }

    // Recalcola lo status basandosi sui valori attuali
    const newStatus = calculateStatus(interventionData);
    
    // Aggiorna solo se lo status è davvero cambiato
    if (newStatus.key !== selectedStatus) {
      console.log('🔄 Status auto-updated from', selectedStatus, 'to', newStatus.key);
      setSelectedStatus(newStatus.key);
    }
  }, [selectedStatus, isInitialLoad, isLoading, interventionData]);

  // AutoSave con debounce su tutti i campi modificabili
  useEffect(() => {
    // Reset errore autosave quando l'utente modifica qualcosa
    if (autoSaveError) {
      setAutoSaveError(null);
    }

    // Non fare autosave se siamo in fase di caricamento iniziale
    if (isInitialLoad) {
      console.log('⏸️ AutoSave skipped - initial load in progress');
      return;
    }

    const timer = setTimeout(() => {
      // Solo se il componente è aperto e ci sono dati caricati
      if (isOpen && interventionData && !isLoading) {
        console.log('🔄 AutoSave triggered by field changes');
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
      console.log(`🕐 Built specific time: ${result}`);
      return result;
    } else if (timeSlot === 'mattina') {
      const result = `${date}T08:00:00`; // 8:00
      console.log(`🌅 Built morning time: ${result}`);
      return result;
    } else if (timeSlot === 'pomeriggio') {
      const result = `${date}T14:00:00`; // 14:00
      console.log(`🌇 Built afternoon time: ${result}`);
      return result;
    } else if (timeSlot === 'tutto_il_giorno') {
      const result = `${date}T08:00:00`; // 8:00
      console.log(`🌞 Built full day start time: ${result}`);
      return result;
    } else {
      // Default fallback per time slots vuoti o non riconosciuti - usa la mattina
      const result = `${date}T08:00:00`;
      console.log(`⚠️ Using default morning time for slot "${timeSlot}": ${result}`);
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
      console.log(`🕐 Built specific end time: ${result}`);
      return result;
    } else if (timeSlot === 'mattina') {
      const result = `${date}T13:00:00`; // 13:00
      console.log(`🌅 Built morning end time: ${result}`);
      return result;
    } else if (timeSlot === 'pomeriggio') {
      const result = `${date}T18:00:00`; // 18:00
      console.log(`🌇 Built afternoon end time: ${result}`);
      return result;
    } else if (timeSlot === 'tutto_il_giorno') {
      const result = `${date}T18:00:00`; // 18:00
      console.log(`🌞 Built full day end time: ${result}`);
      return result;
    } else {
      // Default fallback per time slots vuoti o non riconosciuti - usa la mattina
      const result = `${date}T13:00:00`;
      console.log(`⚠️ Using default morning end time for slot "${timeSlot}": ${result}`);
      return result;
    }
  };

  // Funzione per autosave (senza dialoghi)
  const autoSave = async () => {
    if (!isFormValid()) {
      console.log('⏸️ AutoSave skipped - form not valid');
      return;
    }

    // Validazione aggiuntiva per l'autosave
    if (orarioIntervento === 'fascia_oraria' && (!oraInizio || !oraFine)) {
      console.log('⏸️ AutoSave skipped - missing time details');
      return;
    }

    if (!selectedCustomerId || !tipologiaIntervento || !zona) {
      console.log('⏸️ AutoSave skipped - missing required IDs');
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
        flg_discount_home_service: scontoServizioDomicilio,
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
        status_id: getStatusId(),
        equipments: selectedEquipments.map(eq => eq.id),
        articles: selectedArticles.map(art => ({
          article_id: art.article.id,
          quantity: art.quantity
        }))
      };

      console.log('💾 AutoSave: Updating intervention...');
      await updateAssistanceIntervention(interventionId, requestData, auth.token || '');
      console.log('✅ AutoSave: Success');
      
      // 🆕 Ricarica i dati dell'intervento per aggiornare l'UI con eventuali modifiche server-side
      console.log('🔄 AutoSave: Reloading intervention data to sync UI...');
      setIsInitialLoad(true); // Previeni ulteriori autosave durante il reload
      
      try {
        const updatedData = await fetchAssistanceInterventionDetail(interventionId, auth.token || '');
        setInterventionData(updatedData);
        
        // Aggiorna lo status calcolato con i nuovi dati
        const newStatusInfo = calculateStatus(updatedData);
        if (newStatusInfo.key !== selectedStatus) {
          console.log('🔄 Status updated after autosave:', selectedStatus, '->', newStatusInfo.key);
          setSelectedStatus(newStatusInfo.key);
        }
        
        console.log('✅ AutoSave: UI synchronized with server data');
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
      console.log('📥 Downloading PDF for intervention:', interventionId);
      
      const pdfBlob = await downloadAssistanceInterventionPDF(interventionId, auth.token || '');
      downloadPDFFile(pdfBlob, `intervento-${interventionId}.pdf`);
      
      console.log('✅ PDF downloaded successfully');
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
      console.log('✅ Informazioni utente caricate:', userData);
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
      console.log('🔄 Refreshing intervention data...');
      await loadInterventionData();
      console.log('✅ Intervention data refreshed successfully');
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

  // Funzione per visualizzare il rapporto in una nuova tab
  const visualizzaRapporto = async () => {
    try {
      setIsLoadingReport(true);
      
      // Usa il report_id dal payload invece di fare chiamate API
      const reportId = interventionData?.report_id;
      
      if (reportId) {
        console.log('🔄 Opening report in new tab:', reportId);
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
      console.log('🔄 Conferma rapporto started');
      console.log('📋 Existing report data:', existingReport);
      
      // Determina il nuovo status basandosi su is_failed
      const isFailed = existingReport?.is_failed === true;
      const newStatus = isFailed ? 'non_completato' : 'completato';
      const newStatusId = isFailed ? 7 : 6;
      
      console.log(`🎯 Updating intervention to status: ${newStatus} (ID: ${newStatusId}), based on is_failed: ${isFailed}`);
      
      // Prepara i dati per l'aggiornamento mantenendo tutti i valori esistenti
      const requestData: UpdateAssistanceInterventionRequest = {
        customer_id: selectedCustomerId || 0,
        type_id: parseInt(tipologiaIntervento) || 0,
        zone_id: parseInt(zona) || 0,
        customer_location_id: destinazione || '',
        flg_home_service: servizioDomicilio === 'Si',
        flg_discount_home_service: scontoServizioDomicilio,
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

      console.log('📤 Sending update request:', requestData);
      
      // Chiamata API per aggiornare l'intervento
      await updateAssistanceIntervention(interventionId, requestData, auth.token || '');
      
      // 🆕 Ricarica i dati dell'intervento per sincronizzare l'UI
      console.log('🔄 Conferma rapporto: Reloading intervention data to sync UI...');
      try {
        const updatedData = await fetchAssistanceInterventionDetail(interventionId, auth.token || '');
        setInterventionData(updatedData);
        
        // Aggiorna lo status calcolato con i nuovi dati
        const newStatusInfo = calculateStatus(updatedData);
        setSelectedStatus(newStatusInfo.key);
        
        console.log('✅ Conferma rapporto: UI synchronized with server data');
      } catch (reloadError) {
        console.error('❌ Conferma rapporto: Error reloading data:', reloadError);
        // Fallback: aggiorna almeno lo status locale
        setSelectedStatus(newStatus);
      }
      
      console.log('✅ Intervention status updated successfully');
      
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
      console.log('🔄 Manda in fatturazione started');
      
      // Prepara i dati per l'aggiornamento mantenendo tutti i valori esistenti
      const requestData: UpdateAssistanceInterventionRequest = {
        customer_id: selectedCustomerId || 0,
        type_id: parseInt(tipologiaIntervento) || 0,
        zone_id: parseInt(zona) || 0,
        customer_location_id: destinazione || '',
        flg_home_service: servizioDomicilio === 'Si',
        flg_discount_home_service: scontoServizioDomicilio,
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

      console.log('📤 Sending invoicing update request:', requestData);
      
      // Chiamata API per aggiornare l'intervento
      await updateAssistanceIntervention(interventionId, requestData, auth.token || '');
      
      // 🆕 Ricarica i dati dell'intervento per sincronizzare l'UI
      console.log('🔄 Manda in fatturazione: Reloading intervention data to sync UI...');
      try {
        const updatedData = await fetchAssistanceInterventionDetail(interventionId, auth.token || '');
        setInterventionData(updatedData);
        
        // Aggiorna lo status calcolato con i nuovi dati
        const newStatusInfo = calculateStatus(updatedData);
        setSelectedStatus(newStatusInfo.key);
        
        console.log('✅ Manda in fatturazione: UI synchronized with server data');
      } catch (reloadError) {
        console.error('❌ Manda in fatturazione: Error reloading data:', reloadError);
        // Fallback: aggiorna almeno lo status locale
        setSelectedStatus('fatturato');
      }
      
      console.log('✅ Intervention sent to invoicing successfully');
      
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
          setSelectedStatus={setSelectedStatus}
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
            statusId={getStatusId()}
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
            statusId={getStatusId()}
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
              statusId={getStatusId()}
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