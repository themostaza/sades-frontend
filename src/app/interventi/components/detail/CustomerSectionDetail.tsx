'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, Phone } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';

interface Customer {
  id: number;
  company_name: string;
  client_code: string | null;
  phone_number: string;
  mobile_phone_number: string;
  address: string;
  city: string;
  zone_label: string;
}

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
  setRagioneSociale,
  destinazione,
  setDestinazione,
  tipologiaIntervento,
  setTipologiaIntervento,
  zona,
  setZona,
  codiceCliente,
  setCodiceCliente,
  telefonoFisso,
  setTelefonoFisso,
  numeroCellulare,
  setNumeroCellulare,
  selectedCustomerId,
  setSelectedCustomerId,
  onCustomerLocationsLoaded
}: CustomerSectionDetailProps) {
  console.log('🏗️ CustomerSectionDetail render with props:', {
    ragioneSociale,
    destinazione,
    codiceCliente,
    telefonoFisso,
    numeroCellulare,
    selectedCustomerId
  });
  
  const auth = useAuth();

  // Stati per la ricerca clienti
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Stati per le destinazioni del cliente
  const [customerLocations, setCustomerLocations] = useState<CustomerLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Stati per i tipi di intervento
  const [interventionTypes, setInterventionTypes] = useState<InterventionType[]>([]);
  const [loadingInterventionTypes, setLoadingInterventionTypes] = useState(false);

  // Stati per le zone
  const [zones, setZones] = useState<Zone[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);

  // Funzione per cercare clienti
  const searchCustomers = async (query: string) => {
    if (query.length < 2) {
      setCustomers([]);
      setShowDropdown(false);
      return;
    }

    try {
      setIsSearching(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/customers?query=${encodeURIComponent(query)}&page=1&skip=50`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.data || []);
        setShowDropdown(true);
      } else {
        console.error('Errore nella ricerca clienti');
        setCustomers([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Errore nella ricerca clienti:', error);
      setCustomers([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Funzione per gestire la selezione di un cliente
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedCustomerId(customer.id);
    setRagioneSociale(customer.company_name);
    setCodiceCliente(customer.client_code || '');
    setTelefonoFisso(customer.phone_number);
    setNumeroCellulare(customer.mobile_phone_number);
    setSearchQuery(customer.company_name);
    setShowDropdown(false);
    
    // Carica le destinazioni per questo cliente
    fetchCustomerLocations(customer.id);
  };

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
      numeroCellulare,
      selectedCustomer: !!selectedCustomer
    });
    
    if (selectedCustomerId && ragioneSociale && !selectedCustomer) {
      console.log('✅ Creating customer object with data:', {
        codiceCliente,
        telefonoFisso,
        numeroCellulare
      });
      
      // Simula il cliente selezionato basandoci sui dati presenti
      const customer: Customer = {
        id: selectedCustomerId,
        company_name: ragioneSociale,
        client_code: codiceCliente,
        phone_number: telefonoFisso,
        mobile_phone_number: numeroCellulare,
        address: '',
        city: '',
        zone_label: ''
      };
      setSelectedCustomer(customer);
      setSearchQuery(ragioneSociale);
      
      console.log('✅ Customer object created and set:', customer);
      
      // Carica le destinazioni
      if (selectedCustomerId) {
        fetchCustomerLocations(selectedCustomerId);
      }
    } else {
      console.log('❌ useEffect conditions not met:', {
        hasSelectedCustomerId: !!selectedCustomerId,
        hasRagioneSociale: !!ragioneSociale,
        hasNoSelectedCustomer: !selectedCustomer
      });
    }
  }, [selectedCustomerId, ragioneSociale, codiceCliente, telefonoFisso, numeroCellulare]);

  // Gestisce il debounce per la ricerca
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery && searchQuery !== ragioneSociale) {
        searchCustomers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Gestisce il click fuori dal dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.customer-search-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
          <div className="relative customer-search-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setRagioneSociale(e.target.value);
                if (e.target.value !== selectedCustomer?.company_name) {
                  setSelectedCustomer(null);
                  setSelectedCustomerId(null);
                  setCodiceCliente('');
                  setTelefonoFisso('');
                  setNumeroCellulare('');
                  setDestinazione('');
                  setCustomerLocations([]);
                }
              }}
              onFocus={() => {
                if (customers.length > 0) {
                  setShowDropdown(true);
                }
              }}
              placeholder="Cerca ragione sociale..."
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            {isSearching && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {showDropdown && customers.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{customer.company_name}</div>
                    <div className="text-sm text-gray-500">
                      {customer.address}, {customer.city} - {customer.zone_label}
                    </div>
                    <div className="text-xs text-gray-400">
                      Tel: {customer.phone_number || 'N/A'} | Cell: {customer.mobile_phone_number || 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Destinazione <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select 
              value={destinazione}
              onChange={(e) => setDestinazione(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white text-gray-900"
              disabled={!selectedCustomer || loadingLocations || customerLocations.length === 0}
            >
              <option value="">
                {!selectedCustomer 
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
          {!selectedCustomer && (
            <p className="mt-1 text-xs text-gray-500">
              💡 Seleziona prima una ragione sociale per vedere le destinazioni disponibili
            </p>
          )}
          {selectedCustomer && customerLocations.length === 0 && !loadingLocations && (
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white text-gray-900"
              disabled={loadingInterventionTypes}
            >
              <option value="">
                {loadingInterventionTypes ? 'Caricamento...' : 'Seleziona tipologia'}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white text-gray-900"
              disabled={loadingZones}
            >
              <option value="">
                {loadingZones ? 'Caricamento zone...' : 'Seleziona zona'}
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-gray-500"
            />
            <button className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-r-lg flex items-center gap-1">
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-gray-500"
            />
            <button className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-r-lg flex items-center gap-1">
              <Phone size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Link anagrafica */}
      <div className="text-center">
        <button className="text-teal-600 hover:text-teal-700 text-sm font-medium">
          Vedi anagrafica e cronologia interventi
        </button>
      </div>
    </div>
  );
} 