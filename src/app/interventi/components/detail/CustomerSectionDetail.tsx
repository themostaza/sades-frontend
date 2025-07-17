'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Phone, History } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import CustomerHistoryDialog from '../CustomerHistoryDialog';

interface CustomerLocation {
  id: string;
  customer_id: number;
  address: string;
  city: string;
  province: string;
  company_name: string;
  phone_number: string;
  mobile_phone_number: string;
}

interface CustomerSectionDetailProps {
  ragioneSociale: string;
  setRagioneSociale: (value: string) => void;
  destinazione: string;
  setDestinazione: (value: string) => void;
  tipologiaIntervento: string;
  setTipologiaIntervento: (value: string) => void;
  zona: string;
  setZona: (value: string) => void;
  codiceCliente: string;
  setCodiceCliente: (value: string) => void;
  telefonoFisso: string;
  setTelefonoFisso: (value: string) => void;
  numeroCellulare: string;
  setNumeroCellulare: (value: string) => void;
  selectedCustomerId: number | null;
  setSelectedCustomerId: (value: number | null) => void;
  onCustomerLocationsLoaded?: (hasLocations: boolean) => void;
  statusId: number;
}

interface InterventionType {
  id: number;
  label: string;
}

interface Zone {
  id: number;
  label: string;
}

export default function CustomerSectionDetail({
  ragioneSociale,
  destinazione,
  setDestinazione,
  tipologiaIntervento,
  setTipologiaIntervento,
  zona,
  setZona,
  codiceCliente,
  telefonoFisso,
  setTelefonoFisso,
  numeroCellulare,
  setNumeroCellulare,
  selectedCustomerId,
  onCustomerLocationsLoaded,
  statusId
}: CustomerSectionDetailProps) {
  console.log('🏗️ CustomerSectionDetail render with props:', {
    ragioneSociale,
    destinazione,
    codiceCliente,
    telefonoFisso,
    numeroCellulare,
    selectedCustomerId,
    statusId
  });
  
  const auth = useAuth();

  // Determina se i campi devono essere disabilitati
  // I campi sono modificabili solo fino al massimo allo status "in_carico" (ID 4)
  const isFieldsDisabled = statusId > 4;

  // Stati per le destinazioni del cliente
  const [customerLocations, setCustomerLocations] = useState<CustomerLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Stati per i tipi di intervento
  const [interventionTypes, setInterventionTypes] = useState<InterventionType[]>([]);
  const [loadingInterventionTypes, setLoadingInterventionTypes] = useState(false);

  // Stati per le zone
  const [zones, setZones] = useState<Zone[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);

  // Stato per il dialog della cronologia
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  // Funzione per caricare le destinazioni del cliente
  const fetchCustomerLocations = async (customerId: number) => {
    try {
      setLoadingLocations(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/customers/${customerId}/locations`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setCustomerLocations(data.data || []);
        onCustomerLocationsLoaded?.(data.data.length > 0);
      } else {
        console.error('Errore nel caricamento delle destinazioni');
        setCustomerLocations([]);
        onCustomerLocationsLoaded?.(false);
      }
    } catch (error) {
      console.error('Errore nel caricamento delle destinazioni:', error);
      setCustomerLocations([]);
      onCustomerLocationsLoaded?.(false);
    } finally {
      setLoadingLocations(false);
    }
  };

  // Funzione per caricare i tipi di intervento
  const fetchInterventionTypes = async () => {
    try {
      setLoadingInterventionTypes(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch('/api/intervention-types', {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setInterventionTypes(data || []);
      } else {
        console.error('Errore nel caricamento dei tipi di intervento');
        setInterventionTypes([]);
      }
    } catch (error) {
      console.error('Errore nel caricamento dei tipi di intervento:', error);
      setInterventionTypes([]);
    } finally {
      setLoadingInterventionTypes(false);
    }
  };

  // Funzione per caricare le zone
  const fetchZones = async () => {
    try {
      setLoadingZones(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch('/api/zones', {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setZones(data || []);
      } else {
        console.error('Errore nel caricamento delle zone');
        setZones([]);
      }
    } catch (error) {
      console.error('Errore nel caricamento delle zone:', error);
      setZones([]);
    } finally {
      setLoadingZones(false);
    }
  };

  // Carica tipi di intervento e zone all'avvio
  useEffect(() => {
    fetchInterventionTypes();
    fetchZones();
  }, []);

  // Se il selectedCustomerId è già presente (caricamento da API), trova il cliente
  useEffect(() => {
    console.log('🔄 CustomerSectionDetail useEffect triggered with:', {
      selectedCustomerId,
      ragioneSociale,
      codiceCliente,
      telefonoFisso,
      numeroCellulare
    });
    
    if (selectedCustomerId && ragioneSociale) {
      console.log('✅ Customer data present:', {
        codiceCliente,
        telefonoFisso,
        numeroCellulare
      });
      
      // Carica le destinazioni
      fetchCustomerLocations(selectedCustomerId);
    } else {
      console.log('❌ useEffect conditions not met:', {
        hasSelectedCustomerId: !!selectedCustomerId,
        hasRagioneSociale: !!ragioneSociale
      });
    }
  }, [selectedCustomerId, ragioneSociale, codiceCliente, telefonoFisso, numeroCellulare]);

  // Gestisce il click fuori dal dropdown
  useEffect(() => {
    // Non più necessario dato che non abbiamo dropdown di ricerca clienti
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Dati Cliente</h2>
      
      {/* Ragione sociale e Destinazione */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ragione sociale <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={ragioneSociale}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Destinazione <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select 
              value={destinazione}
              onChange={(e) => setDestinazione(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none ${
                isFieldsDisabled || loadingLocations || customerLocations.length === 0
                  ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                  : 'focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900'
              }`}
              disabled={isFieldsDisabled || loadingLocations || customerLocations.length === 0}
            >
              <option value="">
                {isFieldsDisabled
                  ? 'Campo non modificabile per questo status'
                  : !selectedCustomerId 
                  ? 'Prima seleziona una ragione sociale' 
                  : loadingLocations 
                  ? 'Caricamento destinazioni...' 
                  : customerLocations.length === 0 
                  ? 'Nessuna destinazione disponibile'
                  : 'Seleziona destinazione'
                }
              </option>
              {customerLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.company_name} - {location.address}, {location.city} ({location.province})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            {loadingLocations && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          {!selectedCustomerId && !isFieldsDisabled && (
            <p className="mt-1 text-xs text-gray-500">
              💡 Seleziona prima una ragione sociale per vedere le destinazioni disponibili
            </p>
          )}
          {isFieldsDisabled && (
            <p className="mt-1 text-xs text-gray-500">
              🔒 Campo non modificabile per questo status
            </p>
          )}
          {selectedCustomerId && customerLocations.length === 0 && !loadingLocations && !isFieldsDisabled && (
            <p className="mt-1 text-xs text-amber-600">
              ⚠️ Nessuna destinazione configurata per questo cliente
            </p>
          )}
        </div>
      </div>

      {/* Tipologia intervento e Zona */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipologia intervento <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select 
              value={tipologiaIntervento}
              onChange={(e) => setTipologiaIntervento(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none ${
                isFieldsDisabled || loadingInterventionTypes
                  ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                  : 'focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900'
              }`}
              disabled={isFieldsDisabled || loadingInterventionTypes}
            >
              <option value="">
                {isFieldsDisabled
                  ? 'Campo non modificabile per questo status'
                  : loadingInterventionTypes 
                  ? 'Caricamento...' 
                  : 'Seleziona tipologia'
                }
              </option>
              {interventionTypes.map((type) => (
                <option key={type.id} value={type.id.toString()}>
                  {type.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            {loadingInterventionTypes && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zona <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select 
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none ${
                isFieldsDisabled || loadingZones
                  ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                  : 'focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900'
              }`}
              disabled={isFieldsDisabled || loadingZones}
            >
              <option value="">
                {isFieldsDisabled
                  ? 'Campo non modificabile per questo status'
                  : loadingZones 
                  ? 'Caricamento zone...' 
                  : 'Seleziona zona'
                }
              </option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id.toString()}>
                  {zone.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            {loadingZones && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Codice cliente, Telefono fisso, Numero cellulare */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Codice cliente
          </label>
          <input 
            type="text"
            value={codiceCliente}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefono fisso
          </label>
          <div className="flex">
            <input 
              type="text"
              value={telefonoFisso}
              onChange={(e) => setTelefonoFisso(e.target.value)}
              className={`flex-1 px-3 py-2 border border-gray-300 rounded-l-lg ${
                isFieldsDisabled 
                  ? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
                  : 'bg-white text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
              }`}
              disabled={isFieldsDisabled}
            />
            <button 
              disabled={isFieldsDisabled || !telefonoFisso}
              className={`px-3 py-2 rounded-r-lg flex items-center gap-1 ${
                isFieldsDisabled || !telefonoFisso 
                  ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
            >
              <Phone size={14} />
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Numero di cellulare
          </label>
          <div className="flex">
            <input 
              type="text"
              value={numeroCellulare}
              onChange={(e) => setNumeroCellulare(e.target.value)}
              className={`flex-1 px-3 py-2 border border-gray-300 rounded-l-lg ${
                isFieldsDisabled 
                  ? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
                  : 'bg-white text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
              }`}
              disabled={isFieldsDisabled}
            />
            <button 
              disabled={isFieldsDisabled || !numeroCellulare}
              className={`px-3 py-2 rounded-r-lg flex items-center gap-1 ${
                isFieldsDisabled || !numeroCellulare 
                  ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
            >
              <Phone size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Link anagrafica */}
      <div className="text-center">
        <button 
          onClick={() => setIsHistoryDialogOpen(true)}
          disabled={!selectedCustomerId}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedCustomerId 
              ? 'bg-teal-50 text-teal-600 hover:bg-teal-100 hover:text-teal-700 border border-teal-200' 
              : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
          }`}
        >
          <History size={16} />
          Vedi anagrafica e cronologia interventi
        </button>
      </div>
      
      {/* Dialog cronologia interventi */}
      <CustomerHistoryDialog
        isOpen={isHistoryDialogOpen}
        onClose={() => setIsHistoryDialogOpen(false)}
        customerId={selectedCustomerId || 0}
        customerName={ragioneSociale}
      />
    </div>
  );
} 