'use client';

import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, AlertTriangle, Eye, Wrench } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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

interface CustomersApiResponse {
  data: Customer[];
  meta: {
    total: number;
    page: number;
    skip: number;
    totalPages: number;
  };
}

export default function ClientiPage() {
  // Stati per la ricerca e paginazione
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Stati per i dati clienti normali
  const [customersData, setCustomersData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    skip: 20,
    totalPages: 1
  });

  // Stati per la sezione blacklist
  const [showBlacklistSection, setShowBlacklistSection] = useState(false);
  const [blacklistData, setBlacklistData] = useState<Customer[]>([]);
  const [blacklistLoading, setBlacklistLoading] = useState(false);
  const [blacklistError, setBlacklistError] = useState<string | null>(null);
  const [blacklistMeta, setBlacklistMeta] = useState({
    total: 0,
    page: 1,
    skip: 20,
    totalPages: 1
  });
  const [blacklistCurrentPage, setBlacklistCurrentPage] = useState(1);
  const [blacklistSearchTerm, setBlacklistSearchTerm] = useState('');

  const auth = useAuth();

  // Funzione per recuperare i clienti normali
  const fetchCustomersData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        skip: pageSize.toString(),
        blacklist: '0', // Solo clienti non in blacklist
      });
      
      if (searchTerm.trim()) {
        params.append('query', searchTerm.trim());
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/customers?${params.toString()}`, {
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Sessione scaduta, effettuando logout');
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch customers data');
      }
      
      const data: CustomersApiResponse = await response.json();
      setCustomersData(data.data);
      setMeta(data.meta);
      console.log('✅ Clienti caricati:', data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching customers data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Funzione per recuperare i clienti in blacklist
  const fetchBlacklistData = async () => {
    try {
      setBlacklistLoading(true);
      setBlacklistError(null);
      
      const params = new URLSearchParams({
        page: blacklistCurrentPage.toString(),
        skip: pageSize.toString(),
        blacklist: '1', // Solo clienti in blacklist
      });
      
      if (blacklistSearchTerm.trim()) {
        params.append('query', blacklistSearchTerm.trim());
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/customers?${params.toString()}`, {
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Sessione scaduta, effettuando logout');
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch blacklist data');
      }
      
      const data: CustomersApiResponse = await response.json();
      setBlacklistData(data.data);
      setBlacklistMeta(data.meta);
      console.log('✅ Clienti blacklist caricati:', data.meta);
    } catch (err) {
      setBlacklistError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching blacklist data:', err);
    } finally {
      setBlacklistLoading(false);
    }
  };

  // Effetti per caricare i dati
  useEffect(() => {
    fetchCustomersData();
  }, [currentPage, searchTerm, auth.token]);

  useEffect(() => {
    if (showBlacklistSection) {
      fetchBlacklistData();
    }
  }, [showBlacklistSection, blacklistCurrentPage, blacklistSearchTerm, auth.token]);

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleBlacklistSearch = (value: string) => {
    setBlacklistSearchTerm(value);
    setBlacklistCurrentPage(1);
  };

  const handleBlacklistPageChange = (newPage: number) => {
    setBlacklistCurrentPage(newPage);
  };

  const getBlacklistCount = () => {
    return blacklistMeta.total;
  };

  if (loading && customersData.length === 0) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento clienti...</p>
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
            <p className="text-red-600 mb-4">Errore nel caricamento dei clienti</p>
            <button 
              onClick={fetchCustomersData}
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
        <h1 className="text-2xl font-semibold text-gray-900">Clienti</h1>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca cliente, codice cliente"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ragione sociale
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Codice cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customersData.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{customer.company_name}</div>
                      {customer.destination_registry && (
                        <div className="text-xs text-gray-500">{customer.destination_registry}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {customer.client_code || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div>
                      {customer.phone_number && <div>{customer.phone_number}</div>}
                      {customer.mobile_phone_number && (
                        <div className="text-xs text-gray-500">{customer.mobile_phone_number}</div>
                      )}
                      {!customer.phone_number && !customer.mobile_phone_number && <span className="text-gray-400">-</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => console.log('Visualizza dati cliente:', customer.id)}
                        className="text-teal-600 hover:text-teal-700 transition-colors"
                        title="Visualizza dati cliente"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => console.log('Visualizza attrezzature:', customer.id)}
                        className="text-blue-600 hover:text-blue-700 transition-colors"
                        title="Visualizza attrezzature"
                      >
                        <Wrench size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Pagina {meta.page} di {meta.totalPages} - Totale: {meta.total} clienti
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Indietro
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              {currentPage}
            </span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= 270 || loading}
              className="px-3 py-1 text-sm text-teal-600 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Avanti
            </button>
          </div>
        </div>
      </div>

      {/* Blacklist Section - Accordion */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowBlacklistSection(!showBlacklistSection)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium text-gray-900">Clienti in Blacklist</h2>
            {blacklistMeta.total > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <AlertTriangle size={12} className="mr-1" />
                {getBlacklistCount()}
              </span>
            )}
          </div>
          <ChevronDown 
            className={`transform transition-transform ${showBlacklistSection ? 'rotate-180' : ''}`} 
            size={20} 
          />
        </button>
        
        {showBlacklistSection && (
          <div className="border-t border-gray-200">
            {/* Search for blacklist */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Cerca cliente, codice cliente"
                  value={blacklistSearchTerm}
                  onChange={(e) => handleBlacklistSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            {/* Loading state for blacklist */}
            {blacklistLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-500">Caricamento clienti blacklist...</div>
              </div>
            )}

            {/* Error state for blacklist */}
            {blacklistError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-6">
                <div className="text-red-800">Errore: {blacklistError}</div>
                <button 
                  onClick={fetchBlacklistData}
                  className="mt-2 text-red-600 hover:text-red-800 underline"
                >
                  Riprova
                </button>
              </div>
            )}

            {/* Blacklist table */}
            {!blacklistLoading && !blacklistError && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ragione sociale
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Codice cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Telefono
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {blacklistData.map((customer) => (
                      <tr key={customer.id} className="hover:bg-red-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={16} className="text-red-500" />
                            <div>
                              <div className="font-medium">{customer.company_name}</div>
                              {customer.destination_registry && (
                                <div className="text-xs text-gray-500">{customer.destination_registry}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {customer.client_code || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div>
                            {customer.phone_number && <div>{customer.phone_number}</div>}
                            {customer.mobile_phone_number && (
                              <div className="text-xs text-gray-500">{customer.mobile_phone_number}</div>
                            )}
                            {!customer.phone_number && !customer.mobile_phone_number && <span className="text-gray-400">-</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => console.log('Visualizza dati cliente blacklist:', customer.id)}
                              className="text-teal-600 hover:text-teal-700 transition-colors"
                              title="Visualizza dati cliente"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => console.log('Visualizza attrezzature blacklist:', customer.id)}
                              className="text-blue-600 hover:text-blue-700 transition-colors"
                              title="Visualizza attrezzature"
                            >
                              <Wrench size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination for blacklist */}
            {!blacklistLoading && !blacklistError && blacklistData.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Pagina {blacklistMeta.page} di {blacklistMeta.totalPages} (Totale: {blacklistMeta.total} clienti in blacklist)
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleBlacklistPageChange(blacklistCurrentPage - 1)}
                    disabled={blacklistCurrentPage <= 1 || blacklistLoading}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Indietro
                  </button>
                  <button 
                    onClick={() => handleBlacklistPageChange(blacklistCurrentPage + 1)}
                    disabled={blacklistCurrentPage >= blacklistMeta.totalPages || blacklistLoading}
                    className="px-3 py-1 text-sm text-teal-600 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Avanti
                  </button>
                </div>
              </div>
            )}

            {/* Empty state for blacklist */}
            {!blacklistLoading && !blacklistError && blacklistData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Nessun cliente in blacklist</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
