'use client';

import React, { useState, useRef } from 'react';
import { Eye, Download, Trash2, X, Plus, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface EquipmentDocument {
  id: number;
  equipment_id: number;
  document_url: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface DocumentiEquipmentProps {
  equipmentId: number;
  documents: EquipmentDocument[];
  onDocumentsUpdated: () => void;
}

export default function DocumentiEquipment({ 
  equipmentId, 
  documents, 
  onDocumentsUpdated 
}: DocumentiEquipmentProps) {
  // Stati per la gestione documenti
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const auth = useAuth();

  // Funzione per gestire la selezione del file
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!documentName.trim()) {
      alert('Inserisci il nome del documento prima di caricarlo');
      return;
    }

    try {
      setUploadingDocument(true);
      setUploadProgress(0);

      // Step 1: Richiedi presigned URL
      const presignedResponse = await fetch('/api/s3/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder: 'equipment-documents',
        }),
      });

      if (!presignedResponse.ok) {
        throw new Error('Errore durante la richiesta del presigned URL');
      }

      const { presignedUrl, fileUrl } = await presignedResponse.json();

      // Step 2: Carica il file su S3
      setUploadProgress(50);
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Errore durante il caricamento su S3');
      }

      setUploadProgress(75);

      // Step 3: Salva l'URL nel database
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const saveResponse = await fetch(`/api/equipments/${equipmentId}/documents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          document_url: fileUrl,
          name: documentName.trim()
        }),
      });

      if (!saveResponse.ok) {
        if (saveResponse.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Errore durante il salvataggio del documento');
      }

      setUploadProgress(100);

      // Notifica il componente padre per aggiornare i documenti
      onDocumentsUpdated();
      
      // Reset stato
      setShowUploadDialog(false);
      setDocumentName('');
      
      // Reset input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (err) {
      console.error('Error uploading document:', err);
      alert('Errore durante il caricamento del documento');
    } finally {
      setUploadingDocument(false);
      setUploadProgress(0);
    }
  };

  // Funzione per eliminare un documento
  const handleDeleteDocument = async (documentId: number) => {
    try {
      setDeletingDocumentId(documentId);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/equipments/${equipmentId}/documents/${documentId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Errore durante l\'eliminazione del documento');
      }

      // Notifica il componente padre per aggiornare i documenti
      onDocumentsUpdated();
      
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Errore durante l\'eliminazione del documento');
    } finally {
      setDeletingDocumentId(null);
      setShowDeleteConfirm(false);
      setDocumentToDelete(null);
    }
  };

  // Gestione conferma eliminazione
  const handleConfirmDelete = () => {
    if (documentToDelete) {
      handleDeleteDocument(documentToDelete);
    }
  };

  // Gestione annullamento eliminazione
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDocumentToDelete(null);
  };

  // Gestione apertura dialog upload
  const handleOpenUploadDialog = () => {
    setDocumentName('');
    setShowUploadDialog(true);
  };

  // Gestione chiusura dialog upload
  const handleCloseUploadDialog = () => {
    setShowUploadDialog(false);
    setDocumentName('');
    setUploadingDocument(false);
  };

  return (
    <>
      {/* Sezione Documenti */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Documenti</h2>
          <button
            onClick={handleOpenUploadDialog}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus size={16} />
            Aggiungi documento
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {documents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">Nessun documento</p>
                <p className="text-gray-500 mb-4">Aggiungi il primo documento per questa apparecchiatura</p>
                <button
                  onClick={handleOpenUploadDialog}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Plus size={16} />
                  Aggiungi documento
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {[...documents].sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })).map((document) => (
                  <div 
                    key={document.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="w-fit">
                      <span className="text-sm font-medium text-gray-900">{document.name}</span>
                    </div>

                    <div className="ml-4 flex items-center gap-2">
                      <button 
                        className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50" 
                        title="Visualizza documento"
                        onClick={() => window.open(document.document_url, '_blank')}
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        className="text-green-600 hover:text-green-700 p-2 rounded-lg hover:bg-green-50"
                        onClick={() => {
                          const link = window.document.createElement('a');
                          link.href = document.document_url;
                          link.download = document.name;
                          link.click();
                        }}
                        title="Scarica documento"
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50"
                        onClick={() => {
                          setShowDeleteConfirm(true);
                          setDocumentToDelete(document.id);
                        }}
                        disabled={deletingDocumentId === document.id}
                        title="Elimina documento"
                      >
                        {deletingDocumentId === document.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog Upload Documento */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Aggiungi documento</h3>
              <button
                onClick={handleCloseUploadDialog}
                className="text-gray-400 hover:text-gray-600"
                disabled={uploadingDocument}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo documento
              </label>
              <select
                onChange={(e) => setDocumentName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700 mb-3"
                disabled={uploadingDocument}
              >
                <option value="">Seleziona un tipo...</option>
                <option value="BOLLETTINO TECNICO">BOLLETTINO TECNICO</option>
                <option value="CATALOGO RICAMBI">CATALOGO RICAMBI</option>
                <option value="MANUALE SERVICE">MANUALE SERVICE</option>
                <option value="MANUALE USO">MANUALE USO</option>
                <option value="PARAMETRI">PARAMETRI</option>
                <option value="SCHEMA ELETTRICO">SCHEMA ELETTRICO</option>
                <option value="ALTRO">ALTRO</option>
              </select>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome documento
              </label>
              <input
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Es: Scheda tecnica, Manuale utente, Certificato..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                disabled={uploadingDocument}
              />
            </div>

            <div className="mb-6">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                disabled={uploadingDocument}
                className="hidden"
                id="document-upload-input"
              />
              <label
                htmlFor="document-upload-input"
                className={`
                  flex items-center justify-center gap-2 px-4 py-3 
                  border-2 border-dashed border-gray-300 rounded-lg
                  cursor-pointer hover:border-teal-500 hover:bg-teal-50
                  transition-colors
                  ${uploadingDocument ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <Upload size={20} className="text-gray-600" />
                <span className="text-gray-700">
                  {uploadingDocument ? `Caricamento... ${uploadProgress}%` : 'Clicca per selezionare un file'}
                </span>
              </label>
              {uploadingDocument && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialog Conferma Eliminazione */}
      {showDeleteConfirm && documentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Conferma eliminazione</h3>
              <button
                onClick={handleCancelDelete}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">
                Sei sicuro di voler eliminare questo documento? 
                <br />
                <span className="text-sm text-gray-500">Questa azione non può essere annullata.</span>
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingDocumentId !== null}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deletingDocumentId !== null ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Eliminazione...
                  </div>
                ) : (
                  'Elimina'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 