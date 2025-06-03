'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import CustomerSection from './components/CustomerSection';
import InterventionDetailsSection from './components/InterventionDetailsSection';
import CallDetailsSection from './components/CallDetailsSection';
import { Equipment } from '../../types/equipment';
import { ArticleListItem } from '../../types/article';
import { CreateAssistanceInterventionRequest } from '../../types/assistance-interventions';

interface NuovoInterventoProps {
  isOpen: boolean;
  onClose: () => void;
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

// Definisco i tipi per il dialog di successo/errore
interface DialogState {
  isOpen: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

export default function NuovoIntervento({ isOpen, onClose }: NuovoInterventoProps) {
  const auth = useAuth();

  const statusOptions = [
    { id: 'da_assegnare', label: 'Da assegnare', color: 'bg-orange-100 text-orange-800' },
    { id: 'attesa_preventivo', label: 'Attesa preventivo', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'attesa_ricambio', label: 'Attesa ricambio', color: 'bg-blue-100 text-blue-800' },
    { id: 'in_carico', label: 'In carico', color: 'bg-teal-100 text-teal-800' },
    { id: 'da_confermare', label: 'Da confermare', color: 'bg-purple-100 text-purple-800' },
    { id: 'completato', label: 'Completato', color: 'bg-green-100 text-green-800' },
    { id: 'non_completato', label: 'Non completato', color: 'bg-gray-100 text-gray-800' },
    { id: 'annullato', label: 'Annullato', color: 'bg-red-100 text-red-800' },
    { id: 'fatturato', label: 'Fatturato', color: 'bg-emerald-100 text-emerald-800' },
    { id: 'collocamento', label: 'Collocamento', color: 'bg-indigo-100 text-indigo-800' }
  ];

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

  // Stato per preventivo
  const [preventivo, setPreventivo] = useState(0);

  // Campi auto-compilati dal cliente selezionato
  const [codiceCliente, setCodiceCliente] = useState('');
  const [telefonoFisso, setTelefonoFisso] = useState('');
  const [numeroCellulare, setNumeroCellulare] = useState('');

  // Campi auto-compilati dall'utente loggato
  const [nomeOperatore, setNomeOperatore] = useState('');
  const [ruoloOperatore, setRuoloOperatore] = useState('');

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

  // Stato per il loading durante la creazione
  const [isCreating, setIsCreating] = useState(false);

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

  // Funzione per mappare i valori degli stati ai corrispondenti ID
  const getStatusId = () => {
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

  // Funzione per costruire datetime di fine (assicura almeno 1 minuto di differenza)
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

  // Funzione per creare l'intervento
  const createIntervention = async () => {
    if (!isFormValid()) {
      // Determina il messaggio di errore specifico
      let errorMessage = 'Per favore compila tutti i campi obbligatori.';
      
      if (!ragioneSociale || !tipologiaIntervento || !zona) {
        errorMessage = 'Per favore compila tutti i campi obbligatori: Ragione Sociale, Tipologia Intervento e Zona.';
      } else if (data && !orarioIntervento) {
        errorMessage = 'Se specifichi una data, devi anche selezionare una fascia oraria.';
      } else if (!data && orarioIntervento) {
        errorMessage = 'Se specifichi una fascia oraria, devi anche selezionare una data.';
      }
      
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Campi obbligatori mancanti',
        message: errorMessage
      });
      return;
    }

    // Validazione aggiuntiva solo se data e orario sono specificati
    const missingFields = [];
    
    // Validazione specifica per fascia oraria (solo se è stata selezionata)
    if (orarioIntervento === 'fascia_oraria') {
      if (!oraInizio) missingFields.push('Ora inizio');
      if (!oraFine) missingFields.push('Ora fine');
    }

    // Validazione per IDs numerici
    if (!selectedCustomerId || selectedCustomerId <= 0) missingFields.push('Cliente valido');
    if (!tipologiaIntervento || parseInt(tipologiaIntervento) <= 0) missingFields.push('Tipologia intervento valida');
    if (!zona || parseInt(zona) <= 0) missingFields.push('Zona valida');
    
    if (missingFields.length > 0) {
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Campi aggiuntivi richiesti',
        message: `I seguenti campi sono richiesti: ${missingFields.join(', ')}`
      });
      return;
    }

    try {
      setIsCreating(true);

      // Costruisco l'oggetto request
      const requestData: CreateAssistanceInterventionRequest = {
        customer_id: selectedCustomerId || 0,
        type_id: parseInt(tipologiaIntervento) || 0,
        zone_id: parseInt(zona) || 0,
        customer_location_id: destinazione || '',
        flg_home_service: servizioDomicilio === 'Si',
        flg_discount_home_service: false,
        // Data e orario possono essere null se non specificati
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
        call_code: '',
        internal_notes: noteInterne,
        status_id: getStatusId(),
        equipments: selectedEquipments.map(eq => eq.id),
        articles: selectedArticles.map(art => {
          console.log(`🔄 Using article ID: "${art.article.id}" (${typeof art.article.id})`);
          return {
            article_id: art.article.id,
            quantity: art.quantity
          };
        })
      };

      console.log('🔄 Creating assistance intervention with data:', requestData);
      console.log('🔍 selectedArticles before processing:', selectedArticles);
      console.log('📋 Form validation details:', {
        ragioneSociale,
        destinazione,
        tipologiaIntervento,
        data: data || 'null',
        orarioIntervento: orarioIntervento || 'null',
        selectedCustomerId,
        selectedTechnician: selectedTechnician?.id
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch('/api/assistance-interventions', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Intervention created successfully:', data);
        
        // Aggiorna il codice chiamata con quello generato dal backend
        if (data.call_code) {
          setCodiceChiamata(data.call_code);
        }
        
        setDialog({
          isOpen: true,
          type: 'success',
          title: 'Intervento creato con successo!',
          message: `L'intervento è stato creato correttamente. ${data.call_code ? `Codice chiamata: ${data.call_code}` : ''}`
        });

        // Reset del form dopo successo
        setTimeout(() => {
          resetForm();
          onClose();
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error('❌ Error creating intervention:', errorData);
        
        setDialog({
          isOpen: true,
          type: 'error',
          title: 'Errore durante la creazione',
          message: errorData.error || 'Si è verificato un errore durante la creazione dell\'intervento. Riprova.'
        });
      }
    } catch (error) {
      console.error('💥 Network error:', error);
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Errore di rete',
        message: 'Impossibile connettersi al server. Verifica la connessione e riprova.'
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Funzione per gestire il caricamento delle destinazioni del cliente
  const handleCustomerLocationsLoaded = (hasLocations: boolean) => {
    setCustomerLocationsLoaded(true);
    setHasCustomerLocations(hasLocations);
  };

  // Funzione per resettare il form
  const resetForm = () => {
    setSelectedStatus('da_assegnare');
    setRagioneSociale('');
    setDestinazione('');
    setTipologiaIntervento('');
    setZona('');
    setData(''); // Nessun default - utente deve scegliere
    setOrarioIntervento(''); // Nessun default - utente deve scegliere
    setSelectedCustomerId(null);
    setOraInizio('');
    setOraFine('');
    setServizioDomicilio('Si');
    setPreventivo(0);
    setCodiceCliente('');
    setTelefonoFisso('');
    setNumeroCellulare('');
    setNomeOperatore('');
    setRuoloOperatore('');
    setSelectedEquipments([]);
    setSelectedArticles([]);
    setOrarioApertura('');
    setNoteInterne('');
    setSelectedTechnician(null);
    // Reset anche gli stati delle destinazioni
    setCustomerLocationsLoaded(false);
    setHasCustomerLocations(false);
    // Non resettiamo il codice chiamata perché è generato automaticamente
  };

  // Funzione per chiudere il dialog
  const closeDialog = () => {
    setDialog({ ...dialog, isOpen: false });
  };

  // Funzione no-op per setCodiceChiamata dato che il campo è read-only
  const handleSetCodiceChiamata = () => {
    // Non fa nulla - il codice è generato automaticamente
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

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-16 right-0 bottom-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Nuovo intervento</h1>
        </div>
      </div>
      
      <div className="p-6 max-w-6xl mx-auto pb-8">
        {/* Pulsante di conferma sopra gli status */}
        <div className="mb-6 flex justify-end">
          <button 
            onClick={createIntervention}
            disabled={!isFormValid() || isCreating}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              isFormValid() && !isCreating
                ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isCreating ? 'Creazione in corso...' : 'Inserisci nuovo intervento'}
          </button>
        </div>

        {/* Status badges */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-gray-700">Status</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button
                key={status.id}
                onClick={() => setSelectedStatus(status.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedStatus === status.id 
                    ? status.color + ' ring-2 ring-teal-500' 
                    : status.color + ' opacity-70 hover:opacity-100'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form sections */}
        <div className="space-y-8">
          {/* Customer Section */}
          <CustomerSection
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
          />

          {/* Intervention Details Section */}
          <InterventionDetailsSection
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
            preventivo={preventivo}
            setPreventivo={setPreventivo}
            selectedCustomerId={selectedCustomerId}
            destinazione={destinazione}
            customerLocationsLoaded={customerLocationsLoaded}
            hasCustomerLocations={hasCustomerLocations}
            selectedEquipments={selectedEquipments}
            setSelectedEquipments={setSelectedEquipments}
            selectedArticles={selectedArticles}
            setSelectedArticles={setSelectedArticles}
            orarioApertura={orarioApertura}
            setOrarioApertura={setOrarioApertura}
            noteInterne={noteInterne}
            setNoteInterne={setNoteInterne}
          />

          {/* Call Details Section */}
          <CallDetailsSection
            nomeOperatore={nomeOperatore}
            setNomeOperatore={setNomeOperatore}
            ruoloOperatore={ruoloOperatore}
            setRuoloOperatore={setRuoloOperatore}
            selectedTechnician={selectedTechnician}
            setSelectedTechnician={setSelectedTechnician}
            codiceChiamata={codiceChiamata}
            setCodiceChiamata={handleSetCodiceChiamata}
          />

          {/* Pulsante di conferma in basso */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
            <button 
              onClick={createIntervention}
              disabled={!isFormValid() || isCreating}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                isFormValid() && !isCreating
                  ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isCreating ? 'Creazione in corso...' : 'Inserisci nuovo intervento'}
            </button>
          </div>
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
    </div>
  );
}