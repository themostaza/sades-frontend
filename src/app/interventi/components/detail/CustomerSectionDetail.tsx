'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, History } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import CustomerHistoryDialog from '../CustomerHistoryDialog';

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
  zone_id: number;
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
  statusId?: number;
  isCreating?: boolean;
  disabled?: boolean;
  hasSelectedEquipments?: boolean;
  onClearSelectedEquipments?: () => void;
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
  onCustomerLocationsLoaded,
  statusId = 1, // Default to a non-disabling status
  isCreating = false,
  disabled = false,
  hasSelectedEquipments = false,
  onClearSelectedEquipments,
}: CustomerSectionDetailProps) {
  const auth = useAuth();

  const isFieldsDisabled = !isCreating && statusId > 4;

  // Dialog conferma cambio destinazione
  const [isDestinationDialogOpen, setIsDestinationDialogOpen] = useState(false);
  const [pendingDestinazione, setPendingDestinazione] = useState<string | null>(
    null
  );

  // Stati per la ricerca clienti (usati solo in modalità creazione)
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomerForSearch, setSelectedCustomerForSearch] =
    useState<Customer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const [customerLocations, setCustomerLocations] = useState<
    CustomerLocation[]
  >([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [interventionTypes, setInterventionTypes] = useState<
    InterventionType[]
  >([]);
  const [loadingInterventionTypes, setLoadingInterventionTypes] =
    useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  // Funzioni di ricerca clienti (solo per isCreating)
  const searchCustomers = async (query: string) => {
    if (!isCreating || !query.trim() || query.length < 2) {
      setCustomers([]);
      setShowDropdown(false);
      return;
    }
    try {
      setIsSearching(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      const response = await fetch(
        `/api/customers?query=${encodeURIComponent(query)}&skip=10`,
        { headers }
      );
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.data || []);
        setShowDropdown(true);
      } else {
        setCustomers([]);
        setShowDropdown(false);
      }
    } catch {
      setCustomers([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setIsSelecting(true);
    setSelectedCustomerForSearch(customer);
    setRagioneSociale(customer.company_name);
    setSearchQuery(customer.company_name);
    setCodiceCliente(customer.client_code || 'N/A');
    setTelefonoFisso(customer.phone_number || 'N/A');
    setNumeroCellulare(customer.mobile_phone_number || 'N/A');
    setShowDropdown(false);
    setCustomers([]);

    if (customer.area && zones.length > 0) {
      const matchingZone = zones.find((z) => z.id === customer.zone_id);
      if (matchingZone) setZona(String(customer.zone_id));
      else setZona('');
    } else {
      setZona('');
    }

    setDestinazione('');
    fetchCustomerLocations(customer.id);
    setSelectedCustomerId(customer.id);

    setTimeout(() => setIsSelecting(false), 100);
  };

  const handleSearchChange = (value: string) => {
    setIsSelecting(false);
    setSearchQuery(value);
    setRagioneSociale(value);
    // Reset sempre il cliente selezionato quando l'utente modifica il testo
    setSelectedCustomerForSearch(null);

    if (!value.trim()) {
      setCodiceCliente('');
      setTelefonoFisso('');
      setNumeroCellulare('');
      setDestinazione('');
      setCustomerLocations([]);
      setSelectedCustomerId(null);
      setZona('');
      onCustomerLocationsLoaded?.(false);
    }
  };

  const fetchCustomerLocations = async (customerId: number) => {
    try {
      setLoadingLocations(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      const response = await fetch(`/api/customers/${customerId}/locations`, {
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        setCustomerLocations(data.data || []);
        onCustomerLocationsLoaded?.((data.data || []).length > 0);
      } else {
        setCustomerLocations([]);
        onCustomerLocationsLoaded?.(false);
      }
    } catch {
      setCustomerLocations([]);
      onCustomerLocationsLoaded?.(false);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchInterventionTypes = async () => {
    setLoadingInterventionTypes(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      const response = await fetch('/api/intervention-types', { headers });
      if (response.ok) {
        setInterventionTypes((await response.json()) || []);
      } else {
        setInterventionTypes([]);
      }
    } catch {
      setInterventionTypes([]);
    } finally {
      setLoadingInterventionTypes(false);
    }
  };

  const fetchZones = async () => {
    setLoadingZones(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      const response = await fetch('/api/zones', { headers });
      if (response.ok) {
        setZones((await response.json()) || []);
      } else {
        setZones([]);
      }
    } catch {
      setZones([]);
    } finally {
      setLoadingZones(false);
    }
  };

  useEffect(() => {
    fetchInterventionTypes();
    fetchZones();
  }, []);

  useEffect(() => {
    if (!isCreating && selectedCustomerId) {
      fetchCustomerLocations(selectedCustomerId);
    }
  }, [isCreating, selectedCustomerId]);

  // Debounce for customer search in creation mode
  useEffect(() => {
    if (!isCreating || isSelecting || selectedCustomerForSearch) return;
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() && searchQuery.length >= 2) {
        searchCustomers(searchQuery);
      } else {
        setCustomers([]);
        setShowDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, isCreating, isSelecting]);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isCreating && !target.closest('.customer-search-container')) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, isCreating]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Dati Cliente</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ragione sociale <span className="text-red-500">*</span>
          </label>
          {isCreating ? (
            <div className="relative customer-search-container">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    if (customers.length > 0 && !selectedCustomerForSearch) {
                      setShowDropdown(true);
                    }
                  }}
                  placeholder="Cerca ragione sociale..."
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                  disabled={disabled}
                />
                <Search
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={16}
                />
                {isSearching && (
                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {showDropdown && customers.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">
                        {customer.company_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {customer.address}, {customer.city} -{' '}
                        {customer.zone_label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={ragioneSociale}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              disabled={disabled}
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Destinazione <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={destinazione}
              onChange={(e) => {
                const newValue = e.target.value;
                if (hasSelectedEquipments && newValue !== destinazione) {
                  setPendingDestinazione(newValue);
                  setIsDestinationDialogOpen(true);
                  return;
                }
                setDestinazione(newValue);
              }}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none ${
                isFieldsDisabled ||
                loadingLocations ||
                customerLocations.length === 0 ||
                disabled
                  ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                  : 'focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900'
              }`}
              disabled={
                isFieldsDisabled ||
                loadingLocations ||
                customerLocations.length === 0 ||
                !selectedCustomerId ||
                disabled
              }
            >
              <option value="">
                {isFieldsDisabled
                  ? 'Campo non modificabile'
                  : !selectedCustomerId
                    ? 'Seleziona cliente'
                    : loadingLocations
                      ? 'Caricamento...'
                      : customerLocations.length === 0
                        ? 'Nessuna destinazione'
                        : 'Seleziona destinazione'}
              </option>
              {customerLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.company_name} - {location.address}, {location.city}{' '}
                  ({location.province})
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={16}
            />
          </div>
        </div>
      </div>

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
                isFieldsDisabled || loadingInterventionTypes || disabled
                  ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                  : 'focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900'
              }`}
              disabled={
                isFieldsDisabled || loadingInterventionTypes || disabled
              }
            >
              <option value="">
                {loadingInterventionTypes
                  ? 'Caricamento...'
                  : 'Seleziona tipologia'}
              </option>
              {interventionTypes.map((type) => (
                <option key={type.id} value={type.id.toString()}>
                  {type.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={16}
            />
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
                isFieldsDisabled || loadingZones || disabled
                  ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                  : 'focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900'
              }`}
              disabled={isFieldsDisabled || loadingZones || disabled}
            >
              <option value="">
                {loadingZones ? 'Caricamento...' : 'Seleziona zona'}
              </option>
              {zones.map((zoneItem) => (
                <option key={zoneItem.id} value={zoneItem.id.toString()}>
                  {zoneItem.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={16}
            />
          </div>
        </div>
      </div>

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
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefono fisso
          </label>
          <input
            type="text"
            value={telefonoFisso}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Numero di cellulare
          </label>
          <input
            type="text"
            value={numeroCellulare}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={() => setIsHistoryDialogOpen(true)}
          disabled={!selectedCustomerId || disabled}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedCustomerId
              ? 'bg-teal-50 text-teal-600 hover:bg-teal-100'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
          <History size={16} />
          Vedi anagrafica e cronologia interventi
        </button>
      </div>

      <CustomerHistoryDialog
        isOpen={isHistoryDialogOpen}
        onClose={() => setIsHistoryDialogOpen(false)}
        customerId={selectedCustomerId || 0}
        customerName={ragioneSociale}
      />

      {/* Dialog conferma cambio destinazione */}
      {isDestinationDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Confermare cambio destinazione?
              </h3>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Cambiando destinazione verranno rimosse le apparecchiature già
                selezionate. Vuoi procedere?
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setPendingDestinazione(null);
                  setIsDestinationDialogOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  if (onClearSelectedEquipments) onClearSelectedEquipments();
                  if (pendingDestinazione !== null)
                    setDestinazione(pendingDestinazione);
                  setPendingDestinazione(null);
                  setIsDestinationDialogOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
