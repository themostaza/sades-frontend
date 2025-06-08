'use client';

import React, { useState } from 'react';
import { Clock, Eye, Download, CheckCircle, XCircle, AlertCircle, PenTool, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { InterventionReportDetail } from '../../../../types/intervention-reports';

// Interfaccia per il tipo SignatureCanvas
interface SignatureCanvasRef {
  clear: () => void;
  toDataURL: () => string;
  isEmpty: () => boolean;
}

// Import dinamico di SignatureCanvas per evitare errori SSR
const SignatureCanvas = dynamic(() => import('react-signature-canvas'), { 
  ssr: false,
  loading: () => <div className="w-full h-32 bg-gray-100 animate-pulse rounded-lg"></div>
}) as React.ComponentType<{
  ref: (ref: SignatureCanvasRef | null) => void;
  penColor: string;
  canvasProps: {
    width: number;
    height: number;
    className: string;
  };
}>;

interface DettaglioRapportinoProps {
  reportData: InterventionReportDetail;
}

export default function DettaglioRapportino({ reportData }: DettaglioRapportinoProps) {
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureRef, setSignatureRef] = useState<SignatureCanvasRef | null>(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);

  // Helper function per formattare la data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function per il badge di stato
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'DRAFT': { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: 'Bozza' },
      'PENDING': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'In attesa' },
      'APPROVED': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approvato' },
      'REJECTED': { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rifiutato' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon size={16} />
        {config.label}
      </span>
    );
  };

  // Helper function per formattare i servizi aggiuntivi
  const formatAdditionalServices = (services: string) => {
    if (!services || services.trim() === '') return 'Nessun servizio aggiuntivo';
    return services.split(',').map(s => s.trim()).filter(s => s).join(', ');
  };

  // Funzioni per gestire la firma
  const clearSignature = () => {
    if (signatureRef && signatureRef.clear) {
      signatureRef.clear();
      setSignatureData(null);
    }
  };

  const saveSignature = () => {
    if (signatureRef && signatureRef.toDataURL && !signatureRef.isEmpty()) {
      const signature = signatureRef.toDataURL();
      setSignatureData(signature);
      setShowSignatureDialog(false);
      console.log('Firma salvata:', signature);
      alert('Firma salvata con successo!');
    } else {
      alert('Per favore, inserisci una firma prima di salvare.');
    }
  };

  const openSignatureDialog = () => {
    setShowSignatureDialog(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-teal-600 text-white px-4 md:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl md:text-2xl font-bold">
            Rapportino Intervento #{reportData.id}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Data di creazione sotto al titolo */}
        <div className="mb-6">
          <p className="text-gray-600 text-sm">
            Creato il {formatDate(reportData.created_at)}
          </p>
        </div>

        {/* Pulsante Firma - Solo per rapportini in DRAFT */}
        {reportData.status === 'DRAFT' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <PenTool size={20} className="text-teal-600" />
                  Firma Cliente
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {signatureData ? 'Firma acquisita ✓' : 'Clicca per raccogliere la firma del cliente'}
                </p>
              </div>
              <button
                onClick={openSignatureDialog}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <PenTool size={16} />
                {signatureData ? 'Modifica Firma' : 'Firma'}
              </button>
            </div>
          </div>
        )}

        {/* Informazioni principali */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informazioni Generali</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-teal-600" size={20} />
                <span className="font-medium text-gray-700">Ore Lavoro</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reportData.work_hours}h</div>
              <div className="text-sm text-gray-600">Ore effettive</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-orange-600" size={20} />
                <span className="font-medium text-gray-700">Ore Viaggio</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reportData.travel_hours}h</div>
              <div className="text-sm text-gray-600">Ore trasferimento</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-blue-600" size={20} />
                <span className="font-medium text-gray-700">Intervento</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">#{reportData.intervention_id}</div>
              <div className="text-sm text-gray-600">ID Intervento</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-gray-700">Stato</span>
              </div>
              <div className="text-sm">{getStatusBadge(reportData.status)}</div>
            </div>
          </div>

          {/* Note per il cliente */}
          {reportData.customer_notes && (
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Note per il cliente</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-800">{reportData.customer_notes}</p>
              </div>
            </div>
          )}

          {/* Intervento fallito */}
          {reportData.is_failed && reportData.failure_reason && (
            <div className="mt-6">
              <h3 className="font-medium text-gray-700 mb-2">Motivo del fallimento</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{reportData.failure_reason}</p>
              </div>
            </div>
          )}
        </div>

        {/* Apparecchiature e interventi */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Apparecchiature e Interventi</h2>
          
          {reportData.items && reportData.items.length > 0 ? (
            <div className="space-y-6">
              {reportData.items.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Apparecchiatura #{item.intervention_equipment_id}
                    </h3>
                    <span className="text-sm text-gray-500">Item #{item.id}</span>
                  </div>

                  {/* Note dell'intervento */}
                  {item.note && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-2">Note intervento</h4>
                      <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <p className="text-gray-800">{item.note}</p>
                      </div>
                    </div>
                  )}

                  {/* Gestione Gas */}
                  {item.fl_gas && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-3">Gestione Gas</h4>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          
                          <div>
                            <div className="text-sm font-medium text-gray-600">Tipo Compressore</div>
                            <div className="text-gray-900">ID: {item.gas_compressor_types_id}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium text-gray-600">Nuova Installazione</div>
                            <div className="text-gray-900">
                              {item.is_new_installation ? (
                                <span className="text-green-600 font-medium">Sì</span>
                              ) : (
                                <span className="text-gray-600">No</span>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium text-gray-600">Gas Ricaricabile</div>
                            <div className="text-gray-900">ID: {item.rechargeable_gas_types_id}</div>
                          </div>

                          <div>
                            <div className="text-sm font-medium text-gray-600">Quantità Gas Ricaricato</div>
                            <div className="text-gray-900">{item.qty_gas_recharged} gr</div>
                          </div>

                          <div>
                            <div className="text-sm font-medium text-gray-600">Carica Massima</div>
                            <div className="text-gray-900">{item.max_charge} gr</div>
                          </div>

                          <div>
                            <div className="text-sm font-medium text-gray-600">Quantità Gas Recuperato</div>
                            <div className="text-gray-900">{item.qty_gas_recovered} gr</div>
                          </div>

                          {item.compressor_model && (
                            <div>
                              <div className="text-sm font-medium text-gray-600">Modello Compressore</div>
                              <div className="text-gray-900">{item.compressor_model}</div>
                            </div>
                          )}

                          {item.compressor_serial_num && (
                            <div>
                              <div className="text-sm font-medium text-gray-600">Matricola Compressore</div>
                              <div className="text-gray-900">{item.compressor_serial_num}</div>
                            </div>
                          )}

                          {item.compressor_unique_num && (
                            <div>
                              <div className="text-sm font-medium text-gray-600">Numero Univoco</div>
                              <div className="text-gray-900">{item.compressor_unique_num}</div>
                            </div>
                          )}
                        </div>

                        {/* Servizi Aggiuntivi */}
                        {item.additional_services && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="text-sm font-medium text-gray-600 mb-2">Servizi Aggiuntivi</div>
                            <div className="text-gray-900">{formatAdditionalServices(item.additional_services)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* URLs delle immagini del compressore */}
                  {(item.compressor_model_img_url || item.compressor_serial_num_img_url || item.compressor_unique_num_img_url) && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-3">Immagini Compressore</h4>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {item.compressor_model_img_url && (
                            <div>
                              <div className="text-sm font-medium text-gray-600 mb-2">Modello</div>
                              <a 
                                href={item.compressor_model_img_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                              >
                                <Eye size={16} />
                                Visualizza immagine
                              </a>
                            </div>
                          )}
                          
                          {item.compressor_serial_num_img_url && (
                            <div>
                              <div className="text-sm font-medium text-gray-600 mb-2">Matricola</div>
                              <a 
                                href={item.compressor_serial_num_img_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                              >
                                <Eye size={16} />
                                Visualizza immagine
                              </a>
                            </div>
                          )}
                          
                          {item.compressor_unique_num_img_url && (
                            <div>
                              <div className="text-sm font-medium text-gray-600 mb-2">Numero Univoco</div>
                              <a 
                                href={item.compressor_unique_num_img_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                              >
                                <Eye size={16} />
                                Visualizza immagine
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Immagini dell'apparecchiatura */}
                  {item.images && item.images.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-3">Immagini Apparecchiatura</h4>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {item.images.map((image, imgIndex) => (
                            <div key={imgIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                              <Image
                                src={image.file_url}
                                alt={image.file_name}
                                width={200}
                                height={150}
                                className="w-full h-32 object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                              <div className="p-3">
                                <div className="text-sm font-medium text-gray-600 truncate mb-2">
                                  {image.file_name}
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={image.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    <Eye size={14} />
                                    Visualizza
                                  </a>
                                  <a
                                    href={image.file_url}
                                    download={image.file_name}
                                    className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 text-sm"
                                  >
                                    <Download size={14} />
                                    Scarica
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Articoli/Ricambi utilizzati */}
                  {item.articles && item.articles.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-3">Articoli e Ricambi Utilizzati</h4>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="space-y-3">
                          {item.articles.map((article, artIndex) => (
                            <div key={artIndex} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {article.article_name || `Articolo ID: ${article.article_id}`}
                                </div>
                                {article.article_description && (
                                  <div className="text-sm text-gray-600">{article.article_description}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-gray-900">Qt: {article.quantity}</div>
                                <div className="text-sm text-gray-500">ID: {article.article_id}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nessuna apparecchiatura registrata per questo rapportino
            </div>
          )}
        </div>

        {/* Pulsanti azione */}
        <div className="mt-6 flex justify-end gap-3">
          {reportData.status === 'DRAFT' && (
            <button
              onClick={openSignatureDialog}
              className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <PenTool size={16} />
              {signatureData ? 'Modifica Firma' : 'Firma'}
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Stampa rapportino
          </button>
        </div>
      </div>

      {/* Dialog Firma */}
      {showSignatureDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <PenTool size={24} className="text-teal-600" />
                  Firma Cliente
                </h2>
                <button
                  onClick={() => setShowSignatureDialog(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Il cliente può firmare nell&apos;area sottostante utilizzando il dito o un pennino.
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 mb-4">
                <SignatureCanvas
                  ref={(ref: SignatureCanvasRef | null) => { setSignatureRef(ref); }}
                  penColor="black"
                  canvasProps={{
                    width: 600,
                    height: 250,
                    className: 'signature-canvas w-full bg-white rounded border'
                  }}
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={clearSignature}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <RotateCcw size={16} />
                  Cancella
                </button>
                <button
                  onClick={() => setShowSignatureDialog(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={saveSignature}
                  className="flex items-center gap-2 px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                >
                  <PenTool size={16} />
                  Salva Firma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 