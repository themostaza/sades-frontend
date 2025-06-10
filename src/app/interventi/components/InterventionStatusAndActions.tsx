'use client';

import React, { useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';

// Tipo semplificato per il report esistente
interface SimpleReport {
  id: number;
  is_failed: boolean;
}

interface StatusOption {
  id: string;
  label: string;
  color: string;
}

interface UserInfo {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone_number: string;
  role: string;
}

interface InterventionStatusAndActionsProps {
  // Status related props
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  
  // Report related props
  userInfo: UserInfo | null;
  userLoading: boolean;
  existingReport: SimpleReport | null;
  isCheckingReport: boolean;
  isLoadingReport: boolean;
  interventionId: number;
  
  // Action handlers
  onCreateReport: () => void;
  onViewReport: () => void;
  onConfirmReport: () => void;
  onSendToInvoicing: () => void;
}

// Definisco i tipi per il dialog di conferma
interface ConfirmDialogState {
  isOpen: boolean;
  type: 'success' | 'error' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
}

const statusOptions: StatusOption[] = [
  { id: 'da_assegnare', label: 'Da assegnare', color: 'bg-orange-100 text-orange-800' },
  { id: 'attesa_preventivo', label: 'Attesa preventivo', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'attesa_ricambio', label: 'Attesa ricambio', color: 'bg-blue-100 text-blue-800' },
  { id: 'in_carico', label: 'In carico', color: 'bg-teal-100 text-teal-800' },
  { id: 'da_confermare', label: 'Da confermare', color: 'bg-purple-100 text-purple-800' },
  { id: 'completato', label: 'Completato', color: 'bg-green-100 text-green-800' },
  { id: 'non_completato', label: 'Non completato', color: 'bg-gray-100 text-gray-800' },
  { id: 'annullato', label: 'Annullato', color: 'bg-red-100 text-red-800' },
  { id: 'fatturato', label: 'Fatturato', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'collocamento', label: 'Collocamento', color: 'bg-indigo-100 text-indigo-800' }
];

export default function InterventionStatusAndActions({
  selectedStatus,
  userInfo,
  userLoading,
  existingReport,
  isCheckingReport,
  isLoadingReport,
  onCreateReport,
  onViewReport,
  onConfirmReport,
  onSendToInvoicing
}: InterventionStatusAndActionsProps) {

  // Stato per il dialog di conferma
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: ''
  });

  // Funzione per gestire la conferma del rapporto
  const handleConfirmReport = () => {
    // Determina il tipo di intervento basandosi su is_failed
    const isFailed = existingReport?.is_failed === true;
    const statusText = isFailed ? 'non completato' : 'completato';
    const resultText = isFailed ? 'fallimento' : 'successo';
    
    setConfirmDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Conferma rapporto',
      message: `Stai per confermare un rapporto di ${resultText}. L'intervento passerà allo status "${statusText}". Confermi?`,
      onConfirm: () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        onConfirmReport();
      }
    });
  };

  // Funzione per gestire l'invio in fatturazione
  const handleSendToInvoicing = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Manda in fatturazione',
      message: 'Stai per mandare l\'intervento in fatturazione. L\'intervento passerà allo status "fatturato". Confermi?',
      onConfirm: () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        onSendToInvoicing();
      }
    });
  };

  // Funzione per chiudere il dialog
  const closeConfirmDialog = () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  return (
    <div className="space-y-6">
      {/* Report Actions - Solo per status "in_carico", "da_confermare", "completato", "non_completato" o "fatturato" */}
      {!userLoading && userInfo && (selectedStatus === 'in_carico' || selectedStatus === 'da_confermare' || selectedStatus === 'completato' || selectedStatus === 'non_completato' || selectedStatus === 'fatturato') && (
        <div className="flex justify-center">
          {selectedStatus === 'fatturato' ? (
            // Pulsante per status "fatturato" - solo visualizza rapporto a full width
            <button
              onClick={onViewReport}
              disabled={isLoadingReport}
              className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-medium w-full justify-center ${
                isLoadingReport 
                  ? 'bg-gray-100 border border-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-900'
              }`}
            >
              {isLoadingReport ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  Caricamento rapporto...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 6 16 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Visualizza rapporto
                </>
              )}
            </button>
          ) : (selectedStatus === 'completato' || selectedStatus === 'non_completato') ? (
            // Pulsanti per status "completato" e "non_completato"
            <div className="flex gap-4 w-full">
              <button
                onClick={onViewReport}
                disabled={isLoadingReport}
                className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-medium flex-1 justify-center w-full ${
                  isLoadingReport 
                    ? 'bg-gray-100 border border-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-900'
                }`}
              >
                {isLoadingReport ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    Caricamento...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 6 16 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Visualizza rapporto
                  </>
                )}
              </button>
              <button
                onClick={handleSendToInvoicing}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-medium flex-1 justify-center w-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Manda in fatturazione
              </button>
            </div>
          ) : isCheckingReport ? (
            <div className="w-full flex justify-center">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Verifica rapporto...</span>
              </div>
            </div>
          ) : existingReport ? (
            <div className="flex gap-4 w-full">
              <button
                onClick={onViewReport}
                disabled={isLoadingReport}
                className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-medium flex-1 justify-center w-full ${
                  isLoadingReport 
                    ? 'bg-gray-100 border border-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-900'
                }`}
              >
                {isLoadingReport ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    Caricamento...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 6 16 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Visualizza rapporto
                  </>
                )}
              </button>
              <button
                onClick={handleConfirmReport}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-medium flex-1 justify-center w-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Conferma rapporto
              </button>
            </div>
          ) : (
            <button
              onClick={onCreateReport}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-medium w-full justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Crea Rapporto
            </button>
          )}
        </div>
      )}

      {/* Status badges */}
      <div>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((status) => {
            const isSelected = selectedStatus === status.id;
            return (
              <div
                key={status.id}
                className={`${
                  isSelected 
                    ? 'px-4 py-2 rounded-md text-sm font-bold ring-2 ring-blue-500' 
                    : 'px-3 py-1 rounded-full text-xs font-medium opacity-40'
                } ${status.color} transition-all cursor-default`}
                title="Status calcolato automaticamente"
              >
                {status.label}
                {isSelected && (
                  <span className="ml-1 text-xs">👍</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialog di conferma */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              {confirmDialog.type === 'success' ? (
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
              ) : confirmDialog.type === 'error' ? (
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
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
                onClick={closeConfirmDialog}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annulla
              </button>
              {confirmDialog.type === 'confirm' && confirmDialog.onConfirm && (
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Conferma
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 