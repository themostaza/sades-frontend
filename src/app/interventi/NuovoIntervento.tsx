'use client';

import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, Calendar, Phone } from 'lucide-react';

interface NuovoInterventoProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NuovoIntervento({ isOpen, onClose }: NuovoInterventoProps) {

  const statusOptions = [
    { id: 'da_assegnare', label: 'Da assegnare', color: 'bg-orange-100 text-orange-800' },
    { id: 'attesa_preventivo', label: 'Attesa preventivo', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'attesa_ricambio', label: 'Attesa ricambio', color: 'bg-blue-100 text-blue-800' },
    { id: 'in_carico', label: 'In carico', color: 'bg-teal-100 text-teal-800' },
    { id: 'da_confermare', label: 'Da confermare', color: 'bg-purple-100 text-purple-800' },
    { id: 'completato', label: 'Completato', color: 'bg-green-100 text-green-800' },
    { id: 'non_completato', label: 'Non completato', color: 'bg-gray-100 text-gray-800' },
    { id: 'annullato', label: 'Annullato', color: 'bg-red-100 text-red-800' },
    { id: 'fatturato', label: 'Fatturato', color: 'bg-emerald-100 text-emerald-800' },
    { id: 'collocamento', label: 'Collocamento', color: 'bg-indigo-100 text-indigo-800' }
  ];

  const [selectedStatus, setSelectedStatus] = useState('da_assegnare');

  if (!isOpen) return null;

    return (    <div className="fixed top-0 left-16 right-0 bottom-0 bg-white z-50 overflow-y-auto">      <div className="min-h-screen">        {/* Header */}        <div className="bg-white border-b border-gray-200 px-6 py-4">          <div className="flex items-center gap-4">            <button               onClick={onClose}              className="flex items-center text-gray-600 hover:text-gray-900"            >              <ArrowLeft size={20} />            </button>            <h1 className="text-xl font-semibold text-gray-900">Nuovo intervento</h1>          </div>        </div>        <div className="p-6 max-w-4xl mx-auto">          {/* Green header */}          <div className="bg-teal-600 text-white text-center py-4 rounded-lg mb-6 -mx-6">            <h2 className="text-lg font-medium">Inserisci nuovo intervento</h2>          </div>
          {/* Status badges */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-700">Status</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status.id}
                  onClick={() => setSelectedStatus(status.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedStatus === status.id 
                      ? status.color + ' ring-2 ring-teal-500' 
                      : status.color + ' opacity-70 hover:opacity-100'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-6">
            {/* Ragione sociale e Destinazione */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ragione sociale
                </label>
                                <div className="relative">                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white text-gray-900">                    <option>Ragione sociale</option>                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destinazione
                </label>
                                <div className="relative">                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white text-gray-900">                    <option>Destinazione</option>                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
              </div>
            </div>

            {/* Tipologia intervento e Zona */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipologia intervento
                </label>
                                <div className="relative">                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white text-gray-900">                    <option>Tipologia intervento</option>                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zona
                </label>
                                <div className="relative">                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white text-gray-900">                    <option>Zona</option>                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
              </div>
            </div>

            {/* Codice cliente, Telefono fisso, Numero cellulare */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">                  Codice cliente                </label>                <input                  type="text"                  value="12414124"                  readOnly                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefono fisso
                </label>
                                <div className="flex">                  <input                    type="text"                    value="Telefono fisso"                    readOnly                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 cursor-not-allowed"                  />
                  <button className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-r-lg flex items-center gap-1">
                    <Phone size={14} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numero di cellulare
                </label>
                                <div className="flex">                  <input                    type="text"                    value="Numero di cellulare"                    readOnly                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 cursor-not-allowed"                  />
                  <button className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-r-lg flex items-center gap-1">
                    <Phone size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note
              </label>
                            <textarea                rows={4}                placeholder="Note"                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"              />
            </div>

            {/* Link anagrafica */}
            <div className="text-center">
              <button className="text-teal-600 hover:text-teal-700 text-sm font-medium">
                Vedi anagrafica e cronologia interventi
              </button>
            </div>

            {/* Servizio domicilio, Data, Orario */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Servizio domicilio
                </label>
                <div className="relative">
                                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white text-gray-900">                    <option>Si / No</option>                    <option>Si</option>                    <option>No</option>                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
                <div className="mt-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm text-gray-600">Sconto sul servizio domicilio</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data
                </label>
                <div className="relative">
                                    <input                    type="text"                    placeholder="gg/mm/aaaa"                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 pr-10 text-gray-900"                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orario intervento
                </label>
                                <div className="relative">                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white text-gray-900">                    <option>Seleziona</option>                  </select>                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
              </div>
            </div>

            {/* Preventivo e Orario apertura */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preventivo
                </label>
                <div className="flex">
                                    <input                    type="text"                    placeholder="0000,00"                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"                  />
                  <span className="bg-gray-100 border border-l-0 border-gray-300 px-3 py-2 rounded-r-lg text-gray-600">
                    EUR
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orario apertura
                </label>
                                <input                  type="text"                  placeholder="Orario apertura"                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"                />
              </div>
            </div>

            {/* Apparecchiatura interessata */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apparecchiatura interessata
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white">
                    <option>Seleziona</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
                <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-1">
                  Aggiungi
                </button>
              </div>
            </div>

            {/* Pezzi di ricambio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pezzi di ricambio
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white">
                    <option>Seleziona</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
                <input
                  type="number"
                  placeholder="0"
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg">
                  Aggiungi
                </button>
              </div>
            </div>

            {/* Richiedi pezzi di ricambio mancanti */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Richiedi pezzi di ricambio mancanti
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cerca"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <input
                  type="number"
                  placeholder="0"
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg">
                  Aggiungi
                </button>
              </div>
            </div>

            {/* Dettagli chiamata section */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dettagli chiamata</h3>
              
              <div className="space-y-4">
                {/* Tecnico di riferimento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tecnico di riferimento
                  </label>
                  <input
                    type="text"
                    placeholder="Tecnico di riferimento"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                {/* Nome e Ruolo operatore */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome operatore
                    </label>
                    <div className="relative">
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white">
                        <option>&lt;Nome Cognome logged in user&gt;</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ruolo operatore
                    </label>
                    <div className="relative">
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white">
                        <option>&lt;User role&gt;</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>
                </div>

                {/* Data creazione e Codice chiamata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data creazione richiesta
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value="07/07/24"
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Codice chiamata
                    </label>
                    <input
                      type="text"
                      value="21412421"
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 