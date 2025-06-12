'use client';

import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface CancelInterventionButtonProps {
  onCancel: () => void;
  disabled?: boolean;
}

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
}

export default function CancelInterventionButton({ onCancel, disabled = false }: CancelInterventionButtonProps) {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: ''
  });

  const handleCancelClick = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Annulla intervento',
      message: 'Sei sicuro di voler annullare questo intervento? Questa operazione non può essere annullata. L\'intervento passerà allo status "Annullato".'
    });
  };

  const handleConfirm = () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    onCancel();
  };

  const handleClose = () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  return (
    <>
      <button
        onClick={handleCancelClick}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        title="Annulla intervento"
      >
        <X size={16} />
        Annulla intervento
      </button>

      {/* Dialog di conferma */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  {confirmDialog.title}
                </h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                {confirmDialog.message}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Conferma annullamento
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 