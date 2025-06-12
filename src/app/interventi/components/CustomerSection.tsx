'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, Phone } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

interface Customer {
  id: number;
  company_name: string;
  client_code: string | null;
  phone_number: string;
  mobile_phone_number: string;
  address: string;
  city: string;
  zone_label: string;
  area: string | null;
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

interface CustomerSectionProps {
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

export default function CustomerSection({
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
  setSelectedCustomerId,
  onCustomerLocationsLoaded
}: CustomerSectionProps) {
  const auth = useAuth();

  // Stati per la ricerca clienti
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false); // Flag per evitare ricerche durante selezione

  // Stati per le destinazioni del cliente
  const [customerLocations, setCustomerLocations] = useState<CustomerLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Stati per i tipi di intervento
  const [interventionTypes, setInterventionTypes] = useState<InterventionType[]>([]);
  const [loadingInterventionTypes, setLoadingInterventionTypes] = useState(false);

  // Stati per le zone
  const [zones, setZones] = useState<Zone[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);

  // Funzione per cercare i clienti
  const searchCustomers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
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

      const response = await fetch(`/api/customers?query=${encodeURIComponent(query)}&skip=10`, {
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

  // Gestisce la selezione di un cliente
  const handleCustomerSelect = (customer: Customer) => {
    setIsSelecting(true); // Imposta il flag per bloccare la ricerca automatica
    setSelectedCustomer(customer);
    setRagioneSociale(customer.company_name);
    setSearchQuery(customer.company_name);
    setCodiceCliente(customer.client_code || 'N/A');
    setTelefonoFisso(customer.phone_number || 'N/A');
    setNumeroCellulare(customer.mobile_phone_number || 'N/A');
    setShowDropdown(false);
    setCustomers([]); // Pulisce i risultati per evitare che riappaiano
    
    // Auto-popola la zona se il cliente ha un'area valorizzata
    if (customer.area && zones.length > 0) {
      const matchingZone = zones.find(zone => zone.id.toString() === customer.area);
      if (matchingZone) {
        setZona(customer.area);
        console.log(`🎯 Auto-selected zone: ${matchingZone.label} (ID: ${customer.area})`);
      } else {
        setZona('');
        console.log(`⚠️ Customer area "${customer.area}" doesn't match any available zone`);
      }
    } else {
      setZona('');
      console.log(`💡 Customer has no area defined or zones not loaded yet`);
    }
    
    // Reset destinazione e carica le nuove destinazioni
    setDestinazione('');
    fetchCustomerLocations(customer.id);
    setSelectedCustomerId(customer.id);
    
    // Reset il flag dopo un breve delay per evitare che l'useEffect scatti
    setTimeout(() => setIsSelecting(false), 100);
  };

  // Gestisce il cambio del testo di ricerca
  const handleSearchChange = (value: string) => {
    setIsSelecting(false); // Reset il flag quando l'utente digita manualmente
    setSearchQuery(value);
    setRagioneSociale(value);
    
    // Se c'è un cliente selezionato e l'utente sta modificando il campo,
    // significa che vuole fare una nuova ricerca
    if (selectedCustomer && value !== selectedCustomer.company_name) {
      setSelectedCustomer(null);
      setCodiceCliente('');
      setTelefonoFisso('');
      setNumeroCellulare('');
      setDestinazione('');
      setCustomerLocations([]);
      setSelectedCustomerId(null);
      setZona('');
      onCustomerLocationsLoaded?.(false);
    }
    
    if (!value.trim()) {
      setSelectedCustomer(null);
      setCodiceCliente('');
      setTelefonoFisso('');
      setNumeroCellulare('');
      setDestinazione('');
      setCustomerLocations([]);
      setSelectedCustomerId(null);
      setZona(''); // Reset anche la zona quando si cancella la ricerca
      // Reset lo stato delle destinazioni caricate
      onCustomerLocationsLoaded?.(false);
    }
  };

  // Gestisce il click fuori dal dropdown per chiuderlo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.customer-search-container')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Debounce per la ricerca clienti
  useEffect(() => {
    // Non fare ricerca se stiamo selezionando un cliente
    if (isSelecting) return;
    
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() && searchQuery.length >= 2) {
        searchCustomers(searchQuery);
      } else {
        setCustomers([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isSelecting]);

  // Carica i dati quando il componente viene montato
  useEffect(() => {
    fetchInterventionTypes();
    fetchZones();
  }, []);

  // Auto-seleziona la zona quando le zone vengono caricate e c'è già un cliente selezionato
  useEffect(() => {
    if (selectedCustomer && selectedCustomer.area && zones.length > 0 && !zona) {
      const matchingZone = zones.find(zone => zone.id.toString() === selectedCustomer.area);
      if (matchingZone) {
        setZona(selectedCustomer.area);
        console.log(`🎯 Auto-selected zone after zones loaded: ${matchingZone.label} (ID: ${selectedCustomer.area})`);
      } else {
        console.log(`⚠️ Customer area "${selectedCustomer.area}" doesn't match any available zone after zones loaded`);
      }
    }
  }, [zones, selectedCustomer, zona]);

  return (
    <div className="space-y-6">
      {/* Ragione sociale e Destinazione */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ragione sociale <span className="text-red-500">*</span>
          </label>
          <div className="relative customer-search-container">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  // Solo mostra il dropdown se ci sono risultati e non c'è un cliente già selezionato
                  if (customers.length > 0 && !selectedCustomer) {
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
            </div>
            
            {/* Dropdown con risultati */}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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