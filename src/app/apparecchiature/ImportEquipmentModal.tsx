'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ImportRecord {
  reason: string;
  row: Record<string, string | number | boolean | null>;
}

interface ImportSummary {
  processedRecords: number;
  added: number;
  updated: number;
  skipped: {
    count: number;
    records: ImportRecord[];
  };
  failed: {
    count: number;
    records: ImportRecord[];
  };
  batchStats: Record<string, unknown>[];
  totalDuration: number;
  warnings: {
    count: number;
    messages: string[];
  };
  dryMode: boolean;
}

interface ImportResponse {
  message: string;
  summary: ImportSummary;
}

interface ImportEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

type ImportStep =
  | 'upload'
  | 'dryrun-loading'
  | 'dryrun-results'
  | 'import-loading'
  | 'import-complete';

export default function ImportEquipmentModal({
  isOpen,
  onClose,
  onImportComplete,
}: ImportEquipmentModalProps) {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [dryRunResults, setDryRunResults] = useState<ImportResponse | null>(
    null
  );
  const [finalResults, setFinalResults] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = file.name
        .toLowerCase()
        .slice(file.name.lastIndexOf('.'));

      if (validExtensions.includes(fileExtension)) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Seleziona un file Excel valido (.xlsx o .xls)');
        setSelectedFile(null);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = file.name
        .toLowerCase()
        .slice(file.name.lastIndexOf('.'));

      if (validExtensions.includes(fileExtension)) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Seleziona un file Excel valido (.xlsx o .xls)');
      }
    }
  };

  const performImport = async (dryMode: boolean = true) => {
    if (!selectedFile || !token) return;

    setError(null);
    setCurrentStep(dryMode ? 'dryrun-loading' : 'import-loading');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('dryMode', dryMode.toString());

      const response = await fetch('/api/import-equipment', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore ${response.status}: ${errorText}`);
      }

      const data: ImportResponse = await response.json();

      if (dryMode) {
        setDryRunResults(data);
        setCurrentStep('dryrun-results');
      } else {
        setFinalResults(data);
        setCurrentStep('import-complete');
        onImportComplete?.();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore durante l'importazione"
      );
      setCurrentStep(dryMode ? 'upload' : 'dryrun-results');
    }
  };

  const handleStartDryRun = () => {
    performImport(true);
  };

  const handleConfirmImport = () => {
    performImport(false);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setCurrentStep('upload');
    setDryRunResults(null);
    setFinalResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FileSpreadsheet className="mx-auto h-16 w-16 text-teal-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Importa Apparecchiature da Excel
        </h3>
        <p className="text-sm text-gray-600">
          Carica un file Excel (.xlsx o .xls) contenente le apparecchiature da
          importare
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          selectedFile
            ? 'border-teal-300 bg-teal-50'
            : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="space-y-3">
            <CheckCircle className="mx-auto h-12 w-12 text-teal-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              Cambia file
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">
                Trascina il file qui o{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-teal-600 hover:text-teal-700 font-medium"
                >
                  seleziona file
                </button>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Formati supportati: .xlsx, .xls
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="text-red-600" size={20} />
            <span className="ml-2 text-red-800 text-sm">{error}</span>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg bg-white"
        >
          Annulla
        </button>
        <button
          onClick={handleStartDryRun}
          disabled={!selectedFile}
          className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <FileText size={16} />
          Verifica Importazione
        </button>
      </div>
    </div>
  );

  const renderLoadingStep = (isDryRun: boolean) => (
    <div className="text-center space-y-6">
      <div className="space-y-4">
        <Loader2 className="mx-auto h-16 w-16 text-teal-600 animate-spin" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isDryRun ? 'Verifica in corso...' : 'Importazione in corso...'}
          </h3>
          <p className="text-sm text-gray-600">
            {isDryRun
              ? 'Sto analizzando il file e verificando i dati senza apportare modifiche al database'
              : 'Sto importando le apparecchiature nel database'}
          </p>
        </div>
      </div>

      {selectedFile && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-center gap-2">
            <FileSpreadsheet className="text-gray-500" size={16} />
            <span className="text-sm text-gray-700">{selectedFile.name}</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderDryRunResults = () => {
    if (!dryRunResults) return null;

    const { summary } = dryRunResults;
    const hasIssues = summary.skipped.count > 0 || summary.failed.count > 0;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div
            className={`mx-auto h-16 w-16 mb-4 ${hasIssues ? 'text-orange-500' : 'text-green-500'}`}
          >
            {hasIssues ? (
              <AlertTriangle size={64} />
            ) : (
              <CheckCircle size={64} />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Verifica Completata
          </h3>
          <p className="text-sm text-gray-600">{dryRunResults.message}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {summary.processedRecords}
            </div>
            <div className="text-xs text-blue-800">Record Processati</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {summary.added}
            </div>
            <div className="text-xs text-green-800">Da Aggiungere</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {summary.skipped.count}
            </div>
            <div className="text-xs text-orange-800">Saltati</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {summary.failed.count}
            </div>
            <div className="text-xs text-red-800">Falliti</div>
          </div>
        </div>

        {/* Detailed Issues */}
        {hasIssues && (
          <div className="space-y-4">
            {summary.skipped.count > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-800 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Record Saltati ({summary.skipped.count})
                </h4>
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {summary.skipped.records.map((record, index) => (
                    <div
                      key={index}
                      className="bg-white border border-orange-200 rounded p-3"
                    >
                      <p className="text-sm font-medium text-orange-800 mb-1">
                        Motivo: {record.reason}
                      </p>
                      {record.row['DESCRIZIONE '] && (
                        <p className="text-xs text-orange-700">
                          Apparecchiatura: {record.row['DESCRIZIONE ']}
                        </p>
                      )}
                      {record.row['NUMERO PROGRESSIVO'] && (
                        <p className="text-xs text-orange-600">
                          Numero: {record.row['NUMERO PROGRESSIVO']}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.failed.count > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Record Falliti ({summary.failed.count})
                </h4>
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {summary.failed.records.map((record, index) => (
                    <div
                      key={index}
                      className="bg-white border border-red-200 rounded p-3"
                    >
                      <p className="text-sm font-medium text-red-800 mb-1">
                        Motivo: {record.reason}
                      </p>
                      {record.row['DESCRIZIONE '] && (
                        <p className="text-xs text-red-700">
                          Apparecchiatura: {record.row['DESCRIZIONE ']}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {summary.warnings.count > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
              <AlertTriangle size={16} />
              Avvisi ({summary.warnings.count})
            </h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {summary.warnings.messages.map((message, index) => (
                <li key={index}>• {message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-between gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg bg-white"
          >
            Ricomincia
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg bg-white"
            >
              Annulla
            </button>
            <button
              onClick={handleConfirmImport}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Upload size={16} />
              Procedi con Importazione
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderImportComplete = () => {
    if (!finalResults) return null;

    const { summary } = finalResults;

    return (
      <div className="text-center space-y-6">
        <div className="space-y-4">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Importazione Completata!
            </h3>
            <p className="text-sm text-gray-600">{finalResults.message}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {summary.added}
            </div>
            <div className="text-xs text-green-800">
              Apparecchiature Aggiunte
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {summary.updated}
            </div>
            <div className="text-xs text-blue-800">
              Apparecchiature Aggiornate
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Tempo di elaborazione: {(summary.totalDuration / 1000).toFixed(1)}{' '}
            secondi
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
        >
          Chiudi
        </button>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'upload':
        return renderUploadStep();
      case 'dryrun-loading':
        return renderLoadingStep(true);
      case 'dryrun-results':
        return renderDryRunResults();
      case 'import-loading':
        return renderLoadingStep(false);
      case 'import-complete':
        return renderImportComplete();
      default:
        return renderUploadStep();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Importa Apparecchiature
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">{renderCurrentStep()}</div>
      </div>
    </div>
  );
}
