'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Edit, Mail, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AbsencesTable from './AbsencesTable';
import UserForm from './UserForm';

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

interface Role {
  id: number;
  label: string;
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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
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

  // Stati per la gestione delle viste
  const [currentView, setCurrentView] = useState<'list' | 'edit'>('list');
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);

  // Stati per i dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<TeamMember | null>(null);
  const [userForPasswordReset, setUserForPasswordReset] = useState<TeamMember | null>(null);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // Stati per i ruoli
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  const auth = useAuth();
  const [userInfo, setUserInfo] = useState<{ id: string; role: string } | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  // Debouncing per la ricerca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Carica i ruoli all'avvio del componente
  useEffect(() => {
    if (userLoading || !userInfo) return;
    if (userInfo.role?.toLowerCase() === 'tecnico' || userInfo.role?.toLowerCase() === 'ufficio_tecnico') return;
    const fetchRoles = async () => {
      try {
        setRolesLoading(true);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        }
        const response = await fetch('/api/roles', {
          headers,
        });
        if (!response.ok) {
          throw new Error('Failed to fetch roles');
        }
        const rolesData: Role[] = await response.json();
        setRoles(rolesData);
        console.log('✅ Ruoli caricati:', rolesData);
      } catch (error) {
        console.error('Errore durante il caricamento dei ruoli:', error);
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, [auth.token, userInfo, userLoading]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setUserLoading(true);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
        const response = await fetch('/api/auth/me', {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        });
        if (!response.ok) throw new Error('Failed to fetch user info');
        const data = await response.json();
        setUserInfo(data);
      } catch  {
        setUserInfo(null);
      } finally {
        setUserLoading(false);
      }
    };
    if (auth.token) fetchUserInfo();
  }, [auth.token]);

  // Funzione per recuperare i dati dall'API
  const fetchTeamData = async () => {
    if (userInfo?.role?.toLowerCase() === 'tecnico') return;
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        skip: pageSize.toString(),
      });
      
      if (debouncedSearchTerm.trim()) {
        params.append('query', debouncedSearchTerm.trim());
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
    if (userInfo?.role?.toLowerCase() === 'tecnico') return;
    if (currentView === 'list') {
      fetchTeamData();
    }
  }, [currentPage, debouncedSearchTerm, selectedRole, currentView, userInfo]);

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


  const handleEditUser = (user: TeamMember) => {
    setSelectedUser(user);
    setCurrentView('edit');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedUser(null);
    // Ricarica i dati quando torniamo alla lista
    fetchTeamData();
  };

  const handleUserSaved = (user: TeamMember) => {
    console.log('Utente salvato:', user);
    // Torna alla lista e ricarica i dati
    handleBackToList();
  };

  const handleDeleteUser = (user: TeamMember) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const token = auth.token;
      if (!token) {
        console.error('Token non trovato, effettuando logout');
        auth.logout();
        return;
      }

      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Sessione scaduta, effettuando logout');
          auth.logout();
          return;
        }
        throw new Error('Errore durante l\'eliminazione');
      }

      console.log('✅ Utente eliminato con successo');
      
      // Rimuovi l'utente dalla lista locale
      setTeamData(prevData => prevData.filter(user => user.id !== userToDelete.id));
      
      setShowDeleteDialog(false);
      setUserToDelete(null);
      
    } catch (error) {
      console.error('Errore durante l\'eliminazione:', error);
    }
  };

  const handleResetPassword = (user: TeamMember) => {
    setUserForPasswordReset(user);
    setShowResetPasswordDialog(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!userForPasswordReset?.email) return;

    try {
      setResetPasswordLoading(true);

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userForPasswordReset.email }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Errore API:', errorData);
        throw new Error(errorData.message || 'Errore durante l\'invio della mail');
      }

      console.log('✅ Email di reset password inviata con successo');
      setShowResetPasswordDialog(false);
      setUserForPasswordReset(null);
      
    } catch (error) {
      console.error('Errore durante l\'invio della mail:', error);
    } finally {
      setResetPasswordLoading(false);
    }
  };

  if (userLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;
  }

  if (userInfo?.role?.toLowerCase() === 'tecnico' || userInfo?.role?.toLowerCase() === 'ufficio_tecnico') {
    return (
      <div className="p-6 bg-white min-h-screen">
        <AbsencesTable userId={userInfo.id} viewOnly={true} />
      </div>
    );
  }



  if (currentView === 'edit' && selectedUser) {
    return (
      <UserForm
        user={selectedUser}
        isCreating={false}
        onBack={handleBackToList}
        onSave={handleUserSaved}
        onDelete={(userId) => {
          console.log('Utente eliminato:', userId);
          handleBackToList();
        }}
      />
    );
  }

  // Renderizza la vista lista (default)
  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      {auth.user?.role !== 'tecnico' && auth.user?.role !== 'ufficio_tecnico' && (
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Team</h1>

        </div>
      )}

      {/* Search and filters */}
      {auth.user?.role !== 'tecnico' && auth.user?.role !== 'ufficio_tecnico' && (
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cerca nome, cognome"
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
                disabled={rolesLoading}
              >
                <option value="">
                  {rolesLoading ? 'Caricamento...' : 'Filtra per ruolo'}
                </option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id.toString()}>
                    {role.label}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>
      )}

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teamData.map((member) => (
                  <tr 
                    key={member.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleEditUser(member)}
                  >
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div 
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleEditUser(member)}
                          className="text-teal-600 hover:text-teal-900 transition-colors"
                          title="Modifica utente"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleResetPassword(member)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Invia reset password"
                        >
                          <Mail size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(member)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Elimina utente"
                        >
                          <Trash2 size={16} />
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

      {/* Dialog di conferma eliminazione */}
      {showDeleteDialog && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="text-red-600" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Elimina utente</h3>
                <p className="text-sm text-gray-500">Questa azione non può essere annullata.</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Sei sicuro di voler eliminare l&apos;utente <strong>{formatNominativo(userToDelete)}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setUserToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog di conferma reset password */}
      {showResetPasswordDialog && userForPasswordReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="text-blue-600" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Reset password</h3>
                <p className="text-sm text-gray-500">Invia email di reset password</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Vuoi inviare un&apos;email di reset password a <strong>{userForPasswordReset.email}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResetPasswordDialog(false);
                  setUserForPasswordReset(null);
                }}
                disabled={resetPasswordLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmResetPassword}
                disabled={resetPasswordLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetPasswordLoading ? 'Invio...' : 'Invia email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}