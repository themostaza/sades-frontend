'use client';

import React, { useState } from 'react';
import { Plus, InfoIcon, ExternalLink, ChevronDown } from 'lucide-react';
import NuovoIntervento from '../interventi/NuovoIntervento';

interface Intervento {
  id: string;
  ragioneSociale: string;
  data: string;
  zona: string;
  tecnico: string;
}

// Mock data per interventi da assegnare
const interventiDaAssegnare: Intervento[] = [
  {
    id: '1',
    ragioneSociale: 'Regione sociale',
    data: '26/09/2024',
    zona: 'Zona blablablabla...',
    tecnico: ''
  },
  {
    id: '2',
    ragioneSociale: 'Regione sociale',
    data: '26/09/2024',
    zona: 'Zona blablablabla...',
    tecnico: ''
  },
  {
    id: '3',
    ragioneSociale: 'Regione sociale',
    data: '26/09/2024',
    zona: 'Zona blablablabla...',
    tecnico: ''
  },
  {
    id: '4',
    ragioneSociale: 'Regione sociale',
    data: '26/09/2024',
    zona: 'Zona blablablabla...',
    tecnico: ''
  },
  {
    id: '5',
    ragioneSociale: 'Regione sociale',
    data: '26/09/2024',
    zona: 'Zona blablablabla...',
    tecnico: ''
  },
  {
    id: '6',
    ragioneSociale: 'Regione sociale',
    data: '26/09/2024',
    zona: 'Zona blablablabla...',
    tecnico: ''
  }
];

// Mock data per interventi da confermare
const interventiDaConfermare: Intervento[] = [
  {
    id: '7',
    ragioneSociale: 'Regione sociale',
    data: '26/09/2024',
    zona: 'Zona blablablabla...',
    tecnico: 'Nome Cognome'
  },
  {
    id: '8',
    ragioneSociale: 'Regione sociale',
    data: '26/09/2024',
    zona: 'Zona blablablabla...',
    tecnico: 'Nome Cognome'
  },
  {
    id: '9',
    ragioneSociale: 'Regione sociale',
    data: '26/09/2024',
    zona: 'Zona blablablabla...',
    tecnico: 'Nome Cognome'
  },
  {
    id: '10',
    ragioneSociale: 'Regione sociale',
    data: '26/09/2024',
    zona: 'Zona blablablabla...',
    tecnico: 'Nome Cognome'
  },
  {
    id: '11',
    ragioneSociale: 'Regione sociale',
    data: '26/09/2024',
    zona: 'Zona blablablabla...',
    tecnico: 'Nome Cognome'
  },
  {
    id: '12',
    ragioneSociale: 'Regione sociale',
    data: '26/09/2024',
    zona: 'Zona blablablabla...',
    tecnico: 'Nome Cognome'
  }
];

export default function DashboardPage() {
  const [showNuovoIntervento, setShowNuovoIntervento] = useState(false);

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
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Interventi in carico</h3>
            <ExternalLink size={16} className="text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">58</div>
        </div>

        {/* Tecnici assenti oggi */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Tecnici assenti oggi</h3>
            <ExternalLink size={16} className="text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">2</div>
        </div>

        {/* Notifiche non lette */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Notifiche non lette</h3>
            <ExternalLink size={16} className="text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">31</div>
        </div>
      </div>

      {/* Tables Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interventi da assegnare */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Interventi da assegnare</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Regione sociale</span>
                <ChevronDown size={16} className="text-gray-400" />
              </div>
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
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zona
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {interventiDaAssegnare.map((intervento) => (
                  <tr key={intervento.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {intervento.ragioneSociale}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {intervento.data}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {intervento.zona}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Pagina 1 di 2
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Data</span>
                <ChevronDown size={16} className="text-gray-400" />
              </div>
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
                    Data
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
                {interventiDaConfermare.map((intervento) => (
                  <tr key={intervento.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {intervento.ragioneSociale}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {intervento.data}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {intervento.zona}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {intervento.tecnico}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Pagina 1 di 2
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
        onClose={() => setShowNuovoIntervento(false)}
      />
    </div>
  );
}
