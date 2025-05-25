'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, Plus } from 'lucide-react';

interface Cliente {
  id: string;
  ragioneSociale: string;
  codiceCliente: string;
  apparecchiature: string;
}

// Dati di esempio basati sull'immagine Figma
const clientiMock: Cliente[] = [
  {
    id: '1',
    ragioneSociale: 'Ragione sociale',
    codiceCliente: 'Lorem ipsum',
    apparecchiature: 'Vedi apparecchiature'
  },
  {
    id: '2',
    ragioneSociale: 'Ragione sociale',
    codiceCliente: 'Lorem ipsum',
    apparecchiature: 'Vedi apparecchiature'
  },
  {
    id: '3',
    ragioneSociale: 'Ragione sociale',
    codiceCliente: 'Lorem ipsum',
    apparecchiature: 'Vedi apparecchiature'
  },
  {
    id: '4',
    ragioneSociale: 'Ragione sociale',
    codiceCliente: 'Lorem ipsum',
    apparecchiature: 'Vedi apparecchiature'
  },
  {
    id: '5',
    ragioneSociale: 'Ragione sociale',
    codiceCliente: 'Lorem ipsum',
    apparecchiature: 'Vedi apparecchiature'
  },
  {
    id: '6',
    ragioneSociale: 'Ragione sociale',
    codiceCliente: 'Lorem ipsum',
    apparecchiature: 'Vedi apparecchiature'
  },
  {
    id: '7',
    ragioneSociale: 'Ragione sociale',
    codiceCliente: 'Lorem ipsum',
    apparecchiature: 'Vedi apparecchiature'
  },
  {
    id: '8',
    ragioneSociale: 'Ragione sociale',
    codiceCliente: 'Lorem ipsum',
    apparecchiature: 'Vedi apparecchiature'
  }
];

export default function ClientiPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClienti, setFilteredClienti] = useState(clientiMock);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      const filtered = clientiMock.filter(
        (cliente) =>
          cliente.ragioneSociale.toLowerCase().includes(value.toLowerCase()) ||
          cliente.codiceCliente.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredClienti(filtered);
    } else {
      setFilteredClienti(clientiMock);
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Clienti</h1>
        <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus size={16} />
          Aggiungi nuovo
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca cliente, codice cliente"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span>Ragione sociale</span>
              <ChevronDown size={16} />
            </button>
          </div>
          
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span>Codice cliente</span>
              <ChevronDown size={16} />
            </button>
          </div>
          
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span>Apparecchiature</span>
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
                  Ragione sociale
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Codice cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Apparecchiature
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClienti.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cliente.ragioneSociale}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {cliente.codiceCliente}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-teal-600 hover:text-teal-700 underline">
                      {cliente.apparecchiature}
                    </button>
                  </td>
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
              Precedente
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
