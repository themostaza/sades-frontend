'use client';

import React, { useState, useRef } from 'react';
import { Eye, Download, Trash2, X, Upload } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '../../contexts/AuthContext';

interface EquipmentImage {
  id: number;
  equipment_id: number;
  image_url: string;
  created_at: string;
  updated_at: string;
}

interface ImmaginiEquipmentProps {
  equipmentId: number;
  images: EquipmentImage[];
  onImagesUpdated: () => void;
}

export default function ImmaginiEquipment({ 
  equipmentId, 
  images, 
  onImagesUpdated 
}: ImmaginiEquipmentProps) {
  // Stati per le immagini
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const auth = useAuth();

  // Funzione per gestire la selezione del file
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('========================================');
    console.log('🖼️ [ImmaginiEquipment] File selected:', file?.name);
    console.log('========================================');
    
    if (!file) return;

    // Verifica che sia un'immagine
    if (!file.type.startsWith('image/')) {
      console.error('❌ [ImmaginiEquipment] Invalid file type:', file.type);
      alert('Seleziona un file immagine valido');
      return;
    }

    console.log('✅ [ImmaginiEquipment] File is valid image');
    console.log('📝 [ImmaginiEquipment] File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    try {
      setUploading(true);
      setUploadProgress(0);

      // Step 1: Richiedi presigned URL
      console.log('🔄 [ImmaginiEquipment] Step 1: Requesting presigned URL...');
      const presignedResponse = await fetch('/api/s3/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder: 'equipment-images',
        }),
      });

      console.log('📡 [ImmaginiEquipment] Presigned URL response status:', presignedResponse.status);

      if (!presignedResponse.ok) {
        const errorText = await presignedResponse.text();
        console.error('❌ [ImmaginiEquipment] Presigned URL error:', errorText);
        throw new Error('Errore durante la richiesta del presigned URL');
      }

      const { presignedUrl, fileUrl } = await presignedResponse.json();
      console.log('✅ [ImmaginiEquipment] Got presigned URL');
      console.log('📝 [ImmaginiEquipment] File URL:', fileUrl);

      // Step 2: Carica il file su S3
      console.log('🔄 [ImmaginiEquipment] Step 2: Uploading to S3...');
      console.log('📝 [ImmaginiEquipment] Presigned URL:', presignedUrl);
      setUploadProgress(50);
      
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      console.log('📡 [ImmaginiEquipment] S3 upload response status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ [ImmaginiEquipment] S3 upload error:', errorText);
        throw new Error('Errore durante il caricamento su S3');
      }

      console.log('✅ [ImmaginiEquipment] File uploaded to S3 successfully');
      setUploadProgress(75);

      // Step 3: Salva l'URL nel database
      console.log('🔄 [ImmaginiEquipment] Step 3: Saving to database...');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const saveResponse = await fetch(`/api/equipments/${equipmentId}/images`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ image_url: fileUrl }),
      });

      console.log('📡 [ImmaginiEquipment] Save to DB response status:', saveResponse.status);

      if (!saveResponse.ok) {
        if (saveResponse.status === 401) {
          console.error('❌ [ImmaginiEquipment] Unauthorized - logging out');
          auth.logout();
          return;
        }
        const errorText = await saveResponse.text();
        console.error('❌ [ImmaginiEquipment] Save to DB error:', errorText);
        throw new Error('Errore durante il salvataggio dell\'immagine');
      }

      console.log('✅ [ImmaginiEquipment] Image saved to database successfully');
      setUploadProgress(100);

      // Notifica il componente padre per aggiornare le immagini
      console.log('🔄 [ImmaginiEquipment] Calling onImagesUpdated...');
      onImagesUpdated();

      // Reset input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      console.log('✅ [ImmaginiEquipment] Upload process completed successfully!');
      console.log('========================================');
      
    } catch (err) {
      console.error('💥 [ImmaginiEquipment] Error uploading image:', err);
      console.error('💥 [ImmaginiEquipment] Error type:', err instanceof Error ? 'Error' : typeof err);
      console.error('💥 [ImmaginiEquipment] Error message:', err instanceof Error ? err.message : String(err));
      console.error('💥 [ImmaginiEquipment] Error stack:', err instanceof Error ? err.stack : 'No stack');
      console.log('========================================');
      alert('Errore durante il caricamento dell\'immagine');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Funzione per eliminare un'immagine
  const handleDeleteImage = async (imageId: number) => {
    try {
      setDeletingImageId(imageId);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/equipments/${equipmentId}/images/${imageId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Errore durante l\'eliminazione dell\'immagine');
      }

      // Notifica il componente padre per aggiornare le immagini
      onImagesUpdated();
      
    } catch (err) {
      console.error('Error deleting image:', err);
      alert('Errore durante l\'eliminazione dell\'immagine');
    } finally {
      setDeletingImageId(null);
      setShowDeleteConfirm(false);
      setImageToDelete(null);
    }
  };

  // Gestione conferma eliminazione
  const handleConfirmDelete = () => {
    if (imageToDelete) {
      handleDeleteImage(imageToDelete);
    }
  };

  // Gestione annullamento eliminazione
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setImageToDelete(null);
  };

  return (
    <>
      {/* Sezione Immagini */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Immagini</h2>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={image.id} className="border border-gray-200 rounded-lg p-4">
                  {/* Preview dell'immagine */}
                  <div className="mb-3">
                    <Image 
                      src={image.image_url} 
                      alt={`Immagine ${index + 1}`}
                      width={300}
                      height={192}
                      className="w-full h-48 object-cover rounded-lg bg-gray-100"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                      </span>
                      <button 
                        className="text-blue-600 hover:text-blue-700 p-1"
                        onClick={() => window.open(image.image_url, '_blank')}
                        title="Visualizza immagine"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        className="text-green-600 hover:text-green-700 p-1"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = image.image_url;
                          link.download = `image_${image.id}`;
                          link.click();
                        }}
                        title="Scarica immagine"
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-700 p-1"
                        onClick={() => {
                          setShowDeleteConfirm(true);
                          setImageToDelete(image.id);
                        }}
                        disabled={deletingImageId === image.id}
                        title="Elimina immagine"
                      >
                        {deletingImageId === image.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {images.length === 0 && (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  Nessuna immagine caricata
                </div>
              )}
            </div>

            {/* Upload Immagine */}
            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                id="image-upload-input"
              />
              <label
                htmlFor="image-upload-input"
                className={`
                  flex items-center justify-center gap-2 px-4 py-3 
                  border-2 border-dashed border-gray-300 rounded-lg
                  cursor-pointer hover:border-teal-500 hover:bg-teal-50
                  transition-colors
                  ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <Upload size={20} className="text-gray-600" />
                <span className="text-gray-700">
                  {uploading ? `Caricamento in corso... ${uploadProgress}%` : 'Clicca per caricare un\'immagine'}
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
            </div>
          </div>
        </div>
      </div>

      {/* Dialog Conferma Eliminazione */}
      {showDeleteConfirm && (
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
                Sei sicuro di voler eliminare questa immagine? 
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
                disabled={deletingImageId !== null}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deletingImageId !== null ? (
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