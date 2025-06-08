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
  dataCreazione: string;
  statusId: number;
}

export default function CallDetailsSectionDetail({
  nomeOperatore,
  ruoloOperatore,
  selectedTechnician,
  setSelectedTechnician,
  codiceChiamata,
  dataCreazione,
  statusId,
}: CallDetailsSectionDetailProps) {
  const auth = useAuth();

  // Determina se i campi devono essere disabilitati
  // I campi sono modificabili solo fino al massimo allo status "in_carico" (ID 4)
  const isFieldsDisabled = statusId > 4;

  // Stati per la ricerca tecnici
  const [technicianSearchQuery, setTechnicianSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [showTechnicianDropdown, setShowTechnicianDropdown] = useState(false);
  const [isSearchingTechnicians, setIsSearchingTechnicians] = useState(false);

  // Funzione per cercare i tecnici
  const searchTechnicians = async (query: string) => {
    try {
      setIsSearchingTechnicians(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      // Costruisco l'URL con i parametri - uso role_id=2 per i tecnici
      let url = `/api/users?skip=10&role_id=2`;
      if (query.trim() && query.length >= 2) {
        url += `&query=${encodeURIComponent(query)}`;
      }

      console.log('🔍 Searching technicians with URL:', url);

      const response = await fetch(url, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Technicians loaded:', data.data?.length || 0);
        setUsers(data.data || []);
        setShowTechnicianDropdown(true);
      } else {
        const errorText = await response.text();
        console.error('❌ Errore nella ricerca tecnici:', response.status, errorText);
        setUsers([]);
        setShowTechnicianDropdown(false);
      }
    } catch (error) {
      console.error('💥 Errore nella ricerca tecnici:', error);
      setUsers([]);
      setShowTechnicianDropdown(false);
    } finally {
      setIsSearchingTechnicians(false);
    }
  };

  // Funzione per caricare tutti i tecnici (quando si clicca nel campo)
  const loadAllTechnicians = async () => {
    if (users.length > 0) {
      setShowTechnicianDropdown(true);
      return;
    }
    await searchTechnicians('');
  };

  // Gestisce la selezione di un tecnico
  const handleTechnicianSelect = (user: User) => {
    setSelectedTechnician(user);
    const fullName = user.surname ? `${user.name} ${user.surname}` : user.name;
    setTechnicianSearchQuery(fullName);
    setShowTechnicianDropdown(false);
  };

  // Gestisce il cambio del testo di ricerca tecnico
  const handleTechnicianSearchChange = (value: string) => {
    setTechnicianSearchQuery(value);
    
    if (!value.trim()) {
      setSelectedTechnician(null);
    }
  };

  // Gestisce il click fuori dal dropdown per chiuderlo
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

  // Debounce per la ricerca tecnici
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (technicianSearchQuery.trim() && technicianSearchQuery.length >= 2) {
        searchTechnicians(technicianSearchQuery);
      } else if (technicianSearchQuery.trim() === '' && showTechnicianDropdown) {
        // Se il campo è vuoto ma il dropdown è aperto, mostra tutti i tecnici
        searchTechnicians('');
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [technicianSearchQuery]);

  // Se il selectedTechnician è già presente (caricamento da API), popola la query
  useEffect(() => {
    if (selectedTechnician && !technicianSearchQuery) {
      const fullName = selectedTechnician.surname 
        ? `${selectedTechnician.name} ${selectedTechnician.surname}` 
        : selectedTechnician.name;
      setTechnicianSearchQuery(fullName);
    }
  }, [selectedTechnician, technicianSearchQuery]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Dettagli chiamata</h2>
      
      <div className="space-y-4">
        {/* Tecnico di riferimento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tecnico di riferimento
          </label>
          <div className="relative technician-search-container">
            <div className="relative">
              <input
                type="text"
                value={technicianSearchQuery}
                onChange={(e) => handleTechnicianSearchChange(e.target.value)}
                onFocus={() => {
                  if (!isFieldsDisabled) {
                    loadAllTechnicians();
                  }
                }}
                placeholder={isFieldsDisabled ? "Campo non modificabile per questo status" : "Cerca tecnico..."}
                disabled={isFieldsDisabled}
                className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg ${
                  isFieldsDisabled 
                    ? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
                    : 'focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900'
                }`}
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              {isSearchingTechnicians && (
                <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            
            {/* Dropdown con risultati */}
            {!isFieldsDisabled && showTechnicianDropdown && users.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleTechnicianSelect(user)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{user.name} {user.surname}</div>
                    <div className="text-sm text-gray-500">
                      {user.email}
                    </div>
                    <div className="text-xs text-gray-400">
                      Tel: {user.phone_number || 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nome e Ruolo operatore */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome operatore
            </label>
            <input
              type="text"
              value={nomeOperatore}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ruolo operatore
            </label>
            <input
              type="text"
              value={ruoloOperatore}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Data creazione e Codice chiamata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data creazione richiesta
            </label>
            <div className="relative">
              <input
                type="text"
                value={dataCreazione}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Codice chiamata
            </label>
            <input
              type="text"
              value={codiceChiamata}
              readOnly
              placeholder="Generato automaticamente al salvataggio"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              💡 Il codice chiamata viene generato automaticamente dal sistema
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 