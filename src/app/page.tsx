'use client';

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shield, Users, Wrench, BarChart3, Clock, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-gray-50">
      {/* Header */}
      <header className="relative z-10 px-6 py-4">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <Image
                src="/favicon.ico"
                alt="Sades Impianti"
                width={24}
                height={24}
                className="filter brightness-0 invert"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sades Impianti</h1>
              <p className="text-xs text-gray-600">Gestione Tecnica Avanzata</p>
            </div>
          </div>
          <Link
            href="/login"
            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            Accedi
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-8 flex justify-center">
              <div className="w-20 h-20 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Image
                  src="/favicon.ico"
                  alt="Sades Impianti"
                  width={40}
                  height={40}
                  className="filter brightness-0 invert"
                />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Gestione Tecnica
              <span className="text-teal-600 block">Professionale</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              La piattaforma completa per la gestione di interventi, apparecchiature, 
              clienti e team tecnici. Tutto in un unico sistema integrato.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="bg-teal-600 text-white px-8 py-4 rounded-lg hover:bg-teal-700 transition-colors font-medium text-lg flex items-center justify-center group"
              >
                Accedi
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tutto quello che serve per il tuo business
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Una piattaforma completa che semplifica la gestione tecnica e migliora l&apos;efficienza del tuo team
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-6">
                <Wrench className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Gestione Interventi</h3>
              <p className="text-gray-600 leading-relaxed">
                Pianifica, traccia e gestisci tutti gli interventi tecnici con un sistema intuitivo e completo.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Apparecchiature</h3>
              <p className="text-gray-600 leading-relaxed">
                Monitora lo stato, la manutenzione e la storia di tutte le apparecchiature in tempo reale.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Gestione Team</h3>
              <p className="text-gray-600 leading-relaxed">
                Coordina il tuo team tecnico, assegna compiti e monitora le performance in modo efficace.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Analytics & Report</h3>
              <p className="text-gray-600 leading-relaxed">
                Analizza le performance, genera report dettagliati e prendi decisioni basate sui dati.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-6">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Notifiche Smart</h3>
              <p className="text-gray-600 leading-relaxed">
                Ricevi notifiche intelligenti per scadenze, manutenzioni e aggiornamenti importanti.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <CheckCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Inventario</h3>
              <p className="text-gray-600 leading-relaxed">
                Gestisci l&apos;inventario di ricambi e materiali con controllo automatico delle scorte.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Come Funziona
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tre semplici passi per iniziare a gestire la tua attività tecnica in modo professionale
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Accedi alla Piattaforma</h3>
              <p className="text-gray-600">
                Effettua il login con le tue credenziali e accedi al dashboard personalizzato per il tuo ruolo.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Configura il Sistema</h3>
              <p className="text-gray-600">
                Imposta clienti, apparecchiature e team. Il sistema si adatta alle tue esigenze specifiche.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Gestisci e Monitora</h3>
              <p className="text-gray-600">
                Pianifica interventi, traccia le attività e monitora le performance in tempo reale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-teal-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Pronto a Migliorare la Tua Gestione Tecnica?
          </h2>
          <p className="text-xl text-teal-100 mb-8">
            Unisciti ai professionisti che hanno già scelto Sades Impianti per ottimizzare il loro lavoro.
          </p>
          <Link
            href="/login"
            className="bg-white text-teal-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors font-medium text-lg inline-flex items-center group"
          >
            Accedi Ora
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <Image
                  src="/favicon.ico"
                  alt="Sades Impianti"
                  width={20}
                  height={20}
                  className="filter brightness-0 invert"
                />
              </div>
              <div>
                <h3 className="font-semibold">Sades Impianti</h3>
                <p className="text-sm text-gray-400">Gestione Tecnica Professionale</p>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              © 2024 Sades Impianti Srl. Tutti i diritti riservati.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
