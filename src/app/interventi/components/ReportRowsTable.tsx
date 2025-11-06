'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { ReportRow, InterventionType, UpdateReportRowRequest } from '../../../types/intervention-reports';

interface ReportRowsTableProps {
  interventionId: number;
}

export default function ReportRowsTable({ interventionId }: ReportRowsTableProps) {
  const { token } = useAuth();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [interventionTypes, setInterventionTypes] = useState<InterventionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRowId, setUpdatingRowId] = useState<number | null>(null);

  // Fetch report rows
  useEffect(() => {
    if (token) {
      fetchReportRows();
      fetchInterventionTypes();
    }
  }, [interventionId, token]);

  const fetchReportRows = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching report rows for intervention:', interventionId);
      
      const response = await fetch(`/api/assistance-interventions/${interventionId}/report-rows`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 Report rows response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error response:', errorData);
        throw new Error(errorData.error || 'Errore nel caricamento delle righe del rapporto');
      }

      const data = await response.json();
      console.log('✅ Report rows data received:', data);
      console.log('📊 Number of rows:', Array.isArray(data) ? data.length : 'not an array');
      
      setRows(data);
    } catch (err) {
      console.error('💥 Error fetching report rows:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const fetchInterventionTypes = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/intervention-types', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento dei tipi intervento');
      }

      const data = await response.json();
      setInterventionTypes(data);
    } catch (err) {
      console.error('Error fetching intervention types:', err);
    }
  };

  const handleInterventionTypeChange = async (rowId: number, newTypeId: number) => {
    if (!token) return;
    
    try {
      setUpdatingRowId(rowId);
      
      const payload: UpdateReportRowRequest = {
        intervention_type_id: newTypeId,
      };

      const response = await fetch(
        `/api/assistance-interventions/${interventionId}/report-rows/${rowId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error('Errore nell\'aggiornamento della riga');
      }

      // Update local state
      setRows(prevRows =>
        prevRows.map(row =>
          row.id === rowId
            ? { ...row, intervention_type_id: newTypeId }
            : row
        )
      );
    } catch (err) {
      console.error('Error updating report row:', err);
      alert('Errore nell\'aggiornamento della tipologia intervento');
    } finally {
      setUpdatingRowId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Caricamento righe rapporto...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // Se non ci sono righe, non mostrare nulla
  // (probabilmente il backend non ha ancora l'endpoint implementato
  // o non ci sono ancora righe del rapporto generate)
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">
          Righe Rapporto per Fatturazione
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Modifica la tipologia intervento per ogni riga prima di inviare in fatturazione
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Codice Articolo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descrizione
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantità
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipologia Intervento
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {row.article_code}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {row.article_description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {row.quantity}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="relative">
                    <select
                      value={row.intervention_type_id}
                      onChange={(e) => handleInterventionTypeChange(row.id, parseInt(e.target.value))}
                      disabled={updatingRowId === row.id}
                      className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {interventionTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    {updatingRowId === row.id && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Totale righe: {rows.length}
        </p>
      </div>
    </div>
  );
}

