'use client';

import React, { useState } from 'react';
import { Search, Calendar, ChevronDown, Plus, InfoIcon } from 'lucide-react';
import NuovoIntervento from './NuovoIntervento';
import CalendarioView from './CalendarioView';

interface Intervento {
  id: string;
  ragioneSociale: string;
  data: string;
  orario: string;
  zona: string;
  tecnico: string;
  status: 'In carico' | 'Completato' | 'Da assegnare';
}

// Dati di esempio basati sull'immagine Figma
const interventimock: Intervento[] = [
  {
    id: '1',
    ragioneSociale: 'Regione sociali...',
    data: '26 Gen',
    orario: 'Mattina',
    zona: 'Zona blablablabla...',
    tecnico: 'Nome Cognome',
    status: 'In carico'
  },
  {
    id: '2',
    ragioneSociale: 'Regione sociali...',
    data: '26 Gen',
    orario: 'Mattina',
    zona: 'Zona blablablabla...',
    tecnico: 'Nome Cognome',
    status: 'Completato'
  },
  {
    id: '3',
    ragioneSociale: 'Regione sociali...',
    data: '26 Gen',
    orario: '12:20',
    zona: 'Zona blablablabla...',
    tecnico: 'Nome Cognome',
    status: 'In carico'
  },
  {
    id: '4',
    ragioneSociale: 'Regione sociali...',
    data: '26 Gen',
    orario: '13:40',
    zona: 'Zona blablablabla...',
    tecnico: 'Nome Cognome',
    status: 'In carico'
  },
  {
    id: '5',
    ragioneSociale: 'Regione sociali...',
    data: '26 Gen',
    orario: 'Pomeriggio',
    zona: 'Zona blablablabla...',
    tecnico: 'Nome Cognome',
    status: 'Completato'
  },
  {
    id: '6',
    ragioneSociale: 'Regione sociali...',
    data: '26 Gen',
    orario: 'Pomeriggio',
    zona: 'Zona blablablabla...',
    tecnico: 'Nome Cognome',
    status: 'In carico'
  },
  {
    id: '7',
    ragioneSociale: 'Regione sociali...',
    data: '26 Gen',
    orario: 'Pomeriggio',
    zona: 'Zona blablablabla...',
    tecnico: '-',
    status: 'Da assegnare'
  },
  {
    id: '8',
    ragioneSociale: 'Regione sociali...',
    data: '26 Gen',
    orario: 'Pomeriggio',
    zona: 'Zona blablablabla...',
    tecnico: 'Nome Cognome',
    status: 'In carico'
  },
  {
    id: '9',
    ragioneSociale: 'Regione sociali...',
    data: '26 Gen',
    orario: 'Pomeriggio',
    zona: 'Zona blablablabla...',
    tecnico: 'Nome Cognome',
    status: 'In carico'
  },
  {
    id: '10',
    ragioneSociale: 'Regione sociali...',
    data: '26 Gen',
    orario: 'Pomeriggio',
    zona: 'Zona blablablabla...',
    tecnico: 'Nome Cognome',
    status: 'In carico'
  }
];

export default function InterventiPage() {
    const [searchTerm, setSearchTerm] = useState('');  const [filteredInterventi, setFilteredInterventi] = useState(interventimock);  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista');  const [showNuovoIntervento, setShowNuovoIntervento] = useState(false);

  const getStatusColor = (status: Intervento['status']) => {
    switch (status) {
      case 'In carico':
        return 'bg-teal-100 text-teal-800';
      case 'Completato':
        return 'bg-pink-100 text-pink-800';
      case 'Da assegnare':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      const filtered = interventimock.filter(
        (intervento) =>
          intervento.ragioneSociale.toLowerCase().includes(value.toLowerCase()) ||
          intervento.tecnico.toLowerCase().includes(value.toLowerCase()) ||
          intervento.zona.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredInterventi(filtered);
    } else {
      setFilteredInterventi(interventimock);
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Interventi</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Status</span>
            <InfoIcon size={16} />
          </div>
                    <button             onClick={() => setShowNuovoIntervento(true)}            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"          >            <Plus size={16} />            Nuovo Intervento          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Search and filters row */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca Ragione sociale, descrizione, tecnico"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Calendar size={16} />
              <span>Filtra per data</span>
              <ChevronDown size={16} />
            </button>
          </div>
          
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span>Filtra per zona</span>
              <ChevronDown size={16} />
            </button>
          </div>
          {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setViewMode('lista')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'lista'
                ? 'bg-teal-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Lista
          </button>
          <button
            onClick={() => setViewMode('calendario')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'calendario'
                ? 'bg-teal-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Calendario
          </button>
        </div>
        </div>

        
      </div>

      {/* Table */}
      {viewMode === 'lista' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ragione sociale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zona
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tecnico
                  </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">                    Status                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInterventi.map((intervento) => (
                  <tr key={intervento.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {intervento.ragioneSociale}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {intervento.data}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {intervento.orario}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {intervento.zona}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {intervento.tecnico}
                    </td>
                                        <td className="px-6 py-4 whitespace-nowrap">                      <span                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(                          intervento.status                        )}`}                      >                        {intervento.status}                      </span>                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Pagina 1 di 10
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
      )}

      {/* Calendar view placeholder */}
      {viewMode === 'calendario' && (
        <CalendarioView interventi={filteredInterventi} />
      )}

      {/* Componente Nuovo Intervento */}
      <NuovoIntervento
        isOpen={showNuovoIntervento}
        onClose={() => setShowNuovoIntervento(false)}
      />
    </div>
  );
} 