'use client';

import React, { useState } from 'react';
import { Eye, Download, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '../../contexts/AuthContext';
import { FileUploaderRegular } from "@uploadcare/react-uploader/next";
import "@uploadcare/react-uploader/core.css";

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

  const auth = useAuth();

  // Funzione per caricare una nuova immagine
  const handleUploadSuccess = async (uploadedFileUrl: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const response = await fetch(`/api/equipments/${equipmentId}/images`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ image_url: uploadedFileUrl }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Errore durante il caricamento dell\'immagine');
      }

      // Notifica il componente padre per aggiornare le immagini
      onImagesUpdated();
      
    } catch (err) {
      console.error('Error saving image:', err);
      alert('Errore durante il salvataggio dell\'immagine');
    }
  };

  // Funzione gestione cambio file Uploadcare
  const handleUploadcareSuccess = (fileInfo: { cdnUrl?: string }) => {
    console.log('Uploadcare success:', fileInfo);
    if (fileInfo && fileInfo.cdnUrl) {
      handleUploadSuccess(fileInfo.cdnUrl);
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
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Data caricamento: {image.created_at ? new Date(image.created_at).toLocaleDateString('it-IT') : '-'}</span>
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

            {/* Uploadcare File Uploader */}
            <div className="mt-4">
              <FileUploaderRegular
                pubkey={process.env.NEXT_PUBLIC_UPLOADER_PUBLIC_KEY || ''}
                onFileUploadSuccess={handleUploadcareSuccess}
                onFileUploadFailed={(e: { status: string; [key: string]: unknown }) => {
                  console.error('Error uploading image:', e);
                  alert('Errore durante il caricamento dell\'immagine');
                }}
                imgOnly={true}
                multiple={false}
                sourceList="local,url,camera,dropbox,gdrive"
              />
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