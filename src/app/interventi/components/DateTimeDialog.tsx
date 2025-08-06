'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone_number: string;
}

interface ApiResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  skip?: number;
}

interface DateTimeDialogProps {
  isOpen: boolean;
  interventionId: string | null;
  onClose: () => void;
  onConfirm: (data: {
    interventionId: string;
    selectedDate?: string;
    selectedOrarioIntervento?: string;
    selectedOraInizio?: string;
    selectedOraFine?: string;
    selectedTechnician?: User;
    showDateSection: boolean;
    showTimeSection: boolean;
    showTechnicianSection: boolean;
  }) => void;
  // Props per pre-popolamento dei campi
  initialData?: {
    showDateSection: boolean;
    showTimeSection: boolean;
    showTechnicianSection: boolean;
    selectedDate?: string;
    selectedOrarioIntervento?: string;
    technicianName?: string;
  };
}

export default function DateTimeDialog({
  isOpen,
  interventionId,
  onClose,
  onConfirm,
  initialData
}: DateTimeDialogProps) {
  // Stati per il dialog di selezione data/orario
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedOrarioIntervento, setSelectedOrarioIntervento] = useState('');
  const [selectedOraInizio, setSelectedOraInizio] = useState('');
  const [selectedOraFine, setSelectedOraFine] = useState('');

  // Stati per controllare la visibilità delle sezioni nel dialog
  const [showDateSection, setShowDateSection] = useState(true);
  const [showTimeSection, setShowTimeSection] = useState(true);
  const [showTechnicianSection, setShowTechnicianSection] = useState(true);

  // Stati per la selezione del tecnico nel dialog
  const [technicianSearchQuery, setTechnicianSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [showTechnicianDropdown, setShowTechnicianDropdown] = useState(false);
  const [isSearchingTechnicians, setIsSearchingTechnicians] = useState(false);
  const [selectedTechnicianInDialog, setSelectedTechnicianInDialog] = useState<User | null>(null);

  const auth = useAuth();

  // Reset stati quando si apre/chiude il dialog
  useEffect(() => {
    if (isOpen && initialData) {
      setShowDateSection(initialData.showDateSection);
      setShowTimeSection(initialData.showTimeSection);
      setShowTechnicianSection(initialData.showTechnicianSection);
      setSelectedDate(initialData.selectedDate || '');
      setSelectedOrarioIntervento(initialData.selectedOrarioIntervento || '');
      
      if (initialData.technicianName) {
        setTechnicianSearchQuery(initialData.technicianName);
        setSelectedTechnicianInDialog({
          id: '', // Non abbiamo l'ID dall'intervento originale
          name: initialData.technicianName.split(' ')[0] || '',
          surname: initialData.technicianName.split(' ').slice(1).join(' ') || '',
          email: '',
          phone_number: ''
        });
      }
    } else if (!isOpen) {
      // Reset quando si chiude
      setSelectedDate('');
      setSelectedOrarioIntervento('');
      setSelectedOraInizio('');
      setSelectedOraFine('');
      setTechnicianSearchQuery('');
      setSelectedTechnicianInDialog(null);
      setUsers([]);
      setShowTechnicianDropdown(false);
      setShowDateSection(true);
      setShowTimeSection(true);
      setShowTechnicianSection(true);
    }
  }, [isOpen, initialData]);

  // Funzione per cercare i tecnici nel dialog
  const searchTechnicians = useCallback(async (query: string) => {
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

      const response = await fetch(url, {
        headers,
      });

      if (response.ok) {
        const data: ApiResponse<User> = await response.json();
        setUsers(data.data || []);
        setShowTechnicianDropdown(true);
      } else {
        console.error('Errore nella ricerca tecnici:', response.status);
        setUsers([]);
        setShowTechnicianDropdown(false);
      }
    } catch (error) {
      console.error('Errore nella ricerca tecnici:', error);
      setUsers([]);
      setShowTechnicianDropdown(false);
    } finally {
      setIsSearchingTechnicians(false);
    }
  }, [auth]);

  // Funzione per caricare tutti i tecnici (quando si clicca nel campo)
  const loadAllTechnicians = async () => {
    if (users.length > 0) {
      setShowTechnicianDropdown(true);
      return;
    }
    await searchTechnicians('');
  };

  // Gestisce la selezione di un tecnico nel dialog
  const handleTechnicianSelect = (user: User) => {
    setSelectedTechnicianInDialog(user);
    const fullName = user.surname ? `${user.name} ${user.surname}` : user.name;
    setTechnicianSearchQuery(fullName);
    setShowTechnicianDropdown(false);
  };

  // Gestisce il cambio del testo di ricerca tecnico
  const handleTechnicianSearchChange = (value: string) => {
    setTechnicianSearchQuery(value);
    
    if (!value.trim()) {
      setSelectedTechnicianInDialog(null);
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
  }, [technicianSearchQuery, showTechnicianDropdown, searchTechnicians]);

  // Verifica se il form è valido per la conferma
  const isFormValid = () => {
    // Se la sezione data è visibile, deve essere selezionata una data
    if (showDateSection && !selectedDate) return false;
    
    // Se la sezione orario è visibile, deve essere selezionato un orario
    if (showTimeSection && !selectedOrarioIntervento) return false;
    
    // Se è selezionata una fascia oraria personalizzata, devono essere impostati inizio e fine
    if (showTimeSection && selectedOrarioIntervento === 'fascia_oraria') {
      if (!selectedOraInizio || !selectedOraFine) return false;
    }
    
    // Se la sezione tecnico è visibile, deve essere selezionato un tecnico
    if (showTechnicianSection && !selectedTechnicianInDialog) return false;
    
    return true;
  };

  const handleConfirm = () => {
    if (!interventionId || !isFormValid()) return;

    onConfirm({
      interventionId,
      selectedDate: showDateSection ? selectedDate : undefined,
      selectedOrarioIntervento: showTimeSection ? selectedOrarioIntervento : undefined,
      selectedOraInizio: showTimeSection ? selectedOraInizio : undefined,
      selectedOraFine: showTimeSection ? selectedOraFine : undefined,
      selectedTechnician: showTechnicianSection ? selectedTechnicianInDialog || undefined : undefined,
      showDateSection,
      showTimeSection,
      showTechnicianSection
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Dialog */}
        <div className="bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all h-[90vh] flex flex-col relative z-10 w-fit min-w-[60vw] max-w-4xl mx-auto">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Seleziona Data, Orario e Tecnico
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Data e Orario affiancati - Solo se necessario */}
              {(showDateSection || showTimeSection) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Data */}
                  {showDateSection && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                      />
                    </div>
                  )}

                  {/* Orario intervento */}
                  {showTimeSection && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Orario intervento
                      </label>
                      <select
                        value={selectedOrarioIntervento}
                        onChange={(e) => {
                          setSelectedOrarioIntervento(e.target.value);
                          // Reset campi ora quando si cambia tipo orario
                          if (e.target.value !== 'fascia_oraria') {
                            setSelectedOraInizio('');
                            setSelectedOraFine('');
                          }
                        }}
                        disabled={!selectedDate && showDateSection}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700 ${
                          (!selectedDate && showDateSection) ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
                        }`}
                      >
                        <option value="">Seleziona orario</option>
                        <option value="mattina">Mattina (8:00 - 13:00)</option>
                        <option value="pomeriggio">Pomeriggio (14:00 - 18:00)</option>
                        <option value="tutto_il_giorno">Tutto il giorno (8:00 - 18:00)</option>
                        <option value="fascia_oraria">Fascia oraria (personalizzata)</option>
                      </select>
                      
                      {/* Messaggio informativo */}
                      {!selectedDate && showDateSection && (
                        <p className="mt-1 text-xs text-gray-500">
                          💡 Seleziona prima una data per abilitare la scelta dell orario
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Campi condizionali per fascia oraria */}
              {showTimeSection && selectedOrarioIntervento === 'fascia_oraria' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ora inizio
                    </label>
                    <input
                      type="time"
                      value={selectedOraInizio}
                      onChange={(e) => setSelectedOraInizio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ora fine
                    </label>
                    <input
                      type="time"
                      value={selectedOraFine}
                      onChange={(e) => setSelectedOraFine(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                    />
                  </div>
                </div>
              )}

              {/* Sezione Tecnico */}
              {showTechnicianSection && (
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
                          loadAllTechnicians();
                        }}
                        placeholder="Cerca tecnico..."
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      {isSearchingTechnicians && (
                        <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Dropdown con risultati */}
                    {showTechnicianDropdown && users.length > 0 && (
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
              )}
            </div>
          </div>

          {/* Pulsanti fissi in basso */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
            <button
              onClick={handleConfirm}
              disabled={!isFormValid()}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Conferma
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
