'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AbsencesTable from './AbsencesTable';

interface TeamMember {
  id: string;
  name: string;
  surname: string;
  fiscal_code: string;
  email: string;
  phone_number: string;
  note: string;
  disabled: boolean;
  status: string;
  role: string;
}

interface ApiResponse {
  data: TeamMember[];
  meta: {
    total: number;
    page: number;
    skip: number;
    totalPages: number;
  };
}

export default function TeamPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Stati per i dati API
  const [teamData, setTeamData] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    skip: 20,
    totalPages: 1
  });

  const auth = useAuth();

  // Funzione per recuperare i dati dall'API
  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        skip: pageSize.toString(),
      });
      
      if (searchTerm.trim()) {
        params.append('query', searchTerm.trim());
      }
      
      if (selectedRole) {
        params.append('role_id', selectedRole);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/users?${params.toString()}`, {
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch team data');
      }
      
      const data: ApiResponse = await response.json();
      setTeamData(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching team data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Effetto per caricare i dati iniziali e quando cambiano i filtri
  useEffect(() => {
    fetchTeamData();
  }, [currentPage, searchTerm, selectedRole]);

  const getStatusColor = (status: string, disabled: boolean) => {
    if (disabled) {
      return 'bg-red-100 text-red-800';
    }
    switch (status.toLowerCase()) {
      case 'active':
      case 'attivo':
        return 'bg-green-100 text-green-800';
      case 'disabled':
      case 'inattivo':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleRoleFilter = (role: string) => {
    setSelectedRole(role);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Funzione per formattare il nominativo
  const formatNominativo = (member: TeamMember) => {
    if (member.name && member.surname) {
      return `${member.name} ${member.surname}`;
    }
    return member.name || 'N/A';
  };

  // Funzione per formattare lo status
  const formatStatus = (member: TeamMember) => {
    if (member.disabled) {
      return 'Inattivo';
    }
    return member.status === 'active' ? 'Attivo' : member.status;
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Team</h1>
        <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus size={16} />
          Aggiungi nuovo
        </button>
      </div>

      {/* Search and filters */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca nome, cognome, codice fiscale"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 text-gray-800 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          
          <div className="relative">
            <select
              value={selectedRole}
              onChange={(e) => handleRoleFilter(e.target.value)}
              className="flex items-center gap-2 px-4 py-2 border text-gray-800 border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8"
            >
              <option value="">Filtra per ruolo</option>
              <option value="amministrazione">Amministrazione</option>
              <option value="tecnico">Tecnico</option>
              <option value="ufficio">Ufficio</option>
              <option value="magazzino">Magazzino</option>
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">Caricamento...</div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-800">Errore: {error}</div>
          <button 
            onClick={fetchTeamData}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Riprova
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nominativo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Codice fiscale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ruolo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teamData.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNominativo(member)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {member.fiscal_code || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {member.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {member.phone_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {member.role || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          member.status,
                          member.disabled
                        )}`}
                      >
                        {formatStatus(member)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Pagina {meta.page} di {meta.totalPages} (Totale: {meta.total} utenti)
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handlePageChange(meta.page - 1)}
                disabled={meta.page <= 1}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Indietro
              </button>
              <button 
                onClick={() => handlePageChange(meta.page + 1)}
                disabled={meta.page >= meta.totalPages}
                className="px-3 py-1 text-sm text-teal-600 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Avanti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Componente Assenze tecnici */}
      <AbsencesTable />
    </div>
  );
}