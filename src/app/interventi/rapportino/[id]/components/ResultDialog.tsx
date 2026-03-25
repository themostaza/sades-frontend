'use client';

import React from 'react';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

interface ResultDialogProps {
  isOpen: boolean;
  type: 'success' | 'error';
  message: string;
  shouldRedirectOnClose: boolean;
  interventionId: number;
  onClose: () => void;
}

export default function ResultDialog({
  isOpen,
  type,
  message,
  shouldRedirectOnClose,
  interventionId,
  onClose,
}: ResultDialogProps) {
  if (!isOpen) return null;

  const handleGoToInterventi = () => {
    const interventionUrl = `/interventi?ai=${interventionId}`;
    window.location.href = interventionUrl;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              {type === 'success' ? (
                <CheckCircle size={24} className="text-green-600" />
              ) : (
                <XCircle size={24} className="text-red-600" />
              )}
              {message}
            </h2>
          </div>

          <div className="flex gap-3 justify-end">
            {type === 'success' && !shouldRedirectOnClose && (
              <button
                onClick={handleGoToInterventi}
                className="px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Torna agli interventi
              </button>
            )}
            <button
              onClick={() => {
                onClose();
                if (shouldRedirectOnClose) {
                  handleGoToInterventi();
                }
              }}
              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {shouldRedirectOnClose ? 'Chiudi' : 'Continua a modificare'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
