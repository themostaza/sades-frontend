'use client';

import React from 'react';
import { Clock, MessageCircle, AlertTriangle, Plus } from 'lucide-react';

interface BasicInfoSectionProps {
  editableWorkHours: string;
  editableTravelHours: string;
  editableCustomerNotes: string;
  showNotesField: boolean;
  interventionId: number;
  isFailed: boolean;
  failureReason?: string;
  canEditBasicFields: boolean;
  onWorkHoursChange: (hours: string) => void;
  onTravelHoursChange: (hours: string) => void;
  onCustomerNotesChange: (notes: string) => void;
  onShowNotesField: () => void;
}

// Funzioni helper per gestire i campi decimali
const normalizeDecimalInput = (value: string): string => {
  // Sostituisci punto con virgola per mostrare sempre la virgola
  // Permetti solo numeri, virgola e punto
  const cleaned = value.replace(/[^0-9.,]/g, '');
  return cleaned.replace('.', ',');
};

export default function BasicInfoSection({
  editableWorkHours,
  editableTravelHours,
  editableCustomerNotes,
  showNotesField,
  interventionId,
  isFailed,
  failureReason,
  canEditBasicFields,
  onWorkHoursChange,
  onTravelHoursChange,
  onCustomerNotesChange,
  onShowNotesField
}: BasicInfoSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Informazioni Generali</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-teal-600" size={20} />
            <span className="font-medium text-gray-700">Ore Lavoro</span>
          </div>
          {canEditBasicFields ? (
            <input
              type="text"
              value={editableWorkHours}
              onChange={(e) => onWorkHoursChange(normalizeDecimalInput(e.target.value))}
              onFocus={(e) => e.target.select()}
              onClick={(e) => e.currentTarget.select()}
              inputMode="decimal"
              className="text-2xl font-bold text-gray-900 bg-white border-2 border-teal-200 rounded-lg px-3 py-1 w-full focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          ) : (
            <div className="text-2xl font-bold text-gray-900">{editableWorkHours}h</div>
          )}
          <div className="text-sm text-gray-600">Ore effettive</div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-orange-600" size={20} />
            <span className="font-medium text-gray-700">Ore Viaggio</span>
          </div>
          {canEditBasicFields ? (
            <input
              type="text"
              value={editableTravelHours}
              onChange={(e) => onTravelHoursChange(normalizeDecimalInput(e.target.value))}
              onFocus={(e) => e.target.select()}
              onClick={(e) => e.currentTarget.select()}
              inputMode="decimal"
              className="text-2xl font-bold text-gray-900 bg-white border-2 border-orange-200 rounded-lg px-3 py-1 w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          ) : (
            <div className="text-2xl font-bold text-gray-900">{editableTravelHours}h</div>
          )}
          <div className="text-sm text-gray-600">Ore trasferimento</div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-blue-600" size={20} />
            <span className="font-medium text-gray-700">Intervento</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">#{interventionId}</div>
          <div className="text-sm text-gray-600">ID Intervento</div>
        </div>
      </div>

      {/* Note per il cliente */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="text-blue-600" size={20} />
            <h3 className="font-semibold text-gray-900">Note per il cliente</h3>
          </div>
          {canEditBasicFields && !showNotesField && (
            <button
              onClick={onShowNotesField}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
            >
              <Plus size={16} />
              Aggiungi note
            </button>
          )}
        </div>
        
        {showNotesField ? (
          canEditBasicFields ? (
            <textarea
              value={editableCustomerNotes}
              onChange={(e) => onCustomerNotesChange(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900"
              placeholder="Note che saranno leggibili dal cliente"
            />
          ) : (
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-5 shadow-sm">
              <p className="text-gray-900 text-base leading-relaxed font-medium">{editableCustomerNotes}</p>
            </div>
          )
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-gray-500 text-sm">Nessuna nota inserita per il cliente</p>
          </div>
        )}
      </div>

      {/* Intervento fallito */}
      {isFailed && failureReason && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-red-600" size={20} />
            <h3 className="font-semibold text-gray-900">Motivo del fallimento</h3>
          </div>
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg p-5 shadow-sm">
            <p className="text-red-900 text-base leading-relaxed font-medium">{failureReason}</p>
          </div>
        </div>
      )}
    </div>
  );
}

