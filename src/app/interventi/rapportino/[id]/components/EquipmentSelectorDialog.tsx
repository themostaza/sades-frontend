'use client';

import React from 'react';
import { X, Search } from 'lucide-react';
import type { ConnectedEquipment, AssistanceInterventionDetail } from '../../../../../types/assistance-interventions';

interface EquipmentSelectorDialogProps {
  itemId: string;
  interventionData: AssistanceInterventionDetail | null;
  equipmentSearchQuery: string;
  setEquipmentSearchQuery: (query: string) => void;
  equipmentsResults: ConnectedEquipment[];
  isSearching: boolean;
  onSearch: (query: string) => void;
  onSelect: (equipment: ConnectedEquipment) => void;
  onClose: () => void;
  alreadySelectedEquipmentIds: number[]; // IDs delle apparecchiature già selezionate in altri items
}

export default function EquipmentSelectorDialog({
  interventionData,
  equipmentSearchQuery,
  setEquipmentSearchQuery,
  equipmentsResults,
  isSearching,
  onSearch,
  onSelect,
  onClose,
  alreadySelectedEquipmentIds
}: EquipmentSelectorDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 md:p-6 max-w-3xl md:max-w-4xl w-full mx-4 h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Seleziona apparecchiatura</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Apparecchiature già associate all'intervento */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Apparecchiature già associate all&apos;intervento</label>
          </div>
          <div className="border rounded-lg max-h-56 overflow-y-auto">
            {(interventionData?.connected_equipment || []).length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">Nessuna apparecchiatura associata</div>
            ) : (
              (interventionData?.connected_equipment || []).map((eq) => {
                const isDisabled = alreadySelectedEquipmentIds.includes(eq.id);
                return (
                  <div
                    key={eq.id}
                    onClick={() => {
                      if (isDisabled) return;
                      onSelect(eq);
                    }}
                    className={`px-4 py-3 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'} text-gray-700`}
                  >
                    <div className="font-medium text-gray-700">{eq.description}</div>
                    <div className="text-sm text-gray-500">{eq.brand_name || ''} {eq.model} (S/N: {eq.serial_number}) | ID: {eq.id}</div>
                    <div className="text-xs text-gray-500">
                      {eq.subfamily_name && <span className="mr-2">{eq.subfamily_name}</span>}
                      {eq.customer_name && <span className="mr-2">• Cliente: {eq.customer_name}</span>}
                      {eq.linked_serials && <span>• Linked: {eq.linked_serials}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ricerca apparecchiature */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Cerca altre apparecchiature del cliente</label>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${interventionData?.customer_location_id ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-800'}`}>
              {interventionData?.customer_location_id ? 'Da: Destinazione' : 'Da: Cliente'}
            </span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={equipmentSearchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setEquipmentSearchQuery(value);
                onSearch(value);
              }}
              onFocus={() => onSearch(equipmentSearchQuery)}
              placeholder="Cerca apparecchiatura..."
              className="w-full px-3 py-2 pr-10 border rounded-lg text-gray-700"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            {isSearching && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2 w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
          {equipmentsResults.length > 0 && (
            <div className="mt-2 border rounded-lg max-h-96 overflow-y-auto">
              {equipmentsResults.map(eq => (
                <div
                  key={eq.id}
                  onClick={() => onSelect(eq)}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-gray-700"
                >
                  <div className="font-medium text-gray-700">{eq.description}</div>
                  <div className="text-sm text-gray-500">{eq.brand_name || ''} {eq.model} (S/N: {eq.serial_number}) | ID: {eq.id}</div>
                  <div className="text-xs text-gray-500">
                    {eq.subfamily_name && <span className="mr-2">{eq.subfamily_name}</span>}
                    {eq.customer_name && <span className="mr-2">• Cliente: {eq.customer_name}</span>}
                    {eq.linked_serials && <span>• Linked: {eq.linked_serials}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

