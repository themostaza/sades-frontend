'use client';

import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Plus, Filter, User } from 'lucide-react';

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

interface Absence {
  id: number;
  user_uid: string;
  from_date: string;
  to_date: string;
  status: string;
  note: string;
  created_at: string;
  updated_at: string;
  name: string;
  surname: string;
}

interface AbsencesApiResponse {
  data: Absence[];
  meta: {
    total: string;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function TeamPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [showAssenzeSection, setShowAssenzeSection] = useState(false);
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
  
  // Stati per la sezione assenze
  const [absencesData, setAbsencesData] = useState<Absence[]>([]);
  const [absencesLoading, setAbsencesLoading] = useState(false);
  const [absencesError, setAbsencesError] = useState<string | null>(null);
  const [absencesMeta, setAbsencesMeta] = useState({
    total: '0',
    page: 1,
    limit: 20,
    totalPages: 1
  });
  const [absencesCurrentPage, setAbsencesCurrentPage] = useState(1);
  const [selectedNominativo, setSelectedNominativo] = useState('');
  const [selectedFromDate, setSelectedFromDate] = useState('');
  const [selectedToDate, setSelectedToDate] = useState('');
  const [selectedAbsenceStatus, setSelectedAbsenceStatus] = useState('');

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

      const response = await fetch(`/api/users?${params.toString()}`);
      
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

  // Funzione per recuperare le assenze dall'API
  const fetchAbsencesData = async () => {
    try {
      setAbsencesLoading(true);
      setAbsencesError(null);
      
      const params = new URLSearchParams({
        page: absencesCurrentPage.toString(),
        limit: '20',
      });
      
      if (selectedFromDate) {
        params.append('from_date', selectedFromDate);
      }
      
      if (selectedToDate) {
        params.append('to_date', selectedToDate);
      }
      
      if (selectedAbsenceStatus) {
        params.append('status', selectedAbsenceStatus);
      }
      
      if (selectedNominativo) {
        // Qui dovremmo mappare il nominativo al user_id
        // Per ora uso il nominativo direttamente
        params.append('user_id', selectedNominativo);
      }

      const response = await fetch(`/api/absences?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch absences data');
      }
      
      const data: AbsencesApiResponse = await response.json();
      setAbsencesData(data.data);
      setAbsencesMeta(data.meta);
    } catch (err) {
      setAbsencesError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching absences data:', err);
    } finally {
      setAbsencesLoading(false);
    }
  };

  // Effetto per caricare i dati iniziali e quando cambiano i filtri
  useEffect(() => {
    fetchTeamData();
  }, [currentPage, searchTerm, selectedRole]);

  // Effetto per caricare le assenze quando la sezione è aperta
  useEffect(() => {
    if (showAssenzeSection) {
      fetchAbsencesData();
    }
  }, [showAssenzeSection, absencesCurrentPage, selectedFromDate, selectedToDate, selectedAbsenceStatus, selectedNominativo]);

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

  const getAbsenceStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAbsenceStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'waiting':
        return 'In attesa';
      case 'approved':
        return 'Approvata';
      case 'rejected':
        return 'Rifiutata';
      default:
        return status;
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

  const handleAbsencesPageChange = (newPage: number) => {
    setAbsencesCurrentPage(newPage);
  };

  const handleNominativoFilter = (nominativo: string) => {
    setSelectedNominativo(nominativo);
    setAbsencesCurrentPage(1);
  };

  const handleFromDateFilter = (date: string) => {
    setSelectedFromDate(date);
    setAbsencesCurrentPage(1);
  };

  const handleToDateFilter = (date: string) => {
    setSelectedToDate(date);
    setAbsencesCurrentPage(1);
  };

  const handleAbsenceStatusFilter = (status: string) => {
    setSelectedAbsenceStatus(status);
    setAbsencesCurrentPage(1);
  };

  const getWaitingCount = () => {
    return absencesData.filter(absence => absence.status.toLowerCase() === 'waiting').length;
  };

  // Funzione per formattare il nominativo
  const formatNominativo = (member: TeamMember) => {
    if (member.name && member.surname) {
      return `${member.name} ${member.surname}`;
    }
    return member.name || 'N/A';
  };

  // Funzione per formattare il nominativo delle assenze
  const formatAbsenceNominativo = (absence: Absence) => {
    if (absence.name && absence.surname) {
      return `${absence.name} ${absence.surname}`;
    }
    return absence.name || 'N/A';
  };

  // Funzione per formattare lo status
  const formatStatus = (member: TeamMember) => {
    if (member.disabled) {
      return 'Inattivo';
    }
    return member.status === 'active' ? 'Attivo' : member.status;
  };

  // Funzione per formattare le date
  const formatDateRange = (fromDate: string, toDate: string) => {
    const from = new Date(fromDate).toLocaleDateString('it-IT');
    const to = new Date(toDate).toLocaleDateString('it-IT');
    
    if (from === to) {
      return from;
    }
    return `${from} - ${to}`;
  };

  // Ottieni lista unica di nominativi per il filtro
  const getUniqueNominativi = () => {
    const nominativi = absencesData.map(absence => formatAbsenceNominativo(absence));
    return [...new Set(nominativi)].filter(Boolean);
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

      {/* Assenze tecnici section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowAssenzeSection(!showAssenzeSection)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-medium text-gray-900">Assenze tecnici</h2>
          <ChevronDown 
            className={`transform transition-transform ${showAssenzeSection ? 'rotate-180' : ''}`} 
            size={20} 
          />
        </button>
        
        {showAssenzeSection && (
          <div className="border-t border-gray-200">
            {/* Filters and actions for assenze */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <select
                      value={selectedNominativo}
                      onChange={(e) => handleNominativoFilter(e.target.value)}
                      className="flex items-center gap-2 px-4 py-2 border text-gray-800 border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8"
                    >
                      <option value="">Filtra per nome</option>
                      {getUniqueNominativi().map((nominativo) => (
                        <option key={nominativo} value={nominativo}>
                          {nominativo}
                        </option>
                      ))}
                    </select>
                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                  
                  <div className="relative">
                    <input
                      type="date"
                      value={selectedFromDate}
                      onChange={(e) => handleFromDateFilter(e.target.value)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white"
                      placeholder="Data inizio"
                    />
                  </div>
                  
                  <div className="relative">
                    <input
                      type="date"
                      value={selectedToDate}
                      onChange={(e) => handleToDateFilter(e.target.value)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white"
                      placeholder="Data fine"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleAbsenceStatusFilter('')}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      selectedAbsenceStatus === '' 
                        ? 'bg-teal-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Tutte le assenze
                  </button>
                  <button 
                    onClick={() => handleAbsenceStatusFilter('waiting')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedAbsenceStatus === 'waiting'
                        ? 'bg-yellow-200 text-yellow-900'
                        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    }`}
                  >
                    In attesa ({getWaitingCount()})
                  </button>
                  <button 
                    onClick={() => handleAbsenceStatusFilter('approved')}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      selectedAbsenceStatus === 'approved'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    Approvate
                  </button>
                  <button 
                    onClick={() => handleAbsenceStatusFilter('rejected')}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      selectedAbsenceStatus === 'rejected'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    Rifiutate
                  </button>
                </div>
              </div>
            </div>

            {/* Loading state for absences */}
            {absencesLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-500">Caricamento assenze...</div>
              </div>
            )}

            {/* Error state for absences */}
            {absencesError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-6">
                <div className="text-red-800">Errore: {absencesError}</div>
                <button 
                  onClick={fetchAbsencesData}
                  className="mt-2 text-red-600 hover:text-red-800 underline"
                >
                  Riprova
                </button>
              </div>
            )}

            {/* Assenze table */}
            {!absencesLoading && !absencesError && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nominativo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Note
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {absencesData.map((absence) => (
                      <tr key={absence.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatAbsenceNominativo(absence)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDateRange(absence.from_date, absence.to_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getAbsenceStatusColor(
                              absence.status
                            )}`}
                          >
                            {formatAbsenceStatus(absence.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {absence.note || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination for assenze */}
            {!absencesLoading && !absencesError && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Pagina {absencesMeta.page} di {absencesMeta.totalPages} (Totale: {absencesMeta.total} assenze)
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleAbsencesPageChange(absencesMeta.page - 1)}
                    disabled={absencesMeta.page <= 1}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Indietro
                  </button>
                  <button 
                    onClick={() => handleAbsencesPageChange(absencesMeta.page + 1)}
                    disabled={absencesMeta.page >= absencesMeta.totalPages}
                    className="px-3 py-1 text-sm text-teal-600 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Avanti
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
