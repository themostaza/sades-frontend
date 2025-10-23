'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';

interface S3FileUploaderProps {
  onUploadSuccess: (fileInfo: { cdnUrl: string; name: string; type: string }) => void;
  onUploadFailed?: (error: Error) => void;
  disabled?: boolean;
  folder?: string;
  acceptedTypes?: string; // es. "image/*,application/pdf"
  label?: string;
}

export default function S3FileUploader({ 
  onUploadSuccess, 
  onUploadFailed, 
  disabled = false,
  folder = 'uploads',
  acceptedTypes = 'image/*,application/pdf',
  label = 'Clicca per caricare un file'
}: S3FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useRef(`s3-file-upload-${Math.random()}`);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Verifica il tipo di file
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      alert('Seleziona solo immagini (PNG, JPG, JPEG) o documenti PDF');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Step 1: Richiedi presigned URL
      const presignedResponse = await fetch('/api/s3/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder,
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

      setUploadProgress(100);

      // Chiama la callback di successo
      onUploadSuccess({
        cdnUrl: fileUrl,
        name: file.name,
        type: file.type,
      });

      // Reset input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      if (onUploadFailed) {
        onUploadFailed(err as Error);
      } else {
        alert('Errore durante il caricamento del file');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        disabled={uploading || disabled}
        className="hidden"
        id={inputId.current}
      />
      <label
        htmlFor={inputId.current}
        className={`
          flex items-center justify-center gap-2 px-4 py-3 
          border-2 border-dashed border-gray-300 rounded-lg
          cursor-pointer hover:border-teal-500 hover:bg-teal-50
          transition-colors
          ${(uploading || disabled) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {uploading ? (
          <>
            <Upload size={20} className="text-gray-600 animate-pulse" />
            <span className="text-gray-700">
              Caricamento in corso... {uploadProgress}%
            </span>
          </>
        ) : (
          <>
            <FileText size={20} className="text-gray-600" />
            <span className="text-gray-700">{label}</span>
          </>
        )}
      </label>
      {uploading && (
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
  );
}

