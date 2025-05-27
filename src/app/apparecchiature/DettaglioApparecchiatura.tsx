'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Eye, Download} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface EquipmentImage {
  id: number;
  filename: string;
  url: string;
  uploaded_at: string;
}

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
  sale_date: string | null;
  flg_not_sold_by_saded: boolean;
  group_id: string;
  subgroup_id: string | null;
  note: string | null;
  tech_assist_phone_num: string | null;
  fl_gas: boolean;
  compressor_type_id: number | null;
  gas_type_id: number | null;
  max_charge: string | null;
  compr_model: string | null;
  compr_brand: string | null;
  compr_unique_num: string | null;
  fgas_check_date: string | null;
  periodic_checks: string;
  tech_sheet_url: string | null;
  tech_sheet_uploaded_at: string | null;
  machine_design_url: string | null;
  machine_design_uploaded_at: string | null;
  electrical_diagram_url: string | null;
  electrical_diagram_uploaded_at: string | null;
  service_manual_url: string | null;
  service_manual_uploaded_at: string | null;
  instruction_manual_url: string | null;
  instruction_manual_uploaded_at: string | null;
  created_at: string;
  updated_at: string;
  grouping: string | null;
  design_position: string | null;
  family_id: string;
  subfamily_id: string;
  customer_location_id: number | null;
  group_label: string;
  brand_label: string;
  subgroup_label: string | null;
  gas_type_label: string | null;
  compressor_type_label: string | null;
  company_name: string;
  location_company_name: string | null;
  family_label: string;
  subfamily_label: string;
  images: EquipmentImage[];
  linked_equipments: LinkedEquipment[];
}

interface DettaglioApparecchiaturaProps {
  equipmentId: number;
  onBack: () => void;
  onEquipmentUpdated?: () => void;
}

export default function DettaglioApparecchiatura({ equipmentId, onBack }: DettaglioApparecchiaturaProps) {
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

  // Stati per la sezione dismesso (non presente nell'API, quindi manteniamo locale)
  const [dismesso, setDismesso] = useState(false);

  const auth = useAuth();

  // Fetch equipment details
  const fetchEquipmentDetails = async () => {
    if (!equipmentId) return;
    
    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/equipments/${equipmentId}`, {
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch equipment details');
      }

      const data = await response.json();
      const equipmentData = data.data || data;
      setEquipment(equipmentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching equipment details:', err);
    } finally {
      setLoading(false);
    }
  };


  // Format date for input
  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  useEffect(() => {
    if (equipmentId) {
      fetchEquipmentDetails();
    }
  }, [equipmentId]);

  if (loading && !equipment) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento dettagli apparecchiatura...</p>
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
            <p className="text-red-600 mb-4">Errore nel caricamento dell&apos;apparecchiatura</p>
            <button 
              onClick={fetchEquipmentDetails}
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
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">
          {equipment?.description || 'Apparecchiatura'} di {equipment?.company_name || 'Destinatario'}
          </h1>
        </div>
      </div>

      {equipment && (
        <div className="space-y-6">
          {/* Sezione Dettagli */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Dettagli</h2>
            </div>
            
            <div className="p-6">
              {/* Descrizione - full width */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Descrizione
                </label>
                <input
                  type="text"
                  value={equipment.description}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colonna Sinistra */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Proprietà
                    </label>
                    <input
                      type="text"
                      value={equipment.company_name}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Gestore
                    </label>
                    <input
                      type="text"
                      value={equipment.location_company_name || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Marchio
                    </label>
                    <input
                      type="text"
                      value={equipment.brand_label}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Numero seriale
                    </label>
                    <input
                      type="text"
                      value={equipment.serial_number || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Famiglia
                    </label>
                    <input
                      type="text"
                      value={equipment.family_label}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Gruppo
                    </label>
                    <input
                      type="text"
                      value={equipment.group_label}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Numero seriale
                    </label>
                    <input
                      type="text"
                      value={equipment.serial_number || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                </div>

                {/* Colonna Destra */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Destinazione proprietà
                    </label>
                    <input
                      type="text"
                      value={equipment.company_name}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Destinazione gestore
                    </label>
                    <input
                      type="text"
                      value={equipment.location_company_name || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Modello
                    </label>
                    <input
                      type="text"
                      value={equipment.model || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Data di vendita
                    </label>
                    <div className="space-y-3">
                      <input
                        type="date"
                        value={formatDateForInput(equipment.sale_date)}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                      />
                      
                      <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="not_sold_by_sades"
                            checked={equipment.flg_not_sold_by_saded || false}
                            readOnly
                            disabled
                            className="h-4 w-4 text-teal-600 border-gray-300 rounded opacity-50"
                          />
                          <label htmlFor="not_sold_by_sades" className="ml-3 text-sm font-medium text-gray-500">
                            Non venduto da Sades
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Sottofamiglia
                    </label>
                    <input
                      type="text"
                      value={equipment.subfamily_label}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Sottogruppo
                    </label>
                    <input
                      type="text"
                      value={equipment.subgroup_label || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Questa apparecchiatura è associata a
                    </label>
                    <div className="space-y-2">
                      {equipment.linked_equipments.map((linked, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border border-gray-300 rounded bg-gray-50">
                          <span className="text-gray-700">{linked.serial_number || `Equipment ${linked.id}`}</span>
                          <div className="flex gap-2">
                            <button className="text-gray-400 cursor-not-allowed" disabled>Rimuovi</button>
                            <button className="text-gray-400 cursor-not-allowed" disabled>Apri</button>
                          </div>
                        </div>
                      ))}
                      <div className="w-full py-2 border border-dashed border-gray-300 rounded text-gray-400 text-center">
                        Funzionalità disponibile in futuro
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Note
                </label>
                <textarea
                  rows={3}
                  value={equipment.note || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                />
              </div>

              {/* Numero assistenza tecnica casa madre */}
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Numero assistenza tecnica casa madre
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={equipment.tech_assist_phone_num || ''}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                    <button className="px-4 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200">
                      Chiama
                    </button>
                  </div>
                </div>
              </div>

              {/* Posizioni e alimentazioni */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Posizione su disegno
                    </label>
                    <input
                      type="text"
                      value={equipment.design_position || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Alimentazione elettrica TIPO2
                    </label>
                    <input
                      type="text"
                      value={equipment.electrical_diagram_url ? 'Visualizza' : 'Nessuna'}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Dimensione MERCE
                    </label>
                    <input
                      type="text"
                      value={equipment.max_charge || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Dimensione IMBALLO
                    </label>
                    <input
                      type="text"
                      value={equipment.compr_model || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Alimentazione gas POTENZA
                    </label>
                    <input
                      type="text"
                      value={equipment.gas_type_label || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Alimentazione elettrica POTENZA
                    </label>
                    <input
                      type="text"
                      value={equipment.electrical_diagram_url ? 'Visualizza' : 'Nessuna'}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Peso netto
                    </label>
                    <input
                      type="text"
                      value={equipment.compr_model || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      PESO lordo
                    </label>
                    <input
                      type="text"
                      value={equipment.compr_brand || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gestione gas */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Gestione gas</h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={equipment.fl_gas || false}
                  readOnly
                  disabled
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
          </div>

          {/* Dismesso */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Dismesso?</h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={dismesso}
                  onChange={(e) => setDismesso(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
          </div>

          {/* Immagini */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Immagini</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {equipment.images.map((image, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">File</span>
                        <span className="text-sm text-gray-500">Data di caricamento</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{image.filename || `img_${index + 1}.png`}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {image.uploaded_at ? new Date(image.uploaded_at).toLocaleDateString('it-IT') : '-'}
                          </span>
                          <button className="text-gray-400 hover:text-gray-600">
                            <Eye size={16} />
                          </button>
                          <button className="text-gray-400 hover:text-gray-600">
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {equipment.images.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      Nessuna immagine caricata
                    </div>
                  )}
                </div>

                <button className="w-full py-3 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-2">
                  <Upload size={16} />
                  Aggiungi
                </button>
              </div>
            </div>
          </div>

          {/* Documenti */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Documenti</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">Documento</span>
                      <span className="text-sm font-medium text-gray-700">Data di caricamento</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Azioni</span>
                  </div>

                  {/* Scheda tecnica */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Scheda tecnica</span>
                        <span className="text-sm text-gray-500">
                          {equipment.tech_sheet_uploaded_at ? new Date(equipment.tech_sheet_uploaded_at).toLocaleDateString('it-IT') : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {equipment.tech_sheet_url ? (
                        <button className="text-teal-600 hover:text-teal-700 p-1 rounded" title="Visualizza documento">
                          <Eye size={16} />
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </div>
                  </div>

                  {/* Disegno macchina e ricambi */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Disegno macchina e ricambi</span>
                        <span className="text-sm text-gray-500">
                          {equipment.machine_design_uploaded_at ? new Date(equipment.machine_design_uploaded_at).toLocaleDateString('it-IT') : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {equipment.machine_design_url ? (
                        <button className="text-teal-600 hover:text-teal-700 p-1 rounded" title="Visualizza documento">
                          <Eye size={16} />
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </div>
                  </div>

                  {/* Schema elettrico */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Schema elettrico</span>
                        <span className="text-sm text-gray-500">
                          {equipment.electrical_diagram_uploaded_at ? new Date(equipment.electrical_diagram_uploaded_at).toLocaleDateString('it-IT') : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {equipment.electrical_diagram_url ? (
                        <button className="text-teal-600 hover:text-teal-700 p-1 rounded" title="Visualizza documento">
                          <Eye size={16} />
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </div>
                  </div>

                  {/* Manuale servici */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Manuale servici</span>
                        <span className="text-sm text-gray-500">
                          {equipment.service_manual_uploaded_at ? new Date(equipment.service_manual_uploaded_at).toLocaleDateString('it-IT') : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {equipment.service_manual_url ? (
                        <button className="text-teal-600 hover:text-teal-700 p-1 rounded" title="Visualizza documento">
                          <Eye size={16} />
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </div>
                  </div>

                  {/* Manuale istruzioni */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Manuale istruzioni</span>
                        <span className="text-sm text-gray-500">
                          {equipment.instruction_manual_uploaded_at ? new Date(equipment.instruction_manual_uploaded_at).toLocaleDateString('it-IT') : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {equipment.instruction_manual_url ? (
                        <button className="text-teal-600 hover:text-teal-700 p-1 rounded" title="Visualizza documento">
                          <Eye size={16} />
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 