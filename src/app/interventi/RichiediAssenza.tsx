'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface RichiediAssenzaProps {
  isOpen: boolean;
  onClose: () => void;
  userInfo: {
    id: string;
    name: string;
    surname: string;
  };
}

export default function RichiediAssenza({ isOpen, onClose, userInfo }: RichiediAssenzaProps) {
  const [loading, setLoading] = useState(false);
  const [absenceData, setAbsenceData] = useState({
    from_date: '',
    to_date: '',
    note: ''
  });

  const auth = useAuth();

  const handleClose = () => {
    setAbsenceData({
      from_date: '',
      to_date: '',
      note: ''
    });
    onClose();
  };

  const handleSubmit = async () => {
    if (!absenceData.from_date || !absenceData.to_date) {
      console.error('Campi obbligatori mancanti');
      return;
    }

    try {
      setLoading(true);
      
      const token = auth.token;
      if (!token) {
        console.error('Token non trovato, effettuando logout');
        auth.logout();
        return;
      }

      console.log('🔄 Creating new absence request:', absenceData);

      const response = await fetch(`/api/users/${userInfo.id}/absences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          from_date: absenceData.from_date,
          to_date: absenceData.to_date,
          note: absenceData.note || 'Richiesta di assenza'
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Sessione scaduta, effettuando logout');
          auth.logout();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('Errore API:', errorData);
        throw new Error(errorData.message || 'Errore durante la richiesta');
      }

      console.log('✅ Richiesta di assenza inviata con successo');
      handleClose();
      
    } catch (error) {
      console.error('Errore durante la richiesta di assenza:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Plus className="text-teal-600" size={20} />
            <h3 className="text-lg font-medium text-gray-900">Richiedi assenza</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tecnico
            </label>
            <input
              type="text"
              value={`${userInfo.name} ${userInfo.surname}`}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data inizio *
            </label>
            <input
              type="date"
              value={absenceData.from_date}
              onChange={(e) => setAbsenceData(prev => ({ ...prev, from_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data fine *
            </label>
            <input
              type="date"
              value={absenceData.to_date}
              min={absenceData.from_date || undefined}
              onChange={(e) => setAbsenceData(prev => ({ ...prev, to_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
              disabled={loading}
            />
            {absenceData.from_date && absenceData.to_date && absenceData.to_date < absenceData.from_date && (
              <p className="mt-1 text-sm text-red-600">
                La data di fine non può essere antecedente alla data di inizio
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note
            </label>
            <textarea
              value={absenceData.note}
              onChange={(e) => setAbsenceData(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Motivo dell'assenza (es. corso di formazione, ferie, malattia)..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 resize-none"
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              loading || 
              !absenceData.from_date || 
              !absenceData.to_date ||
              absenceData.to_date < absenceData.from_date
            }
            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Invio richiesta...' : 'Richiedi assenza'}
          </button>
        </div>
      </div>
    </div>
  );
} 