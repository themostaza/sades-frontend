'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Search } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';

interface User {
  id: string;
  name: string;
  surname: string | null;
  fiscal_code: string | null;
  email: string;
  phone_number: string | null;
  note: string | null;
  disabled: boolean;
  status: string;
  role: string | null;
}

interface CallDetailsSectionDetailProps {
  nomeOperatore: string;
  setNomeOperatore: (value: string) => void;
  ruoloOperatore: string;
  setRuoloOperatore: (value: string) => void;
  selectedTechnician: User | null;
  setSelectedTechnician: (technician: User | null) => void;
  codiceChiamata: string;
  setCodiceChiamata: (value: string) => void;
  dataCreazione?: string;
  statusId?: number;
  isCreating?: boolean;
}

export default function CallDetailsSectionDetail({
  nomeOperatore,
  setNomeOperatore,
  ruoloOperatore,
  setRuoloOperatore,
  selectedTechnician,
  setSelectedTechnician,
  codiceChiamata,
  dataCreazione,
  statusId = 1,
  isCreating = false,
}: CallDetailsSectionDetailProps) {
  const auth = useAuth();

  const isFieldsDisabled = !isCreating && statusId > 4;

  const [technicianSearchQuery, setTechnicianSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [showTechnicianDropdown, setShowTechnicianDropdown] = useState(false);
  const [isSearchingTechnicians, setIsSearchingTechnicians] = useState(false);

  const searchTechnicians = async (query: string) => {
    try {
      setIsSearchingTechnicians(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      let url = `/api/users?skip=10&role_id=2`;
      if (query.trim() && query.length >= 2) {
        url += `&query=${encodeURIComponent(query)}`;
      }
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
        setShowTechnicianDropdown(true);
      } else {
        setUsers([]);
        setShowTechnicianDropdown(false);
      }
    } catch {
      setUsers([]);
      setShowTechnicianDropdown(false);
    } finally {
      setIsSearchingTechnicians(false);
    }
  };

  const loadAllTechnicians = async () => {
    if (users.length > 0) {
      setShowTechnicianDropdown(true);
      return;
    }
    await searchTechnicians('');
  };

  const handleTechnicianSelect = (user: User) => {
    setSelectedTechnician(user);
    const fullName = user.surname ? `${user.name} ${user.surname}` : user.name;
    setTechnicianSearchQuery(fullName);
    setShowTechnicianDropdown(false);
  };

  const handleTechnicianSearchChange = (value: string) => {
    setTechnicianSearchQuery(value);
    if (!value.trim()) {
      setSelectedTechnician(null);
    }
  };
  
  const fetchCurrentUser = async () => {
    if (!isCreating) return;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      const response = await fetch('/api/auth/me', { method: 'POST', headers, body: JSON.stringify({}) });
      if (response.ok) {
        const userData = await response.json();
        const fullName = userData.surname ? `${userData.name} ${userData.surname}` : userData.name || '';
        setNomeOperatore(fullName);
        setRuoloOperatore(userData.role || '');
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };
  
  useEffect(() => {
    fetchCurrentUser();
  }, [isCreating, auth.token]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.technician-search-container')) {
        setShowTechnicianDropdown(false);
      }
    };
    if (showTechnicianDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTechnicianDropdown]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (technicianSearchQuery.trim() && technicianSearchQuery.length >= 2) {
        searchTechnicians(technicianSearchQuery);
      } else if (technicianSearchQuery.trim() === '' && showTechnicianDropdown) {
        searchTechnicians('');
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [technicianSearchQuery, showTechnicianDropdown]);

  useEffect(() => {
    if (selectedTechnician && !technicianSearchQuery) {
      const fullName = selectedTechnician.surname ? `${selectedTechnician.name} ${selectedTechnician.surname}` : selectedTechnician.name;
      setTechnicianSearchQuery(fullName);
    }
  }, [selectedTechnician]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Dettagli chiamata</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tecnico di riferimento</label>
          <div className="relative technician-search-container">
            <input
              type="text"
              value={technicianSearchQuery}
              onChange={(e) => handleTechnicianSearchChange(e.target.value)}
              onFocus={() => { if (!isFieldsDisabled) loadAllTechnicians(); }}
              placeholder={isFieldsDisabled ? "Non modificabile" : "Cerca tecnico..."}
              disabled={isFieldsDisabled}
              className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg ${isFieldsDisabled ? 'bg-gray-50' : ''}`}
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            {isSearchingTechnicians && <div className="absolute right-10 top-1/2 transform -translate-y-1/2 w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>}
            {!isFieldsDisabled && showTechnicianDropdown && users.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {users.map((user) => (
                  <div key={user.id} onClick={() => handleTechnicianSelect(user)} className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                    <div className="font-medium text-gray-900">{user.name} {user.surname}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome operatore</label>
            <input type="text" value={nomeOperatore} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ruolo operatore</label>
            <input type="text" value={ruoloOperatore} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"/>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data creazione richiesta</label>
            <div className="relative">
              <input type="text" value={isCreating ? new Date().toLocaleDateString('it-IT') : dataCreazione} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"/>
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Codice chiamata</label>
            <input type="text" value={codiceChiamata} readOnly placeholder="Generato automaticamente" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"/>
          </div>
        </div>
      </div>
    </div>
  );
}
