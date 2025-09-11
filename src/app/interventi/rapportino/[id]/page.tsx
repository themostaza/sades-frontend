'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import DettaglioRapportino from './DettaglioRapportino';
import { InterventionReportDetail } from '../../../../types/intervention-reports';
import type { AssistanceInterventionDetail } from '../../../../types/assistance-interventions';

export default function RapportinoDetailPage() {
  const params = useParams();
  const { token } = useAuth();
  const reportId = params.id as string;
  const [reportData, setReportData] = useState<InterventionReportDetail | null>(null);
  const [interventionData, setInterventionData] = useState<AssistanceInterventionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reportId && token) {
      fetchReportData();
    }
  }, [reportId, token]);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch(`/api/intervention-reports/${reportId}`, { headers });
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Rapportino non trovato');
        } else {
          setError('Errore nel caricamento del rapportino');
        }
        return;
      }

      const reportData: InterventionReportDetail = await response.json();
      setReportData(reportData);

      // Carica anche i dati dell'intervento per ottenere il nome del cliente
      if (reportData.intervention_id) {
        try {
          const interventionResponse = await fetch(`/api/assistance-interventions/${reportData.intervention_id}`, { headers });
          if (interventionResponse.ok) {
            const interventionData: AssistanceInterventionDetail = await interventionResponse.json();
            setInterventionData(interventionData);
          }
        } catch (interventionError) {
          console.error('Errore nel caricamento dei dati intervento:', interventionError);
          // Non bloccare l'app se fallisce il caricamento dell'intervento
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento del rapportino:', error);
      setError('Errore nel caricamento del rapportino');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento rapportino...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Errore</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
            >
              Torna indietro
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  return <DettaglioRapportino reportData={reportData} interventionData={interventionData} />;
} 