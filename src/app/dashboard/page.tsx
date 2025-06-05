'use client';

import React, { useState, useEffect } from 'react';
import { Plus, InfoIcon, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import NuovoIntervento from '../interventi/NuovoIntervento';
import { AssistanceIntervention, AssistanceInterventionsApiResponse } from '../../types/assistance-interventions';

// Interface for absences
interface Absence {
  id: number;
  user_uid: string;
  from_date: string;
  to_date: string;
  status: string;
  note: string;
  created_at: string;
  updated_at: string;
  name: string;
  surname: string;
}

interface AbsencesApiResponse {
  data: Absence[];
  meta: {
    total: string;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function DashboardPage() {
  const [showNuovoIntervento, setShowNuovoIntervento] = useState(false);
  const [interventions, setInterventions] = useState<AssistanceIntervention[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();
  const router = useRouter();

  // Get today's date in CET timezone
  const getTodayInCET = () => {
    const now = new Date();
    // Convert to CET (UTC+1) or CEST (UTC+2) depending on DST
    const cetDate = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
    return cetDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  };

  // Fetch interventions data
  const fetchInterventions = async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      // Fetch a larger dataset to get all interventions for filtering
      const response = await fetch('/api/assistance-interventions?skip=100', {
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch interventions');
      }

      const data: AssistanceInterventionsApiResponse = await response.json();
      setInterventions(data.data || []);
    } catch (err) {
      console.error('Error fetching interventions:', err);
      throw err;
    }
  };

  // Fetch absences data for today
  const fetchAbsences = async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const today = getTodayInCET();
      
      // Fetch absences that include today's date
      const params = new URLSearchParams({
        page: '1',
        limit: '100', // Get enough data to cover all possible absences
        status: 'approved' // Only count approved absences
      });

      const response = await fetch(`/api/absences?${params.toString()}`, {
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
          return;
        }
        throw new Error('Failed to fetch absences');
      }

      const data: AbsencesApiResponse = await response.json();
      
      // Filter absences that include today's date
      const todayAbsences = data.data.filter(absence => {
        const fromDate = absence.from_date.split('T')[0];
        const toDate = absence.to_date.split('T')[0];
        return today >= fromDate && today <= toDate;
      });
      
      setAbsences(todayAbsences);
    } catch (err) {
      console.error('Error fetching absences:', err);
      throw err;
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        fetchInterventions(),
        fetchAbsences()
      ]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [auth.token]);

  // Calculate KPIs and filtered data
  const interventiInCarico = interventions.filter(
    intervention => intervention.status_label.toLowerCase() === 'in carico'
  ).length;

  const tecniciAssentiOggi = absences.length;

  const interventiDaAssegnare = interventions.filter(
    intervention => intervention.status_label.toLowerCase() === 'da assegnare'
  ).slice(0, 6); // Limit to 6 for display

  const interventiDaConfermare = interventions.filter(
    intervention => intervention.status_label.toLowerCase() === 'da confermare'
  ).slice(0, 6); // Limit to 6 for display

  // Calculate status counts for all intervention states
  const getStatusCounts = () => {
    const statusCounts = interventions.reduce((acc, intervention) => {
      const statusLabel = intervention.status_label.toLowerCase();
      // Convert status_label to our internal key format (with underscores)
      const statusKey = statusLabel.replace(/\s+/g, '_');
      acc[statusKey] = (acc[statusKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Define status configurations with colors and labels
    const statusConfigs = [
      { key: 'da_assegnare', label: 'Da assegnare', color: 'bg-orange-100 text-orange-800', borderColor: 'border-orange-200' },
      { key: 'attesa_preventivo', label: 'Attesa preventivo', color: 'bg-yellow-100 text-yellow-800', borderColor: 'border-yellow-200' },
      { key: 'attesa_ricambio', label: 'Attesa ricambio', color: 'bg-blue-100 text-blue-800', borderColor: 'border-blue-200' },
      { key: 'in_carico', label: 'In carico', color: 'bg-teal-100 text-teal-800', borderColor: 'border-teal-200' },
      { key: 'da_confermare', label: 'Da confermare', color: 'bg-purple-100 text-purple-800', borderColor: 'border-purple-200' },
      { key: 'completato', label: 'Completato', color: 'bg-green-100 text-green-800', borderColor: 'border-green-200' },
      { key: 'non_completato', label: 'Non completato', color: 'bg-gray-100 text-gray-800', borderColor: 'border-gray-200' },
      { key: 'annullato', label: 'Annullato', color: 'bg-red-100 text-red-800', borderColor: 'border-red-200' },
      { key: 'fatturato', label: 'Fatturato', color: 'bg-emerald-100 text-emerald-800', borderColor: 'border-emerald-200' },
      { key: 'collocamento', label: 'Collocamento', color: 'bg-indigo-100 text-indigo-800', borderColor: 'border-indigo-200' },
    ];

    return statusConfigs.map(config => ({
      ...config,
      count: statusCounts[config.key] || 0
    })).filter(status => status.count > 0); // Only show statuses with count > 0
  };

  const statusData = getStatusCounts();

  // Handle status card click - navigate to interventions page with status filter
  const handleStatusClick = (statusKey: string) => {
    // Navigate to interventions page with status filter (using underscore format)
    router.push(`/interventi?status=${encodeURIComponent(statusKey)}`);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    // Se la data è mancante, null, undefined o stringa vuota, non mostrare nulla
    if (!dateString || dateString.trim() === '') {
      return '-';
    }
    
    try {
      const date = new Date(dateString);
      // Verifica se la data è valida
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      // Verifica se è una data "epoch" (1970) che indica data non impostata
      if (date.getFullYear() <= 1970) {
        return '-';
      }
      
      return date.toLocaleDateString('it-IT');
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={fetchAllData}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg"
            >
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Status</span>
            <InfoIcon size={16} />
          </div>
          <button 
            onClick={() => setShowNuovoIntervento(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Nuovo intervento
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Interventi in carico */}
        <button 
          onClick={() => router.push('/interventi')}
          className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Interventi in carico</h3>
            <ExternalLink size={16} className="text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{interventiInCarico}</div>
        </button>

        {/* Tecnici assenti oggi */}
        <button 
          onClick={() => router.push('/team')}
          className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Tecnici assenti oggi</h3>
            <ExternalLink size={16} className="text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{tecniciAssentiOggi}</div>
        </button>

        {/* Notifiche non lette */}
        <button 
          onClick={() => router.push('/notifiche')}
          className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Notifiche non lette</h3>
            <ExternalLink size={16} className="text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">31</div>
        </button>
      </div>

      {/* Interventi per Stato */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Interventi per stato</h2>
          <button 
            onClick={() => router.push('/interventi')}
            className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-1"
          >
            Vedi tutti
            <ExternalLink size={14} />
          </button>
        </div>
        
        {statusData.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statusData.map((status) => (
              <button
                key={status.key}
                onClick={() => handleStatusClick(status.key)}
                className={`bg-white border ${status.borderColor} rounded-lg p-4 text-left hover:shadow-md transition-all duration-200 hover:scale-105 cursor-pointer group`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                  <ExternalLink size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{status.count}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600">Nessun intervento presente</p>
          </div>
        )}
      </div>

      {/* Tables Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interventi da assegnare */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Interventi da assegnare</h2>

            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Regione sociale
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data programmata
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zona
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {interventiDaAssegnare.length > 0 ? (
                  interventiDaAssegnare.map((intervento) => (
                    <tr key={intervento.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {intervento.company_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(intervento.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {intervento.zone_label}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      Nessun intervento da assegnare
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {Math.min(6, interventiDaAssegnare.length)} di {interventions.filter(i => i.status_label.toLowerCase() === 'da assegnare').length}
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">
                Indietro
              </button>
              <button className="px-3 py-1 text-sm text-teal-600 hover:text-teal-700">
                Avanti
              </button>
            </div>
          </div>
        </div>

        {/* Interventi da confermare */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Interventi da confermare</h2>

            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Regione sociale
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data programmata
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zona
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tecnico
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {interventiDaConfermare.length > 0 ? (
                  interventiDaConfermare.map((intervento) => (
                    <tr key={intervento.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {intervento.company_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(intervento.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {intervento.zone_label}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {intervento.assigned_to_name} {intervento.assigned_to_surname || ''}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      Nessun intervento da confermare
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {Math.min(6, interventiDaConfermare.length)} di {interventions.filter(i => i.status_label.toLowerCase() === 'da confermare').length}
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">
                Indietro
              </button>
              <button className="px-3 py-1 text-sm text-teal-600 hover:text-teal-700">
                Avanti
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Componente Nuovo Intervento */}
      <NuovoIntervento 
        isOpen={showNuovoIntervento}
        onClose={() => {
          setShowNuovoIntervento(false);
          // Ricarica i dati dopo aver creato un nuovo intervento
          fetchAllData();
        }}
      />
    </div>
  );
}
