'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({
  isOpen,
  isDeleting,
  onConfirm,
  onCancel
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Trash2 size={24} className="text-red-600" />
              Conferma Eliminazione
            </h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Sei sicuro di voler eliminare definitivamente questo rapportino? 
            <br />
            <strong>Questa azione non può essere annullata.</strong>
          </p>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Elimina Definitivamente
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

