'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Mail, Save } from 'lucide-react';
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

interface Role {
  id: number;
  label: string;
}

interface UserFormProps {
  user?: TeamMember | null;
  isCreating?: boolean;
  onBack: () => void;
  onSave: (user: TeamMember) => void;
  onDelete?: (userId: string) => void;
}

export default function UserForm({ user, isCreating = false, onBack, onSave, onDelete }: UserFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    fiscal_code: '',
    email: '',
    phone_number: '',
    note: '',
    role_id: '',
    disabled: false
  });

  // Stato per tracciare i dati originali
  const [originalData, setOriginalData] = useState({
    name: '',
    surname: '',
    fiscal_code: '',
    email: '',
    phone_number: '',
    note: '',
    role_id: '',
    disabled: false
  });

  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // Stati per i ruoli
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  const auth = useAuth();

  // Carica i ruoli all'avvio del componente
  useEffect(() => {
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
  }, [auth.token]);

  // Popola il form se stiamo modificando un utente esistente
  useEffect(() => {
    if (user && !isCreating) {
      const userData = {
        name: user.name || '',
        surname: user.surname || '',
        fiscal_code: user.fiscal_code || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        note: user.note || '',
        role_id: getRoleId(user.role),
        disabled: user.disabled || false
      };
      
      setFormData(userData);
      setOriginalData(userData); // Salva i dati originali per il confronto
    }
  }, [user, isCreating]);

  // Mappa i ruoli ai loro ID (basato sui dati dall'API)
  const getRoleId = (roleName: string | null | undefined): string => {
    if (!roleName || roles.length === 0) return '';
    
    const role = roles.find(r => r.label.toLowerCase() === roleName.toLowerCase());
    return role ? role.id.toString() : '';
  };

  const getRoleName = (roleId: string): string => {
    if (!roleId || roles.length === 0) return '';
    
    const role = roles.find(r => r.id.toString() === roleId);
    return role ? role.label : '';
  };

  // Verifica se ci sono modifiche rispetto ai dati originali
  const hasChanges = () => {
    if (isCreating) return true; // In modalità creazione, sempre abilitato se valido
    
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  };

  // Validazione form
  const isFormValid = () => {
    return formData.name.trim() && 
           formData.surname.trim() && 
           formData.fiscal_code.trim() && 
           formData.email.trim() && 
           formData.role_id;
  };

  // Verifica se il pulsante salva deve essere abilitato
  const isSaveEnabled = () => {
    return isFormValid() && hasChanges() && !loading;
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!isSaveEnabled()) return;

    try {
      setLoading(true);

      const token = auth.token;
      if (!token) {
        console.error('Token non trovato, effettuando logout');
        auth.logout();
        return;
      }

      const requestBody = {
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        email: formData.email.trim(),
        role_id: parseInt(formData.role_id),
        phone_number: formData.phone_number.trim() || "string",
        fiscal_code: formData.fiscal_code.trim(),
        disabled: formData.disabled,
        note: formData.note.trim() || "string"
      };

      console.log('🔄 Saving user:', requestBody);

      // Determina URL e metodo in base alla modalità
      const url = isCreating ? '/api/users' : `/api/users/${user?.id}`;
      const method = isCreating ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Sessione scaduta, effettuando logout');
          auth.logout();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('Errore API:', errorData);
        throw new Error(errorData.message || 'Errore durante il salvataggio');
      }

      const data = await response.json();
      console.log('✅ Utente salvato con successo:', data);

      // Crea un oggetto TeamMember dal response
      const savedUser: TeamMember = {
        id: data.id || data.user_id || user?.id || '',
        name: data.name || formData.name,
        surname: data.surname || formData.surname,
        fiscal_code: data.fiscal_code || formData.fiscal_code,
        email: data.email || formData.email,
        phone_number: data.phone_number || formData.phone_number,
        note: data.note || formData.note,
        disabled: data.disabled || formData.disabled,
        status: data.status || 'active',
        role: getRoleName(formData.role_id)
      };

      onSave(savedUser);
      
    } catch (error) {
      console.error('Errore durante il salvataggio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user?.id || !onDelete) return;

    try {
      setLoading(true);

      const token = auth.token;
      if (!token) {
        console.error('Token non trovato, effettuando logout');
        auth.logout();
        return;
      }

      console.log('🔄 Deleting user:', user.id);

      const response = await fetch(`/api/users/${user.id}`, {
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
        const errorData = await response.json().catch(() => ({}));
        console.error('Errore API:', errorData);
        throw new Error(errorData.message || 'Errore durante l\'eliminazione');
      }

      console.log('✅ Utente eliminato con successo');
      onDelete(user.id);
      
    } catch (error) {
      console.error('Errore durante l\'eliminazione:', error);
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;

    try {
      setResetPasswordLoading(true);

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Errore API:', errorData);
        throw new Error(errorData.message || 'Errore durante l\'invio della mail');
      }

      console.log('✅ Email di reset password inviata con successo');
      setShowResetPasswordDialog(false);
      
    } catch (error) {
      console.error('Errore durante l\'invio della mail:', error);
    } finally {
      setResetPasswordLoading(false);
    }
  };

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
          <h1 className="text-2xl font-semibold text-gray-900">
            {isCreating ? 'Nuovo utente' : 'Utente'}
          </h1>
        </div>
        
        {!isCreating && user?.email && (
          <button
            onClick={() => setShowResetPasswordDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Mail size={16} />
            Invia reset password
          </button>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Dettagli</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Nome e Cognome */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nominativo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nome"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cognome *
              </label>
              <input
                type="text"
                value={formData.surname}
                onChange={(e) => handleInputChange('surname', e.target.value)}
                placeholder="Cognome"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                disabled={loading}
              />
            </div>
          </div>

          {/* Codice Fiscale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Codice fiscale *
            </label>
            <input
              type="text"
              value={formData.fiscal_code}
              onChange={(e) => handleInputChange('fiscal_code', e.target.value.toUpperCase())}
              placeholder="Codice fiscale"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
              disabled={loading}
              maxLength={16}
            />
          </div>

          {/* Email e Telefono */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefono
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                placeholder="Telefono"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                disabled={loading}
              />
            </div>
          </div>

          {/* Ruolo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ruolo *
            </label>
            <select
              value={formData.role_id}
              onChange={(e) => handleInputChange('role_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
              disabled={loading || rolesLoading}
            >
              <option value="">
                {rolesLoading ? 'Caricamento ruoli...' : 'Seleziona un ruolo'}
              </option>
              {roles.map((role) => (
                <option key={role.id} value={role.id.toString()}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Checkbox Disattiva utente */}
          {!isCreating && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="disabled"
                checked={formData.disabled}
                onChange={(e) => handleInputChange('disabled', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label htmlFor="disabled" className="ml-2 block text-sm text-gray-900">
                Disattiva utente
              </label>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
              placeholder="Note aggiuntive..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 resize-none"
              disabled={loading}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div>
            {!isCreating && onDelete && (
              <button
                onClick={() => setShowDeleteDialog(true)}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                Elimina utente
              </button>
            )}
          </div>
          
          <button
            onClick={handleSave}
            disabled={loading || !isSaveEnabled()}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isSaveEnabled() 
                ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                : 'bg-gray-300 text-gray-500'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {isCreating ? 'Creazione...' : 'Salvataggio...'}
              </>
            ) : (
              <>
                <Save size={16} />
                {isCreating ? 'Crea utente' : hasChanges() ? 'Salva modifiche' : 'Nessuna modifica'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dialog di conferma eliminazione */}
      {showDeleteDialog && (
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
              Sei sicuro di voler eliminare l&apos;utente <strong>{user?.name} {user?.surname}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog di conferma reset password */}
      {showResetPasswordDialog && (
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
              Vuoi inviare un&apos;email di reset password a <strong>{user?.email}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetPasswordDialog(false)}
                disabled={resetPasswordLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annulla
              </button>
              <button
                onClick={handleResetPassword}
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