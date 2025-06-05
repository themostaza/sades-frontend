'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Phone, MapPin, Calendar, Filter, Wrench, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AssistanceIntervention, AssistanceInterventionsApiResponse } from '../../types/assistance-interventions';

interface Customer {
  id: number;
  company_name: string;
  client_code: string | null;
  destination_registry: string | null;
  area: string;
  address: string;
  vat_number: string;
  fiscal_code: string;
  phone_number: string;
  mobile_phone_number: string;
  blacklisted: boolean;
  created_at: string;
  updated_at: string;
  external_id: string | null;
  zip: string;
  city: string;
  zone_label: string;
}

interface DettaglioClienteProps {
  customerId: number;
  onBack: () => void;
  onCustomerUpdated?: () => void;
}

export default function DettaglioCliente({ customerId, onBack, onCustomerUpdated }: DettaglioClienteProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingBlacklist, setUpdatingBlacklist] = useState(false);
  
  // Stati per la cronologia interventi
  const [interventions, setInterventions] = useState<AssistanceIntervention[]>([]);
  const [interventionsLoading, setInterventionsLoading] = useState(false);
  const [interventionsMeta, setInterventionsMeta] = useState({
    total: 0,
    page: 1,
    skip: 20,
    totalPages: 0
  });
  const [filtroAnno, setFiltroAnno] = useState('');
  const [filtroTipologia, setFiltroTipologia] = useState('');

  const auth = useAuth();

  // Fetch customer details
  const fetchCustomerDetails = async () => {
    if (!customerId) return;
    
    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/customers/${customerId}`, {
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch customer details');
      }

      const data = await response.json();
      setCustomer(data.data || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching customer details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch assistance interventions for this customer
  const fetchInterventions = async (page: number = 1) => {
    if (!customerId) return;
    
    try {
      setInterventionsLoading(true);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      // Costruisco i parametri della query
      const params = new URLSearchParams({
        customer_id: customerId.toString(),
        page: page.toString(),
        skip: '20'
      });

      // Aggiungo filtri se presenti
      if (filtroAnno) {
        params.append('from_date', `${filtroAnno}-01-01`);
        params.append('to_date', `${filtroAnno}-12-31`);
      }

      const response = await fetch(`/api/assistance-interventions?${params.toString()}`, {
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch interventions');
      }

      const data: AssistanceInterventionsApiResponse = await response.json();
      setInterventions(data.data || []);
      setInterventionsMeta(data.meta || {
        total: 0,
        page: 1,
        skip: 20,
        totalPages: 0
      });
    } catch (err) {
      console.error('Error fetching interventions:', err);
    } finally {
      setInterventionsLoading(false);
    }
  };

  // Toggle blacklist status
  const toggleBlacklist = async () => {
    if (!customer) return;

    try {
      setUpdatingBlacklist(true);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          blacklisted: !customer.blacklisted
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Failed to update blacklist status');
      }

      // Aggiorna lo stato locale
      setCustomer(prev => prev ? { ...prev, blacklisted: !prev.blacklisted } : null);
      
      // Notifica il componente padre per aggiornare la lista
      if (onCustomerUpdated) {
        onCustomerUpdated();
      }

      console.log('✅ Blacklist status updated successfully');
    } catch (err) {
      console.error('Error updating blacklist status:', err);
      alert('Errore nell\'aggiornamento dello status blacklist');
    } finally {
      setUpdatingBlacklist(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
      fetchInterventions();
    }
  }, [customerId]);

  // Effetto per ricaricare gli interventi quando cambiano i filtri
  useEffect(() => {
    if (customerId) {
      fetchInterventions(1);
    }
  }, [filtroAnno]);

  // Gestione paginazione
  const handlePreviousPage = () => {
    if (interventionsMeta.page > 1) {
      fetchInterventions(interventionsMeta.page - 1);
    }
  };

  const handleNextPage = () => {
    if (interventionsMeta.page < interventionsMeta.totalPages) {
      fetchInterventions(interventionsMeta.page + 1);
    }
  };

  // Formatta la data per la visualizzazione
  const formatDate = (dateString: string) => {
    // Se la data è mancante, null, undefined o stringa vuota, non mostrare nulla
    if (!dateString || dateString.trim() === '') {
      return '-';
    }
    
    try {
      const date = new Date(dateString);
      // Verifica se la data è valida
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      // Verifica se è una data "epoch" (1970) che indica data non impostata
      if (date.getFullYear() <= 1970) {
        return '-';
      }
      
      return date.toLocaleDateString('it-IT');
    } catch {
      return '-';
    }
  };

  // Gestione visualizzazione intervento
  const handleViewIntervention = (interventionId: number) => {
    console.log('Visualizza intervento:', interventionId);
    // TODO: Implementare navigazione al dettaglio intervento
  };

  // Genera gli anni disponibili per il filtro
  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2020; year--) {
      years.push(year);
    }
    return years;
  };

  if (loading && !customer) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento dettagli cliente...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">Errore nel caricamento del cliente</p>
            <button 
              onClick={fetchCustomerDetails}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg"
            >
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Cliente</h1>
        </div>
        
        {/* Azioni Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => console.log('Visualizza attrezzature:', customer?.id)}
            className="px-4 py-2 rounded-lg font-medium transition-colors bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Wrench size={16} />
            Vedi apparecchiature
          </button>
          
          <button
            onClick={toggleBlacklist}
            disabled={updatingBlacklist}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              updatingBlacklist 
                ? 'opacity-50 cursor-not-allowed bg-white border border-gray-300 text-gray-700' 
                : customer?.blacklisted
                  ? 'bg-white border border-red-300 text-red-700 hover:bg-red-50'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {updatingBlacklist ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                Aggiornamento...
              </>
            ) : (
              <>
                <AlertTriangle size={16} />
                {customer?.blacklisted ? 'Rimuovi da blacklist' : 'Aggiungi in blacklist'}
              </>
            )}
          </button>
        </div>
      </div>

      {customer && (
        <div className="space-y-6">
          {/* Informazioni Cliente */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Informazioni Cliente</h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colonna Sinistra */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Ragione sociale
                    </label>
                    <div className="text-lg font-medium text-gray-900">
                      {customer.company_name}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Partita IVA
                    </label>
                    <div className="text-gray-900">
                      {customer.vat_number || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Zona
                    </label>
                    <div className="text-gray-900">
                      {customer.zone_label || customer.area || '-'}
                    </div>
                  </div>
                </div>

                {/* Colonna Destra */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Codice cliente
                    </label>
                    <div className="text-gray-900">
                      {customer.client_code || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Codice Fiscale
                    </label>
                    <div className="text-gray-900">
                      {customer.fiscal_code || '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Destinazioni */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Destinazioni</h2>
            </div>
            
            <div className="p-6">
              {/* Destinazione principale */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {customer.destination_registry || customer.company_name}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Telefono fisso
                    </label>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {customer.phone_number || '-'}
                      </span>
                      {customer.phone_number && (
                        <button className="text-xs text-teal-600 hover:text-teal-700">
                          Chiama
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Numero di cellulare
                    </label>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {customer.mobile_phone_number || '-'}
                      </span>
                      {customer.mobile_phone_number && (
                        <button className="text-xs text-teal-600 hover:text-teal-700">
                          Chiama
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Indirizzo
                  </label>
                  <div className="text-sm text-gray-900">
                    {customer.address}, {customer.zip} {customer.city}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cronologia Interventi */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Cronologia interventi</h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Filtri */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <select
                    value={filtroAnno}
                    onChange={(e) => setFiltroAnno(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="">Filtra per anno</option>
                    {getAvailableYears().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-400" />
                  <select
                    value={filtroTipologia}
                    onChange={(e) => setFiltroTipologia(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="">Filtra per tipologia, codice PNC e seriale apparecchiature</option>
                  </select>
                </div>
              </div>

              {/* Tabella Cronologia */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Data
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Codice riferimento
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tipologia intervento
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Assegnato a
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {interventionsLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          <div className="text-center">
                            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p>Caricamento interventi...</p>
                          </div>
                        </td>
                      </tr>
                    ) : interventions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          <div className="text-center">
                            <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                            <p>Nessun intervento trovato</p>
                            <p className="text-sm text-gray-400 mt-1">
                              Pagina {interventionsMeta.page} di {interventionsMeta.totalPages}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      interventions.map((intervento) => (
                        <tr key={intervento.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(intervento.date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {intervento.call_code}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {intervento.type_label}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {intervento.assigned_to_name} {intervento.assigned_to_surname || ''}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span 
                              className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                              style={{ 
                                backgroundColor: `${intervento.status_color}20`,
                                color: intervento.status_color 
                              }}
                            >
                              {intervento.status_label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button 
                              onClick={() => handleViewIntervention(intervento.id)}
                              className="text-teal-600 hover:text-teal-700 p-1 rounded"
                              title="Visualizza dettagli intervento"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginazione */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Pagina {interventionsMeta.page} di {interventionsMeta.totalPages} 
                  ({interventionsMeta.total} interventi totali)
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handlePreviousPage}
                    disabled={interventionsMeta.page <= 1}
                    className={`px-3 py-1 ${
                      interventionsMeta.page <= 1 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-teal-600 hover:text-teal-700'
                    }`}
                  >
                    Indietro
                  </button>
                  <button 
                    onClick={handleNextPage}
                    disabled={interventionsMeta.page >= interventionsMeta.totalPages}
                    className={`px-3 py-1 ${
                      interventionsMeta.page >= interventionsMeta.totalPages 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-teal-600 hover:text-teal-700'
                    }`}
                  >
                    Avanti
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 