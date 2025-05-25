'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, Plus } from 'lucide-react';

interface Apparecchiatura {
  id: string;
  nome: string;
  proprieta: string;
  marchio: string;
  modello: string;
  sottofamiglia: string;
  numeriSeriali: string;
}

// Dati di esempio basati sull'immagine Figma
const apparecchiatureMock: Apparecchiatura[] = [
  {
    id: '1',
    nome: 'Nome apparecchiatu...',
    proprieta: 'Owner name',
    marchio: 'Electrolux',
    modello: 'H2190831',
    sottofamiglia: 'Forno',
    numeriSeriali: 'XX1234567'
  },
  {
    id: '2',
    nome: 'Nome apparecchiatu...',
    proprieta: 'Owner name',
    marchio: 'Electrolux',
    modello: 'H2190831',
    sottofamiglia: 'Frigo',
    numeriSeriali: '-'
  },
  {
    id: '3',
    nome: 'Nome apparecchiatu...',
    proprieta: 'Owner name',
    marchio: 'Electrolux',
    modello: 'H2190831',
    sottofamiglia: 'Frigo',
    numeriSeriali: 'XX1234567, XX1234567'
  },
  {
    id: '4',
    nome: 'Nome apparecchiatu...',
    proprieta: 'Owner name',
    marchio: 'Electrolux',
    modello: 'H2190831',
    sottofamiglia: 'Frigo',
    numeriSeriali: 'XX1234567'
  },
  {
    id: '5',
    nome: 'Nome apparecchiatu...',
    proprieta: 'Owner name',
    marchio: 'Electrolux',
    modello: 'H2190831',
    sottofamiglia: 'Frigo',
    numeriSeriali: 'XX1234567, XX1234567, XX1234567'
  },
  {
    id: '6',
    nome: 'Nome apparecchiatu...',
    proprieta: 'Owner name',
    marchio: 'Electrolux',
    modello: 'H2190831',
    sottofamiglia: 'Frigo',
    numeriSeriali: 'XX1234567'
  },
  {
    id: '7',
    nome: 'Nome apparecchiatu...',
    proprieta: 'Owner name',
    marchio: 'Electrolux',
    modello: 'H2190831',
    sottofamiglia: 'Frigo',
    numeriSeriali: 'XX1234567'
  },
  {
    id: '8',
    nome: 'Nome apparecchiatu...',
    proprieta: 'Owner name',
    marchio: 'Electrolux',
    modello: 'H2190831',
    sottofamiglia: 'Frigo',
    numeriSeriali: 'XX1234567'
  }
];

export default function ApparecchiaturePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredApparecchiature, setFilteredApparecchiature] = useState(apparecchiatureMock);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      const filtered = apparecchiatureMock.filter(
        (apparecchiatura) =>
          apparecchiatura.nome.toLowerCase().includes(value.toLowerCase()) ||
          apparecchiatura.marchio.toLowerCase().includes(value.toLowerCase()) ||
          apparecchiatura.modello.toLowerCase().includes(value.toLowerCase()) ||
          apparecchiatura.sottofamiglia.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredApparecchiature(filtered);
    } else {
      setFilteredApparecchiature(apparecchiatureMock);
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Apparecchiature</h1>
        <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus size={16} />
          Aggiungi nuova
        </button>
      </div>

      {/* Search and filters */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca seriale, marchio, categoria, modello o nome apparecchiatura"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span>Apparecchiatura</span>
              <ChevronDown size={16} />
            </button>
          </div>
          
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span>Proprietà</span>
              <ChevronDown size={16} />
            </button>
          </div>
          
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span>Marchio</span>
              <ChevronDown size={16} />
            </button>
          </div>
          
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span>Modello</span>
              <ChevronDown size={16} />
            </button>
          </div>
          
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span>Sottofamiglia</span>
              <ChevronDown size={16} />
            </button>
          </div>
          
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span>Numeri seriali associati</span>
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Apparecchiatura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proprietà
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marchio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modello
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sottofamiglia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Numeri seriali associati
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredApparecchiature.map((apparecchiatura) => (
                <tr key={apparecchiatura.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {apparecchiatura.nome}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {apparecchiatura.proprieta}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {apparecchiatura.marchio}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {apparecchiatura.modello}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {apparecchiatura.sottofamiglia}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {apparecchiatura.numeriSeriali}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Pagina 1 di 56
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
  );
}
