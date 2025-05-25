'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, Plus, Filter, User, Calendar } from 'lucide-react';

interface TeamMember {
  id: string;
  nominativo: string;
  codiceFiscale: string;
  email: string;
  telefono: string;
  ruolo: string;
  status: 'Attivo' | 'Inattivo';
}

interface Assenza {
  id: string;
  nominativo: string;
  data: string;
  status: 'In attesa' | 'Approvata' | 'Rifiutata';
}

// Dati di esempio basati sull'immagine Figma
const teamMock: TeamMember[] = [
  {
    id: '1',
    nominativo: 'Maria Rossi',
    codiceFiscale: 'LRMPSM47T56H888I',
    email: 'maria.rossi@sades.com',
    telefono: '335 9827635',
    ruolo: 'Amministrazione',
    status: 'Attivo'
  },
  {
    id: '2',
    nominativo: 'Luca Bianchi',
    codiceFiscale: 'LRMPSM47T56H888I',
    email: 'maria.rossi@sades.com',
    telefono: '335 9827635',
    ruolo: 'Tecnico',
    status: 'Attivo'
  },
  {
    id: '3',
    nominativo: 'Lucia Verdi',
    codiceFiscale: 'LRMPSM47T56H888I',
    email: 'maria.rossi@sades.com',
    telefono: '335 9827635',
    ruolo: 'Amministrazione',
    status: 'Attivo'
  },
  {
    id: '4',
    nominativo: 'Paolo De Rossi',
    codiceFiscale: 'LRMPSM47T56H888I',
    email: 'maria.rossi@sades.com',
    telefono: '335 9827635',
    ruolo: 'Ufficio Tecnico',
    status: 'Attivo'
  },
  {
    id: '5',
    nominativo: 'Filippo Bianchi',
    codiceFiscale: 'LRMPSM47T56H888I',
    email: 'maria.rossi@sades.com',
    telefono: '335 9827635',
    ruolo: 'Magazzino',
    status: 'Attivo'
  },
  {
    id: '6',
    nominativo: 'Giulia Neri',
    codiceFiscale: 'LRMPSM47T56H888I',
    email: 'maria.rossi@sades.com',
    telefono: '335 9827635',
    ruolo: 'Tecnico',
    status: 'Inattivo'
  }
];

// Dati di esempio per le assenze
const assenzeMock: Assenza[] = [
  {
    id: '1',
    nominativo: 'Nome Cognome',
    data: '10/06/2024',
    status: 'In attesa'
  },
  {
    id: '2',
    nominativo: 'Nome Cognome',
    data: '10/06/2024',
    status: 'Approvata'
  },
  {
    id: '3',
    nominativo: 'Nome Cognome',
    data: '10/06/2024-11/06/2024',
    status: 'Approvata'
  },
  {
    id: '4',
    nominativo: 'Nome Cognome',
    data: '04/08/2024',
    status: 'Approvata'
  },
  {
    id: '5',
    nominativo: 'Nome Cognome',
    data: '04/08/2024',
    status: 'Rifiutata'
  }
];

export default function TeamPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTeam, setFilteredTeam] = useState(teamMock);
  const [selectedRole, setSelectedRole] = useState('');
  const [showAssenzeSection, setShowAssenzeSection] = useState(false);
  
  // Stati per la sezione assenze
  const [filteredAssenze, setFilteredAssenze] = useState(assenzeMock);
  const [selectedNominativo, setSelectedNominativo] = useState('');
  const [selectedData, setSelectedData] = useState('');

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'Attivo':
        return 'bg-green-100 text-green-800';
      case 'Inattivo':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAssenzaStatusColor = (status: Assenza['status']) => {
    switch (status) {
      case 'In attesa':
        return 'bg-yellow-100 text-yellow-800';
      case 'Approvata':
        return 'bg-green-100 text-green-800';
      case 'Rifiutata':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    filterTeam(value, selectedRole);
  };

  const handleRoleFilter = (role: string) => {
    setSelectedRole(role);
    filterTeam(searchTerm, role);
  };

  const filterTeam = (search: string, role: string) => {
    let filtered = teamMock;

    if (search.trim()) {
      filtered = filtered.filter(
        (member) =>
          member.nominativo.toLowerCase().includes(search.toLowerCase()) ||
          member.codiceFiscale.toLowerCase().includes(search.toLowerCase()) ||
          member.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (role && role !== '') {
      filtered = filtered.filter((member) => member.ruolo === role);
    }

    setFilteredTeam(filtered);
  };

  const filterAssenze = (nominativo: string, data: string) => {
    let filtered = assenzeMock;

    if (nominativo && nominativo !== '') {
      filtered = filtered.filter((assenza) => assenza.nominativo === nominativo);
    }

    if (data && data !== '') {
      filtered = filtered.filter((assenza) => assenza.data.includes(data));
    }

    setFilteredAssenze(filtered);
  };

  const handleNominativoFilter = (nominativo: string) => {
    setSelectedNominativo(nominativo);
    filterAssenze(nominativo, selectedData);
  };

  const handleDataFilter = (data: string) => {
    setSelectedData(data);
    filterAssenze(selectedNominativo, data);
  };

  const getInAttesaCount = () => {
    return assenzeMock.filter(assenza => assenza.status === 'In attesa').length;
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Team</h1>
        <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus size={16} />
          Aggiungi nuovo
        </button>
      </div>

      {/* Search and filters */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca nome, cognome, codice fiscale"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          
          <div className="relative">
            <select
              value={selectedRole}
              onChange={(e) => handleRoleFilter(e.target.value)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8"
            >
              <option value="">Filtra per ruolo</option>
              <option value="Amministrazione">Amministrazione</option>
              <option value="Tecnico">Tecnico</option>
              <option value="Ufficio Tecnico">Ufficio Tecnico</option>
              <option value="Magazzino">Magazzino</option>
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
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
                  Nominativo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Codice fiscale
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ruolo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTeam.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.nominativo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {member.codiceFiscale}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {member.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {member.telefono}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {member.ruolo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        member.status
                      )}`}
                    >
                      {member.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
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

      {/* Assenze tecnici section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowAssenzeSection(!showAssenzeSection)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-medium text-gray-900">Assenze tecnici</h2>
          <ChevronDown 
            className={`transform transition-transform ${showAssenzeSection ? 'rotate-180' : ''}`} 
            size={20} 
          />
        </button>
        
        {showAssenzeSection && (
          <div className="border-t border-gray-200">
            {/* Filters and actions for assenze */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <select
                      value={selectedNominativo}
                      onChange={(e) => handleNominativoFilter(e.target.value)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8"
                    >
                      <option value="">Filtra per nominativo</option>
                      <option value="Nome Cognome">Nome Cognome</option>
                    </select>
                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                  
                  <div className="relative">
                    <select
                      value={selectedData}
                      onChange={(e) => handleDataFilter(e.target.value)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white appearance-none pr-8"
                    >
                      <option value="">Filtra per data</option>
                      <option value="10/06/2024">10/06/2024</option>
                      <option value="04/08/2024">04/08/2024</option>
                    </select>
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    Tutte le assenze
                  </button>
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    In attesa ({getInAttesaCount()})
                  </span>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    Approvate
                  </button>
                  <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    Rifiutate
                  </button>
                </div>
              </div>
            </div>

            {/* Assenze table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nominativo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAssenze.map((assenza) => (
                    <tr key={assenza.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {assenza.nominativo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {assenza.data}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getAssenzaStatusColor(
                            assenza.status
                          )}`}
                        >
                          {assenza.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination for assenze */}
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
      </div>
    </div>
  );
}
