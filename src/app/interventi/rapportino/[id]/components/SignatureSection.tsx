'use client';

import React, { useState } from 'react';
import { PenTool, XCircle, RotateCcw, FileText, Upload } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import S3FileUploader from '@/components/S3FileUploader';

// Interfaccia per il tipo SignatureCanvas
interface SignatureCanvasRef {
  clear: () => void;
  toDataURL: () => string;
  isEmpty: () => boolean;
}

// Import dinamico di SignatureCanvas per evitare errori SSR
const SignatureCanvas = dynamic(() => import('react-signature-canvas'), { 
  ssr: false,
  loading: () => <div className="w-full h-32 bg-gray-100 animate-pulse rounded-lg"></div>
}) as React.ComponentType<{
  ref: (ref: SignatureCanvasRef | null) => void;
  penColor: string;
  canvasProps: {
    width: number;
    height: number;
    className: string;
  };
}>;

interface SignatureSectionProps {
  signatureUrl?: string;
  status: string;
  isSavingSignature: boolean;
  onOpenSignatureDialog: () => void;
}

interface SignatureDialogProps {
  isOpen: boolean;
  isSaving: boolean;
  signatureRef: SignatureCanvasRef | null;
  setSignatureRef: (ref: SignatureCanvasRef | null) => void;
  onClose: () => void;
  onClear: () => void;
  onSave: () => void;
  onFileUpload: (fileInfo: { cdnUrl: string; name: string; type: string }) => void;
}

export function SignatureSection({
  signatureUrl,
  status,
  isSavingSignature,
  onOpenSignatureDialog
}: SignatureSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <PenTool size={20} className="text-teal-600" />
            Firma o Documento Cliente
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {signatureUrl 
              ? 'Firma o documento acquisito ✓' 
              : status === 'DRAFT' 
                ? 'Clicca per raccogliere la firma o importare un documento'
                : 'Nessuna firma o documento disponibile'
            }
          </p>
        </div>
        {status === 'DRAFT' && (
          <button
            onClick={onOpenSignatureDialog}
            disabled={isSavingSignature}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSavingSignature ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Salvando...
              </>
            ) : (
              <>
                <PenTool size={16} />
                {signatureUrl ? 'Modifica Firma o Documento' : 'Firma o importa documento'}
              </>
            )}
          </button>
        )}
      </div>
      
      {/* Mostra la firma esistente se presente */}
      {signatureUrl && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="text-sm font-medium text-gray-600 mb-2">Firma o documento del cliente:</div>
          <div className="bg-white rounded border p-4">
            {signatureUrl.toLowerCase().endsWith('.pdf') ? (
              // Visualizzazione per PDF
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <FileText size={32} className="text-red-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Documento PDF caricato</p>
                  <p className="text-sm text-gray-600">
                    {signatureUrl.split('/').pop() || 'documento.pdf'}
                  </p>
                </div>
                <a
                  href={signatureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                >
                  Apri PDF
                </a>
              </div>
            ) : (
              // Visualizzazione per immagini
              <Image
                src={signatureUrl}
                alt="Firma del cliente"
                width={400}
                height={200}
                className="max-w-full h-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SignatureDialog({
  isOpen,
  isSaving,
  setSignatureRef,
  onClose,
  onClear,
  onSave,
  onFileUpload
}: SignatureDialogProps) {
  const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>('draw');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <PenTool size={24} className="text-teal-600" />
              Firma o Documento Cliente
            </h2>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <XCircle size={24} />
            </button>
          </div>
          
          {/* Toggle tra Disegna e Carica file */}
          <div className="mb-6">
            <div className="flex gap-4 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setSignatureMode('draw')}
                disabled={isSaving}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                  ${signatureMode === 'draw' 
                    ? 'bg-white text-teal-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                  }
                  ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <PenTool size={18} />
                Disegna firma
              </button>
              <button
                onClick={() => setSignatureMode('upload')}
                disabled={isSaving}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                  ${signatureMode === 'upload' 
                    ? 'bg-white text-teal-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                  }
                  ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <Upload size={18} />
                Carica file
              </button>
            </div>
          </div>
          
          {signatureMode === 'draw' ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Il cliente può firmare nell&apos;area sottostante utilizzando il dito o un pennino.
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 mb-4">
                <SignatureCanvas
                  ref={(ref: SignatureCanvasRef | null) => { setSignatureRef(ref); }}
                  penColor="black"
                  canvasProps={{
                    width: 600,
                    height: 250,
                    className: 'signature-canvas w-full bg-white rounded border'
                  }}
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClear}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={16} />
                  Cancella
                </button>
                <button
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <PenTool size={16} />
                      Salva Firma
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Carica un&apos;immagine (PNG, JPG, JPEG) o un documento PDF contenente la firma del cliente.
              </p>
              
              <div className="mb-4">
                <S3FileUploader
                  onUploadSuccess={(fileInfo) => {
                    onFileUpload(fileInfo);
                    onClose();
                  }}
                  onUploadFailed={(error) => {
                    console.error('Errore durante il caricamento:', error);
                    alert('Errore durante il caricamento del file');
                  }}
                  disabled={isSaving}
                  folder="intervention-signatures"
                  acceptedTypes="image/*,application/pdf"
                  label="Clicca per caricare immagine o PDF"
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Annulla
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

