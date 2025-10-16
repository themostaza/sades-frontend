'use client';

import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface S3ImageUploaderProps {
  onUploadSuccess: (fileInfo: { cdnUrl: string; name: string }) => void;
  onUploadFailed?: (error: Error) => void;
  multiple?: boolean;
  disabled?: boolean;
  folder?: string;
}

export default function S3ImageUploader({ 
  onUploadSuccess, 
  onUploadFailed, 
  multiple = false,
  disabled = false,
  folder = 'uploads'
}: S3ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Se non è multiple, prendi solo il primo file
    const filesToUpload = multiple ? Array.from(files) : [files[0]];

    for (const file of filesToUpload) {
      // Verifica che sia un'immagine
      if (!file.type.startsWith('image/')) {
        alert('Seleziona solo file immagine validi');
        continue;
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
        });

        // Reset input file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (err) {
        console.error('Error uploading image:', err);
        if (onUploadFailed) {
          onUploadFailed(err as Error);
        } else {
          alert('Errore durante il caricamento dell\'immagine');
        }
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileSelect}
        disabled={uploading || disabled}
        className="hidden"
        id={`s3-image-upload-${Math.random()}`}
      />
      <label
        htmlFor={`s3-image-upload-${Math.random()}`}
        className={`
          flex items-center justify-center gap-2 px-4 py-3 
          border-2 border-dashed border-gray-300 rounded-lg
          cursor-pointer hover:border-teal-500 hover:bg-teal-50
          transition-colors
          ${(uploading || disabled) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <Upload size={20} className="text-gray-600" />
        <span className="text-gray-700">
          {uploading 
            ? `Caricamento in corso... ${uploadProgress}%` 
            : `Clicca per caricare ${multiple ? 'immagini' : 'un\'immagine'}`
          }
        </span>
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
    </>
  );
}

