'use client';

import React from 'react';
import { Eye } from 'lucide-react';

interface Equipment {
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
}

interface DocumentiEquipmentProps {
  equipment: Equipment;
}

export default function DocumentiEquipment({ equipment }: DocumentiEquipmentProps) {
  const documents = [
    {
      name: 'Scheda tecnica',
      url: equipment.tech_sheet_url,
      uploadedAt: equipment.tech_sheet_uploaded_at,
    },
    {
      name: 'Disegno macchina e ricambi',
      url: equipment.machine_design_url,
      uploadedAt: equipment.machine_design_uploaded_at,
    },
    {
      name: 'Schema elettrico',
      url: equipment.electrical_diagram_url,
      uploadedAt: equipment.electrical_diagram_uploaded_at,
    },
    {
      name: 'Manuale servizi',
      url: equipment.service_manual_url,
      uploadedAt: equipment.service_manual_uploaded_at,
    },
    {
      name: 'Manuale istruzioni',
      url: equipment.instruction_manual_url,
      uploadedAt: equipment.instruction_manual_uploaded_at,
    },
  ];

  return (
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

            {documents.map((document, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{document.name}</span>
                    <span className="text-sm text-gray-500">
                      {document.uploadedAt ? new Date(document.uploadedAt).toLocaleDateString('it-IT') : '-'}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  {document.url ? (
                    <button 
                      className="text-teal-600 hover:text-teal-700 p-1 rounded" 
                      title="Visualizza documento"
                      onClick={() => window.open(document.url!, '_blank')}
                    >
                      <Eye size={16} />
                    </button>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 