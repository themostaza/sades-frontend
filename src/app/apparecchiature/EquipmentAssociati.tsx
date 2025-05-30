'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface LinkedEquipment {
  id: number;
  serial_number: string | null;
  description: string;
}

interface Equipment {
  id: number;
  description: string;
  customer_id: number;
  brand_id: number;
  model: string | null;
  serial_number: string | null;
  brand_label: string;
  company_name: string;
}

interface EquipmentAssociatiProps {
  equipmentId: number;
  linkedEquipmentIds: number[];
  onEquipmentLinked: () => void;
}

export default function EquipmentAssociati({ 
  equipmentId, 
  linkedEquipmentIds, 
  onEquipmentLinked 
}: EquipmentAssociatiProps) {
  // Stati per la gestione degli equipment associati
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Equipment[]>([]);
  const [selectedEquipments, setSelectedEquipments] = useState<number[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [linkingEquipments, setLinkingEquipments] = useState(false);
  const [removingEquipmentId, setRemovingEquipmentId] = useState<number | null>(null);
  
  // Stato per i dettagli completi degli equipment linkati
  const [linkedEquipmentsDetails, setLinkedEquipmentsDetails] = useState<LinkedEquipment[]>([]);
  const [loadingLinkedDetails, setLoadingLinkedDetails] = useState(false);

  const auth = useAuth();

  // Funzione per cercare equipment
  const searchEquipments = async (query: string) => {
    try {
      setSearchLoading(true);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      // Se non c'è query, carica i primi 10 equipment disponibili
      const searchUrl = query.trim() 
        ? `/api/equipments?query=${encodeURIComponent(query)}&page=1&skip=10`
        : `/api/equipments?page=1&skip=10`;

      const response = await fetch(searchUrl, { headers });

      if (!response.ok) {
        throw new Error('Errore nella ricerca equipment');
      }

      const data = await response.json();
      // Filtra l'equipment corrente dai risultati
      const filteredResults = (data.data || []).filter((eq: Equipment) => eq.id !== equipmentId);
      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Error searching equipments:', err);
      alert('Errore durante la ricerca degli equipment');
    } finally {
      setSearchLoading(false);
    }
  };

  // Effect per caricare risultati iniziali quando si apre il dialog
  useEffect(() => {
    if (showEquipmentDialog) {
      // Carica risultati iniziali quando si apre il dialog
      searchEquipments('');
    }
  }, [showEquipmentDialog]);

  // Funzione per collegare equipment selezionati
  const linkSelectedEquipments = async () => {
    if (selectedEquipments.length === 0) return;

    try {
      setLinkingEquipments(true);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      // Collega ogni equipment selezionato
      for (const equipmentToLinkId of selectedEquipments) {
        const response = await fetch(`/api/equipments/${equipmentId}/grouping`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ equipment_id: equipmentToLinkId }),
        });

        if (!response.ok) {
          throw new Error(`Errore nel collegamento dell'equipment ${equipmentToLinkId}`);
        }
      }

      // Notifica il componente padre per aggiornare i dati
      onEquipmentLinked();
      
      // Chiudi il dialog e resetta lo stato
      setShowEquipmentDialog(false);
      setSelectedEquipments([]);
      setSearchQuery('');
      setSearchResults([]);
      
    } catch (err) {
      console.error('Error linking equipments:', err);
      alert('Errore durante il collegamento degli equipment');
    } finally {
      setLinkingEquipments(false);
    }
  };

  // Funzione per rimuovere un equipment dal grouping
  const removeEquipmentFromGroup = async (linkedEquipmentId: number) => {
    try {
      setRemovingEquipmentId(linkedEquipmentId);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/equipments/${linkedEquipmentId}/grouping`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error('Errore nella rimozione dell\'equipment dal gruppo');
      }

      // Notifica il componente padre per aggiornare i dati
      onEquipmentLinked();
      
    } catch (err) {
      console.error('Error removing equipment from group:', err);
      alert('Errore durante la rimozione dell\'equipment dal gruppo');
    } finally {
      setRemovingEquipmentId(null);
    }
  };

  // Gestione selezione equipment nel dialog
  const toggleEquipmentSelection = (equipmentId: number) => {
    setSelectedEquipments(prev => 
      prev.includes(equipmentId) 
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  // Effect per la ricerca con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchEquipments(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Effect per caricare i dettagli degli equipment linkati
  useEffect(() => {
    if (linkedEquipmentIds && linkedEquipmentIds.length > 0) {
      fetchLinkedEquipmentsDetails(linkedEquipmentIds);
    } else {
      setLinkedEquipmentsDetails([]);
    }
  }, [linkedEquipmentIds]);

  // Funzione per fetchare i dettagli degli equipment linkati
  const fetchLinkedEquipmentsDetails = async (linkedIds: number[]) => {
    if (linkedIds.length === 0) {
      setLinkedEquipmentsDetails([]);
      return;
    }

    try {
      setLoadingLinkedDetails(true);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      // Fare chiamate parallele per ogni equipment linkato
      const promises = linkedIds.map(async (id) => {
        const response = await fetch(`/api/equipments/${id}`, { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch equipment ${id}`);
        }
        const data = await response.json();
        const equipmentData = data.data || data;
        return {
          id: equipmentData.id,
          serial_number: equipmentData.serial_number,
          description: equipmentData.description
        } as LinkedEquipment;
      });

      const linkedDetails = await Promise.all(promises);
      setLinkedEquipmentsDetails(linkedDetails);
    } catch (err) {
      console.error('Error fetching linked equipments details:', err);
      // In caso di errore, mostra almeno gli ID
      const fallbackDetails = linkedIds.map(id => ({
        id,
        serial_number: null,
        description: `Equipment ${id}`
      }));
      setLinkedEquipmentsDetails(fallbackDetails);
    } finally {
      setLoadingLinkedDetails(false);
    }
  };

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">
          Questa apparecchiatura è associata a
        </label>
        <div className="space-y-2">
          {loadingLinkedDetails ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-gray-600">Caricamento equipment associati...</span>
            </div>
          ) : (
            linkedEquipmentsDetails.map((linked) => (
              <div key={linked.id} className="flex items-center justify-between p-2 border border-gray-300 rounded bg-gray-50">
                <span className="text-gray-700">
                  {linked.serial_number || linked.description || `Equipment ${linked.id}`}
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => removeEquipmentFromGroup(linked.id)}
                    disabled={removingEquipmentId === linked.id}
                    className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {removingEquipmentId === linked.id ? (
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Rimuovi'
                    )}
                  </button>
                  <button className="text-gray-400 cursor-not-allowed" disabled>Apri</button>
                </div>
              </div>
            ))
          )}
          <button
            onClick={() => setShowEquipmentDialog(true)}
            className="w-full py-2 border border-dashed border-teal-300 rounded text-teal-600 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Aggiungi
          </button>
        </div>
      </div>

      {/* Dialog Selezione Equipment */}
      {showEquipmentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 h-[90vh] flex flex-col">
            {/* Header fisso */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-medium text-gray-900">Seleziona Equipment da Associare</h3>
              <button
                onClick={() => {
                  setShowEquipmentDialog(false);
                  setSelectedEquipments([]);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Contenuto scrollabile */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Campo di ricerca */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Cerca equipment per descrizione, modello o numero seriale..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-700"
                  />
                </div>
              </div>

              {/* Risultati ricerca */}
              <div>
                {searchLoading ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-600">Ricerca in corso...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((eq) => (
                      <div
                        key={eq.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedEquipments.includes(eq.id)
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                        onClick={() => toggleEquipmentSelection(eq.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedEquipments.includes(eq.id)}
                                onChange={() => toggleEquipmentSelection(eq.id)}
                                className="h-4 w-4 text-teal-600 border-gray-300 rounded"
                              />
                              <div>
                                <p className="font-medium text-gray-900">{eq.description}</p>
                                <p className="text-sm text-gray-600">
                                  {eq.brand_label} {eq.model && `- ${eq.model}`}
                                  {eq.serial_number && ` | SN: ${eq.serial_number}`}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="text-center py-8 text-gray-500">
                    Nessun equipment trovato per {searchQuery}
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nessun equipment disponibile
                  </div>
                ) : null}
              </div>
            </div>

            {/* Footer fisso con pulsanti */}
            <div className="border-t border-gray-200 p-6 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEquipmentDialog(false);
                    setSelectedEquipments([]);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={linkSelectedEquipments}
                  disabled={selectedEquipments.length === 0 || linkingEquipments}
                  className="flex-1 py-2 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {linkingEquipments ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Collegamento...
                    </div>
                  ) : (
                    `Collega ${selectedEquipments.length > 0 ? `(${selectedEquipments.length})` : ''}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 