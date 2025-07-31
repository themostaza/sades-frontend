'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import CustomerSectionDetail from './components/detail/CustomerSectionDetail';
import { CreateAssistanceInterventionRequest } from '../../types/assistance-interventions';
import { useRouter } from 'next/navigation';

interface NuovoInterventoProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DialogState {
  isOpen: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

export default function NuovoIntervento({ isOpen, onClose }: NuovoInterventoProps) {
  const auth = useAuth();
  const router = useRouter();

  // Stati per la sezione cliente
  const [ragioneSociale, setRagioneSociale] = useState('');
  const [destinazione, setDestinazione] = useState('');
  const [tipologiaIntervento, setTipologiaIntervento] = useState('');
  const [zona, setZona] = useState('');
  const [codiceCliente, setCodiceCliente] = useState('');
  const [telefonoFisso, setTelefonoFisso] = useState('');
  const [numeroCellulare, setNumeroCellulare] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  
  // Stati per servizio domicilio e sconto
  const [servizioDomicilio, setServizioDomicilio] = useState('No');
  const [scontoServizioDomicilio, setScontoServizioDomicilio] = useState(false);
  
  // Stati per la validazione e il caricamento
  const [customerLocationsLoaded, setCustomerLocationsLoaded] = useState(false);
  const [hasCustomerLocations, setHasCustomerLocations] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ isOpen: false, type: 'success', title: '', message: '' });
  const [isCreating, setIsCreating] = useState(false);

  // La validazione si concentra solo sui dati del cliente
  const isFormValid = () => {
    const baseValid = ragioneSociale && tipologiaIntervento && zona && selectedCustomerId;
    const destinationValid = destinazione || (selectedCustomerId && customerLocationsLoaded && !hasCustomerLocations);
    return !!(baseValid && destinationValid);
  };
  
  const getStatusId = () => 1; // Sempre 'da_assegnare' per nuovi interventi

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

  const createInterventionAndRedirect = async () => {
    if (!isFormValid()) {
      setDialog({ isOpen: true, type: 'error', title: 'Campi obbligatori mancanti', message: 'Per favore, compila tutti i campi obbligatori della sezione cliente.' });
      return;
    }
    
    setIsCreating(true);

    try {
      const requestData: CreateAssistanceInterventionRequest = {
        customer_id: selectedCustomerId || 0,
        type_id: parseInt(tipologiaIntervento) || 0,
        zone_id: parseInt(zona) || 0,
        customer_location_id: destinazione || '',
        status_id: getStatusId(),
        // Tutti gli altri campi sono null o valori di default
        flg_home_service: servizioDomicilio === 'Si',
        flg_discount_home_service: servizioDomicilio === 'Si' ? scontoServizioDomicilio : false,
        date: null,
        time_slot: null,
        from_datetime: null,
        to_datetime: null,
        quotation_price: 0,
        opening_hours: '',
        assigned_to: '',
        call_code: '',
        internal_notes: '',
        equipments: [],
        articles: [],
      };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      
      const response = await fetch('/api/assistance-interventions', { 
        method: 'POST', 
        headers, 
        body: JSON.stringify(requestData) 
      });
      
      if (response.ok) {
        const data = await response.json();
        const newInterventionId = data.id;
        
        // Resetta il form, chiudi il modale e reindirizza
        resetForm();
        onClose();
        router.push(`/interventi?ai=${newInterventionId}`);
        
      } else {
        const errorData = await response.json();
        setDialog({ isOpen: true, type: 'error', title: 'Errore durante la creazione', message: errorData.error || 'Si è verificato un errore. Riprova.' });
      }
    } catch {
      setDialog({ isOpen: true, type: 'error', title: 'Errore di rete', message: 'Impossibile connettersi al server. Verifica la connessione e riprova.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCustomerLocationsLoaded = (hasLocations: boolean) => {
    setCustomerLocationsLoaded(true);
    setHasCustomerLocations(hasLocations);
  };

  const resetForm = () => {
    setRagioneSociale('');
    setDestinazione('');
    setTipologiaIntervento('');
    setZona('');
    setSelectedCustomerId(null);
    setCodiceCliente('');
    setTelefonoFisso('');
    setNumeroCellulare('');
    setCustomerLocationsLoaded(false);
    setHasCustomerLocations(false);
  };

  const closeDialog = () => setDialog({ ...dialog, isOpen: false });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset form on open
      resetForm();
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-16 right-0 bottom-0 bg-white z-50 overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={onClose} className="text-gray-600 hover:text-gray-900"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-semibold text-gray-900">Nuovo intervento</h1>
      </div>
      
      <div className="p-6 max-w-6xl mx-auto pb-8">
        <div className="space-y-8">
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
            isCreating={true}
          />
        </div>

        <div className="mt-8 pt-6 border-t flex justify-end">
          <button 
            onClick={createInterventionAndRedirect} 
            disabled={!isFormValid() || isCreating} 
            className={`px-6 py-2 rounded-lg text-white font-medium transition-colors ${
              !isFormValid() || isCreating 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {isCreating ? 'Creazione in corso...' : 'Crea Intervento e Procedi'}
          </button>
        </div>
      </div>

      {dialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${dialog.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                {dialog.type === 'success' ? <Check className="w-6 h-6 text-green-600" /> : <AlertCircle className="w-6 h-6 text-red-600" />}
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">{dialog.title}</h3>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">{dialog.message}</p>
            <div className="flex justify-end">
              <button onClick={closeDialog} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
