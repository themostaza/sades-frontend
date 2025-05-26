'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, User, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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

export default function AbsencesTable() {
  // Stati per la sezione assenze
  const [showAssenzeSection, setShowAssenzeSection] = useState(true);
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

  // Stati per il dialog di approvazione/rifiuto
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Stati per il dialog di creazione nuova assenza
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newAbsence, setNewAbsence] = useState({
    user_id: '',
    from_date: '',
    to_date: '',
    note: ''
  });

  // Stati per la lista completa dei tecnici (per la select)
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMember[]>([]);
  const [loadingAllMembers, setLoadingAllMembers] = useState(false);

  const auth = useAuth();

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
        params.append('user_id', selectedNominativo);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/absences?${params.toString()}`, {
        headers,
      });
      
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

  // Funzione per recuperare tutti i membri del team (per la select)
  const fetchAllTeamMembers = async () => {
    try {
      setLoadingAllMembers(true);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/users?page=1&skip=1000`, {
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch all team members');
      }
      
      const data: ApiResponse = await response.json();
      setAllTeamMembers(data.data);
    } catch (err) {
      console.error('Error fetching all team members:', err);
    } finally {
      setLoadingAllMembers(false);
    }
  };

  // Effetto per caricare le assenze quando la sezione è aperta
  useEffect(() => {
    if (showAssenzeSection) {
      fetchAbsencesData();
    }
  }, [showAssenzeSection, absencesCurrentPage, selectedFromDate, selectedToDate, selectedAbsenceStatus, selectedNominativo]);

  // Utility functions
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

  const formatAbsenceNominativo = (absence: Absence) => {
    if (absence.name && absence.surname) {
      return `${absence.name} ${absence.surname}`;
    }
    return absence.name || 'N/A';
  };

  const formatNominativo = (member: TeamMember) => {
    if (member.name && member.surname) {
      return `${member.name} ${member.surname}`;
    }
    return member.name || 'N/A';
  };

  const formatDateRange = (fromDate: string, toDate: string) => {
    const from = new Date(fromDate).toLocaleDateString('it-IT');
    const to = new Date(toDate).toLocaleDateString('it-IT');
    
    if (from === to) {
      return from;
    }
    return `${from} - ${to}`;
  };

  const getUniqueNominativi = () => {
    const nominativi = absencesData.map(absence => formatAbsenceNominativo(absence));
    return [...new Set(nominativi)].filter(Boolean);
  };

  const getWaitingCount = () => {
    return absencesData.filter(absence => absence.status.toLowerCase() === 'waiting').length;
  };

  // Event handlers
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

  const handleAbsenceRowClick = (absence: Absence) => {
    if (absence.status.toLowerCase() === 'waiting') {
      setSelectedAbsence(absence);
      setShowApprovalDialog(true);
    }
  };

  const handleApproveAbsence = async () => {
    if (!selectedAbsence) return;

    try {
      setActionLoading(true);
      
      const token = auth.token;
      if (!token) {
        console.error('Token non trovato, effettuando logout');
        auth.logout();
        return;
      }

      console.log('🔑 Using token:', token);
      console.log('📤 Request data:', {
        user_uid: selectedAbsence.user_uid,
        absence_id: selectedAbsence.id,
        body: {
          from_date: selectedAbsence.from_date.split('T')[0],
          to_date: selectedAbsence.to_date.split('T')[0],
          note: selectedAbsence.note || "string",
          status: "approved"
        }
      });

      const response = await fetch(`/api/users/${selectedAbsence.user_uid}/absences/${selectedAbsence.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          from_date: selectedAbsence.from_date.split('T')[0],
          to_date: selectedAbsence.to_date.split('T')[0],
          note: selectedAbsence.note || "string",
          status: "approved"
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Sessione scaduta, effettuando logout');
          auth.logout();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('Errore API:', errorData);
        throw new Error(errorData.message || 'Errore durante l\'approvazione');
      }

      // Aggiorna solo la riga specifica invece di ricaricare tutta la tabella
      setAbsencesData(prevData => 
        prevData.map(absence => 
          absence.id === selectedAbsence.id 
            ? { ...absence, status: 'approved' }
            : absence
        )
      );
      
      setShowApprovalDialog(false);
      setSelectedAbsence(null);
      
      console.log('✅ Assenza approvata con successo');
      
    } catch (error) {
      console.error('Errore durante l\'approvazione:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectAbsence = async () => {
    if (!selectedAbsence) return;

    try {
      setActionLoading(true);
      
      const token = auth.token;
      if (!token) {
        console.error('Token non trovato, effettuando logout');
        auth.logout();
        return;
      }

      console.log('🔑 Using token:', token);
      console.log('📤 Request data:', {
        user_uid: selectedAbsence.user_uid,
        absence_id: selectedAbsence.id,
        body: {
          from_date: selectedAbsence.from_date.split('T')[0],
          to_date: selectedAbsence.to_date.split('T')[0],
          note: selectedAbsence.note || "string",
          status: "rejected"
        }
      });

      const response = await fetch(`/api/users/${selectedAbsence.user_uid}/absences/${selectedAbsence.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          from_date: selectedAbsence.from_date.split('T')[0],
          to_date: selectedAbsence.to_date.split('T')[0],
          note: selectedAbsence.note || "string",
          status: "rejected"
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Sessione scaduta, effettuando logout');
          auth.logout();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('Errore API:', errorData);
        throw new Error(errorData.message || 'Errore durante il rifiuto');
      }

      // Aggiorna solo la riga specifica invece di ricaricare tutta la tabella
      setAbsencesData(prevData => 
        prevData.map(absence => 
          absence.id === selectedAbsence.id 
            ? { ...absence, status: 'rejected' }
            : absence
        )
      );
      
      setShowApprovalDialog(false);
      setSelectedAbsence(null);
      
      console.log('✅ Assenza rifiutata con successo');
      
    } catch (error) {
      console.error('Errore durante il rifiuto:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setNewAbsence({
      user_id: '',
      from_date: '',
      to_date: '',
      note: ''
    });
    setShowCreateDialog(true);
    fetchAllTeamMembers();
  };

  const handleCloseCreateDialog = () => {
    setShowCreateDialog(false);
    setNewAbsence({
      user_id: '',
      from_date: '',
      to_date: '',
      note: ''
    });
  };

  const handleCreateAbsence = async () => {
    if (!newAbsence.user_id || !newAbsence.from_date || !newAbsence.to_date) {
      console.error('Campi obbligatori mancanti');
      return;
    }

    try {
      setCreateLoading(true);
      
      const token = auth.token;
      if (!token) {
        console.error('Token non trovato, effettuando logout');
        auth.logout();
        return;
      }

      console.log('🔄 Creating new absence:', newAbsence);

      const response = await fetch(`/api/users/${newAbsence.user_id}/absences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          from_date: newAbsence.from_date,
          to_date: newAbsence.to_date,
          note: newAbsence.note || 'Assenza creata dall\'amministrazione'
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Sessione scaduta, effettuando logout');
          auth.logout();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('Errore API:', errorData);
        throw new Error(errorData.message || 'Errore durante la creazione');
      }

      // Ricarica i dati delle assenze
      await fetchAbsencesData();
      
      handleCloseCreateDialog();
      
      console.log('✅ Assenza creata con successo');
      
    } catch (error) {
      console.error('Errore durante la creazione:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
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
                
                {/* Pulsante per creare nuova assenza */}
                <button
                  onClick={handleOpenCreateDialog}
                  className="ml-4 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} />
                  Nuova assenza
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
                    <tr 
                      key={absence.id} 
                      className={`hover:bg-gray-50 ${
                        absence.status.toLowerCase() === 'waiting' 
                          ? 'cursor-pointer hover:bg-yellow-50' 
                          : ''
                      }`}
                      onClick={() => handleAbsenceRowClick(absence)}
                    >
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

      {/* Dialog per approvazione/rifiuto assenza */}
      {showApprovalDialog && selectedAbsence && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-orange-500" size={20} />
                <h3 className="text-lg font-medium text-gray-900">Richiesta di assenza</h3>
              </div>
              <button
                onClick={() => {
                  setShowApprovalDialog(false);
                  setSelectedAbsence(null);
                }}
                className="text-gray-400 hover:text-gray-600"
                disabled={actionLoading}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tecnico
                </label>
                <input
                  type="text"
                  value={formatAbsenceNominativo(selectedAbsence)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <input
                  type="text"
                  value={selectedAbsence.note || 'Corso di formazione'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formatDateRange(selectedAbsence.from_date, selectedAbsence.to_date)}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRejectAbsence}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Elaborazione...' : 'Rifiuta'}
              </button>
              <button
                onClick={handleApproveAbsence}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Elaborazione...' : 'Approva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog per creazione nuova assenza */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Plus className="text-teal-600" size={20} />
                <h3 className="text-lg font-medium text-gray-900">Nuova assenza</h3>
              </div>
              <button
                onClick={handleCloseCreateDialog}
                className="text-gray-400 hover:text-gray-600"
                disabled={createLoading}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tecnico *
                </label>
                <select
                  value={newAbsence.user_id}
                  onChange={(e) => setNewAbsence(prev => ({ ...prev, user_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                  disabled={createLoading || loadingAllMembers}
                >
                  <option value="">
                    {loadingAllMembers ? 'Caricamento tecnici...' : 'Seleziona un tecnico'}
                  </option>
                  {allTeamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {formatNominativo(member)} {member.disabled ? '(Inattivo)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data inizio *
                </label>
                <input
                  type="date"
                  value={newAbsence.from_date}
                  onChange={(e) => setNewAbsence(prev => ({ ...prev, from_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                  disabled={createLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data fine *
                </label>
                <input
                  type="date"
                  value={newAbsence.to_date}
                  min={newAbsence.from_date || undefined}
                  onChange={(e) => setNewAbsence(prev => ({ ...prev, to_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                  disabled={createLoading}
                />
                {newAbsence.from_date && newAbsence.to_date && newAbsence.to_date < newAbsence.from_date && (
                  <p className="mt-1 text-sm text-red-600">
                    La data di fine non può essere antecedente alla data di inizio
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={newAbsence.note}
                  onChange={(e) => setNewAbsence(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Inserisci una nota per l'assenza..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 resize-none"
                  disabled={createLoading}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCloseCreateDialog}
                disabled={createLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateAbsence}
                disabled={
                  createLoading || 
                  !newAbsence.user_id || 
                  !newAbsence.from_date || 
                  !newAbsence.to_date ||
                  newAbsence.to_date < newAbsence.from_date
                }
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createLoading ? 'Creazione...' : 'Crea assenza'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 