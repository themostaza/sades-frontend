'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, Filter, Package, MapPin } from 'lucide-react';

interface InventoryItem {
  id: string;
  nomeArticolo: string;
  famiglia: string;
  luogo: string;
  dataArrivo: string;
}

interface Giacenza {
  id: string;
  articolo: string;
  quantita: number;
  ubicazione: string;
  ultimoMovimento: string;
}

interface ArticoloInArrivo {
  id: string;
  articolo: string;
  fornitore: string;
  dataArrivo: string;
  quantita: number;
  status: 'In transito' | 'Arrivato' | 'In ritardo';
}

// Dati di esempio basati sull'immagine Figma
const inventoryMock: InventoryItem[] = [
  {
    id: '1',
    nomeArticolo: 'Nome articolo',
    famiglia: 'Merce',
    luogo: '15 Gen',
    dataArrivo: '15/01/2024'
  },
  {
    id: '2',
    nomeArticolo: 'Nome articolo',
    famiglia: 'Ricambio',
    luogo: 'Magazzino 1A/50',
    dataArrivo: '20/01/2024'
  },
  {
    id: '3',
    nomeArticolo: 'Nome articolo',
    famiglia: 'Ricambio',
    luogo: 'Kit Rational',
    dataArrivo: '22/01/2024'
  },
  {
    id: '4',
    nomeArticolo: 'Nome articolo',
    famiglia: 'Ricambio',
    luogo: 'Kit Rational',
    dataArrivo: '25/01/2024'
  },
  {
    id: '5',
    nomeArticolo: 'Nome articolo',
    famiglia: 'Ricambio',
    luogo: 'Kit Rational',
    dataArrivo: '28/01/2024'
  },
  {
    id: '6',
    nomeArticolo: 'Nome articolo',
    famiglia: 'Ricambio',
    luogo: 'Kit Rational',
    dataArrivo: '30/01/2024'
  },
  {
    id: '7',
    nomeArticolo: 'Nome articolo',
    famiglia: 'Ricambio',
    luogo: 'Kit Rational',
    dataArrivo: '02/02/2024'
  }
];

// Dati di esempio per le giacenze
const giacenzeMock: Giacenza[] = [
  {
    id: '1',
    articolo: 'Filtro aria HEPA',
    quantita: 25,
    ubicazione: 'Magazzino A - Scaffale 1',
    ultimoMovimento: '15/01/2024'
  },
  {
    id: '2',
    articolo: 'Guarnizione porta',
    quantita: 12,
    ubicazione: 'Magazzino B - Scaffale 3',
    ultimoMovimento: '18/01/2024'
  },
  {
    id: '3',
    articolo: 'Resistenza riscaldamento',
    quantita: 8,
    ubicazione: 'Magazzino A - Scaffale 2',
    ultimoMovimento: '20/01/2024'
  }
];

// Dati di esempio per articoli in arrivo
const articoliInArrivoMock: ArticoloInArrivo[] = [
  {
    id: '1',
    articolo: 'Compressore frigorifero',
    fornitore: 'Fornitore ABC',
    dataArrivo: '25/01/2024',
    quantita: 5,
    status: 'In transito'
  },
  {
    id: '2',
    articolo: 'Termostato digitale',
    fornitore: 'Fornitore XYZ',
    dataArrivo: '28/01/2024',
    quantita: 15,
    status: 'Arrivato'
  },
  {
    id: '3',
    articolo: 'Ventola condensatore',
    fornitore: 'Fornitore DEF',
    dataArrivo: '20/01/2024',
    quantita: 3,
    status: 'In ritardo'
  }
];

export default function InventarioPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredInventory, setFilteredInventory] = useState(inventoryMock);
  const [selectedFamiglia, setSelectedFamiglia] = useState('');
  const [selectedLuogo, setSelectedLuogo] = useState('');
  const [showGiacenzeSection, setShowGiacenzeSection] = useState(false);
  const [showArticoliInArrivoSection, setShowArticoliInArrivoSection] = useState(false);
  
  // Stati per le sezioni aggiuntive
  const [filteredGiacenze] = useState(giacenzeMock);
  const [filteredArticoliInArrivo] = useState(articoliInArrivoMock);

  const getStatusColor = (status: ArticoloInArrivo['status']) => {
    switch (status) {
      case 'Arrivato':
        return 'bg-green-100 text-green-800';
      case 'In transito':
        return 'bg-blue-100 text-blue-800';
      case 'In ritardo':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    filterInventory(value, selectedFamiglia, selectedLuogo);
  };

  const handleFamigliaFilter = (famiglia: string) => {
    setSelectedFamiglia(famiglia);
    filterInventory(searchTerm, famiglia, selectedLuogo);
  };

  const handleLuogoFilter = (luogo: string) => {
    setSelectedLuogo(luogo);
    filterInventory(searchTerm, selectedFamiglia, luogo);
  };

  const filterInventory = (search: string, famiglia: string, luogo: string) => {
    let filtered = inventoryMock;

    if (search.trim()) {
      filtered = filtered.filter(
        (item) =>
          item.nomeArticolo.toLowerCase().includes(search.toLowerCase()) ||
          item.famiglia.toLowerCase().includes(search.toLowerCase()) ||
          item.luogo.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (famiglia && famiglia !== '') {
      filtered = filtered.filter((item) => item.famiglia === famiglia);
    }

    if (luogo && luogo !== '') {
      filtered = filtered.filter((item) => item.luogo === luogo);
    }

    setFilteredInventory(filtered);
  };

  const getQuantitaBassaCount = () => {
    return giacenzeMock.filter(giacenza => giacenza.quantita < 10).length;
  };

  const getInRitardoCount = () => {
    return articoliInArrivoMock.filter(articolo => articolo.status === 'In ritardo').length;
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Inventario</h1>
      </div>

      {/* Search and filters */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="*Nome articolo*"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          
          <div className="relative">
            <select
              value={selectedFamiglia}
              onChange={(e) => handleFamigliaFilter(e.target.value)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8"
            >
              <option value="">Famiglia</option>
              <option value="Merce">Merce</option>
              <option value="Ricambio">Ricambio</option>
              <option value="Attrezzatura">Attrezzatura</option>
            </select>
            <Package className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>

          <div className="relative">
            <select
              value={selectedLuogo}
              onChange={(e) => handleLuogoFilter(e.target.value)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8"
            >
              <option value="">Luogo / Data arrivo</option>
              <option value="15 Gen">15 Gen</option>
              <option value="Magazzino 1A/50">Magazzino 1A/50</option>
              <option value="Kit Rational">Kit Rational</option>
            </select>
            <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Articolo <ChevronDown className="inline ml-1" size={12} />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Famiglia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Luogo / Data arrivo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.nomeArticolo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {item.famiglia}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {item.luogo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Pagina 1 di 3
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

      {/* Giacenze section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <button
          onClick={() => setShowGiacenzeSection(!showGiacenzeSection)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-medium text-gray-900">Giacenze</h2>
          <ChevronDown 
            className={`transform transition-transform ${showGiacenzeSection ? 'rotate-180' : ''}`} 
            size={20} 
          />
        </button>
        
        {showGiacenzeSection && (
          <div className="border-t border-gray-200">
            {/* Filters and actions for giacenze */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cerca articolo..."
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  
                  <div className="relative">
                    <select className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8">
                      <option value="">Filtra per ubicazione</option>
                      <option value="Magazzino A">Magazzino A</option>
                      <option value="Magazzino B">Magazzino B</option>
                    </select>
                    <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    Tutte le giacenze
                  </button>
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                    Quantità bassa ({getQuantitaBassaCount()})
                  </span>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    Esporta
                  </button>
                </div>
              </div>
            </div>

            {/* Giacenze table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Articolo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantità
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ubicazione
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ultimo movimento
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGiacenze.map((giacenza) => (
                    <tr key={giacenza.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {giacenza.articolo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className={`font-medium ${giacenza.quantita < 10 ? 'text-orange-600' : 'text-gray-900'}`}>
                          {giacenza.quantita}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {giacenza.ubicazione}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {giacenza.ultimoMovimento}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination for giacenze */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Pagina 1 di 5
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
      </div>

      {/* Articoli in arrivo section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowArticoliInArrivoSection(!showArticoliInArrivoSection)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-medium text-gray-900">Articoli in arrivo</h2>
          <ChevronDown 
            className={`transform transition-transform ${showArticoliInArrivoSection ? 'rotate-180' : ''}`} 
            size={20} 
          />
        </button>
        
        {showArticoliInArrivoSection && (
          <div className="border-t border-gray-200">
            {/* Filters and actions for articoli in arrivo */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cerca articolo..."
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  
                  <div className="relative">
                    <select className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8">
                      <option value="">Filtra per fornitore</option>
                      <option value="Fornitore ABC">Fornitore ABC</option>
                      <option value="Fornitore XYZ">Fornitore XYZ</option>
                      <option value="Fornitore DEF">Fornitore DEF</option>
                    </select>
                    <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    Tutti gli arrivi
                  </button>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    In transito
                  </span>
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                    In ritardo ({getInRitardoCount()})
                  </span>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    Arrivati
                  </button>
                </div>
              </div>
            </div>

            {/* Articoli in arrivo table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Articolo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fornitore
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data arrivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantità
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredArticoliInArrivo.map((articolo) => (
                    <tr key={articolo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {articolo.articolo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {articolo.fornitore}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {articolo.dataArrivo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {articolo.quantita}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            articolo.status
                          )}`}
                        >
                          {articolo.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination for articoli in arrivo */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Pagina 1 di 8
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
      </div>
    </div>
  );
}
