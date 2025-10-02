'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Eye, CheckCircle, XCircle, PenTool, RotateCcw, Trash2, MessageCircle, AlertTriangle, Plus } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useAuth } from '../../../../contexts/AuthContext';
import { InterventionReportDetail } from '../../../../types/intervention-reports';
import { EquipmentDetail } from '../../../../types/equipment';
import type { AssistanceInterventionDetail } from '../../../../types/assistance-interventions';
import type { Article } from '../../../../types/article';

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

// Interface per la PUT request - compatibile con i tipi esistenti
interface UpdateInterventionReportRequest {
  work_hours: number;
  travel_hours: number;
  customer_notes: string;
  is_failed: boolean;
  failure_reason: string;
  status: string;
  signature_url: string;
  items: Array<{
    id: number;
    equipment_id: number;
    note: string;
    fl_gas: boolean;
    gas_compressor_types_id: number;
    is_new_installation: boolean;
    rechargeable_gas_types_id: number;
    qty_gas_recharged: number;
    max_charge: number;
    compressor_model: string;
    compressor_model_img_url: string;
    compressor_serial_num: string;
    compressor_serial_num_img_url: string;
    compressor_unique_num: string;
    compressor_unique_num_img_url: string;
    additional_services: string;
    recovered_rech_gas_types_id: number;
    qty_gas_recovered: number;
    images: Array<{
      id: number;
      file_name: string;
      file_url: string;
    }>;
    articles: Array<{
      id: number;
      article_id: string;
      quantity: number;
    }>;
  }>;
}

interface DettaglioRapportinoProps {
  reportData: InterventionReportDetail;
  interventionData: AssistanceInterventionDetail | null;
}

export default function DettaglioRapportino({ reportData, interventionData }: DettaglioRapportinoProps) {
  const [signatureRef, setSignatureRef] = useState<SignatureCanvasRef | null>(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [resultDialogType, setResultDialogType] = useState<'success' | 'error'>('success');
  const [resultDialogMessage, setResultDialogMessage] = useState('');
  const [shouldRedirectOnClose, setShouldRedirectOnClose] = useState(false);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [updatedReportData, setUpdatedReportData] = useState<InterventionReportDetail>(reportData);
  const { token } = useAuth();

  // Stati per la modifica del rapportino
  const [editableWorkHours, setEditableWorkHours] = useState<number>(reportData.work_hours);
  const [editableTravelHours, setEditableTravelHours] = useState<number>(reportData.travel_hours);
  const [editableCustomerNotes, setEditableCustomerNotes] = useState<string>(reportData.customer_notes || '');
  const [showNotesField, setShowNotesField] = useState<boolean>(!!reportData.customer_notes);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Tipi per mapping id -> name
  interface GasCompressorType { id: number; name: string }
  interface RechargeableGasType { id: number; name: string }
  const [gasCompressorTypes, setGasCompressorTypes] = useState<GasCompressorType[]>([]);
  const [rechargeableGasTypes, setRechargeableGasTypes] = useState<RechargeableGasType[]>([]);

  // Lookup cache per dettagli apparecchiature e articoli
  const [equipmentById, setEquipmentById] = useState<Record<number, EquipmentDetail>>({});
  const [articleById, setArticleById] = useState<Record<string, Article>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [interventionDetail, setInterventionDetail] = useState<AssistanceInterventionDetail | null>(null);

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

  // Helper function per formattare i servizi aggiuntivi
  const formatAdditionalServices = (services: string) => {
    if (!services || services.trim() === '') return 'Nessun servizio aggiuntivo';
    return services.split(',').map(s => s.trim()).filter(s => s).join(', ');
  };

  // Carica mapping tipi gas/compressori per visualizzare i nomi
  useEffect(() => {
    const loadTypes = async () => {
      if (!token) return;
      
      try {
        const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };
        const [gcRes, rgRes] = await Promise.all([
          fetch('/api/gas-compressor-types', { headers }),
          fetch('/api/rechargeable-gas-types', { headers })
        ]);
        if (gcRes.ok) {
          const data = await gcRes.json();
          setGasCompressorTypes(Array.isArray(data) ? data : []);
        }
        if (rgRes.ok) {
          const data = await rgRes.json();
          setRechargeableGasTypes(Array.isArray(data) ? data : []);
        }
      } catch {
        // best effort: mantieni ID se fallisce
      } finally {
        
      }
    };
    loadTypes();
  }, [token]);

  const getCompressorTypeName = (id?: number) => {
    if (!id) return '';
    return gasCompressorTypes.find(t => t.id === id)?.name || `ID: ${id}`;
  };

  const getRechargeableGasTypeName = (id?: number) => {
    if (!id) return '';
    return rechargeableGasTypes.find(t => t.id === id)?.name || `ID: ${id}`;
  };

  // Sincronizza gli stati editabili quando updatedReportData cambia
  useEffect(() => {
    setEditableWorkHours(updatedReportData.work_hours);
    setEditableTravelHours(updatedReportData.travel_hours);
    setEditableCustomerNotes(updatedReportData.customer_notes || '');
    setShowNotesField(!!updatedReportData.customer_notes);
  }, [updatedReportData]);

  // Detecta modifiche non salvate
  useEffect(() => {
    const workHoursChanged = editableWorkHours !== updatedReportData.work_hours;
    const travelHoursChanged = editableTravelHours !== updatedReportData.travel_hours;
    const notesChanged = editableCustomerNotes !== (updatedReportData.customer_notes || '');
    
    setHasUnsavedChanges(workHoursChanged || travelHoursChanged || notesChanged);
  }, [editableWorkHours, editableTravelHours, editableCustomerNotes, updatedReportData]);

  // Determina se il rapportino è modificabile
  const canEditReport = (): boolean => {
    return canDeleteReport();
  };

  // Carica dettagli dell'intervento associato per controlli UI (es. eliminazione)
  useEffect(() => {
    const loadIntervention = async () => {
      if (!token || !updatedReportData?.intervention_id) return;
      
      try {
        const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };
        const res = await fetch(`/api/assistance-interventions/${updatedReportData.intervention_id}`, { headers });
        if (res.ok) {
          const data: AssistanceInterventionDetail = await res.json();
          setInterventionDetail(data);
        }
      } finally {
      }
    };
    loadIntervention();
  }, [token, updatedReportData?.intervention_id]);

  const canDeleteReport = (): boolean => {
    // Se non abbiamo info, lascia abilitato per retrocompatibilità
    if (!interventionDetail) return true;
    const label = (interventionDetail.status_label || '').toLowerCase();
    // Blocca per stati non cancellabili
    const blocked = [
      'completato',
      'non completato',
      'annullato',
      'fatturato',
      'collocamento'
    ];
    return !blocked.some(b => label.includes(b));
  };

  // Carica dettagli apparecchiature e articoli usati nel report
  useEffect(() => {
    if (!updatedReportData?.items) return;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Equipments
    const equipmentIds = Array.from(new Set(
      updatedReportData.items
        .map(i => i.equipment_id)
        .filter((v): v is number => typeof v === 'number' && v > 0)
    ));
    const missingEquipments = equipmentIds.filter(id => !equipmentById[id]);

    // Articles
    const articleIds = Array.from(new Set(
      updatedReportData.items.flatMap(i => (i.articles || []).map(a => a.article_id)).filter(Boolean)
    ));
    const missingArticles = articleIds.filter(id => !articleById[id]);

    const fetchAll = async () => {
      try {
        await Promise.all([
          // equipments
          ...missingEquipments.map(async (id) => {
            const res = await fetch(`/api/equipments/${id}`, { headers });
            if (!res.ok) return;
            const data: EquipmentDetail = await res.json();
            setEquipmentById(prev => ({ ...prev, [id]: data }));
          }),
          // articles
          ...missingArticles.map(async (id) => {
            const res = await fetch(`/api/articles/${encodeURIComponent(id)}`, { headers });
            if (!res.ok) return;
            const data: Article = await res.json();
            setArticleById(prev => ({ ...prev, [id]: data }));
          })
        ]);
      } catch {
        // best effort; in caso di errore si mostrano fallback
      }
    };

    if (missingEquipments.length > 0 || missingArticles.length > 0) {
      fetchAll();
    }
  }, [updatedReportData, token]);

  // Funzione per convertire canvas in blob
  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });
  };

  // Funzione per upload automatico tramite Uploadcare
  const uploadSignatureToUploadcare = async (signatureBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('UPLOADCARE_PUB_KEY', process.env.NEXT_PUBLIC_UPLOADER_PUBLIC_KEY || '');
    formData.append('file', signatureBlob, 'signature.png');

    const response = await fetch('https://upload.uploadcare.com/base/', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    return `https://ucarecdn.com/${result.file}/`;
  };

  // Funzione per costruire il payload completo della PUT
  const buildCompletePayload = (signatureUrl: string): UpdateInterventionReportRequest => {
    return {
      work_hours: updatedReportData.work_hours,
      travel_hours: updatedReportData.travel_hours,
      customer_notes: updatedReportData.customer_notes || '',
      is_failed: updatedReportData.is_failed,
      failure_reason: updatedReportData.failure_reason || '',
      status: updatedReportData.status,
      signature_url: signatureUrl,
      items: updatedReportData.items?.map(item => ({
        id: item.id,
        equipment_id: item.equipment_id,
        note: item.note || '',
        fl_gas: item.fl_gas,
        gas_compressor_types_id: item.gas_compressor_types_id || 0,
        is_new_installation: item.is_new_installation,
        rechargeable_gas_types_id: item.rechargeable_gas_types_id || 0,
        qty_gas_recharged: item.qty_gas_recharged || 0,
        max_charge: item.max_charge || 0,
        compressor_model: item.compressor_model || '',
        compressor_model_img_url: item.compressor_model_img_url || '',
        compressor_serial_num: item.compressor_serial_num || '',
        compressor_serial_num_img_url: item.compressor_serial_num_img_url || '',
        compressor_unique_num: item.compressor_unique_num || '',
        compressor_unique_num_img_url: item.compressor_unique_num_img_url || '',
        additional_services: item.additional_services || '',
        recovered_rech_gas_types_id: item.recovered_rech_gas_types_id || 0,
        qty_gas_recovered: item.qty_gas_recovered || 0,
        images: item.images?.map(img => ({
          id: img.id || 0,
          file_name: img.file_name,
          file_url: img.file_url
        })) || [],
        articles: item.articles?.map(art => ({
          id: parseInt(art.id) || 0,
          article_id: art.article_id,
          quantity: art.quantity
        })) || []
      })) || []
    };
  };

  // Funzione per aggiornare il rapportino tramite PUT
  const updateInterventionReport = async (payload: UpdateInterventionReportRequest) => {
    if (!token) {
      throw new Error('Token di autenticazione non disponibile');
    }

    const response = await fetch(`/api/intervention-reports/${updatedReportData.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Errore durante l\'aggiornamento del rapportino');
    }

    return await response.json();
  };

  // Funzione per ricaricare i dati del rapportino dal server
  const reloadReportData = async () => {
    if (!token) {
      throw new Error('Token di autenticazione non disponibile');
    }

    const response = await fetch(`/api/intervention-reports/${updatedReportData.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Errore durante il ricaricamento dei dati');
    }

    return await response.json();
  };

  // Funzioni per gestire la firma
  const clearSignature = () => {
    if (signatureRef && signatureRef.clear) {
      signatureRef.clear();
    }
  };

  const saveSignature = async () => {
    if (!signatureRef || signatureRef.isEmpty()) {
      setResultDialogType('error');
      setResultDialogMessage('Per favore, inserisci una firma prima di salvare.');
      setShowResultDialog(true);
      return;
    }

    try {
      setIsSavingSignature(true);

      // 1. Converti canvas in blob
      const signatureDataURL = signatureRef.toDataURL();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Impossibile ottenere il context del canvas');
      }
      
      const img = document.createElement('img');
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Errore caricamento immagine'));
        img.src = signatureDataURL;
      });

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const signatureBlob = await canvasToBlob(canvas);

      // 2. Upload automatico tramite Uploadcare
      console.log('🔄 Uploading signature to Uploadcare...');
      const uploadedSignatureUrl = await uploadSignatureToUploadcare(signatureBlob);
      console.log('✅ Signature uploaded:', uploadedSignatureUrl);

      // 3. Costruisci payload completo
      const payload = buildCompletePayload(uploadedSignatureUrl);
      console.log('📤 Updating intervention report with signature...');

      // 4. Chiama PUT per aggiornare il rapportino
      await updateInterventionReport(payload);
      console.log('✅ Report updated successfully');

      // 5. Ricarica i dati freschi dal server per aggiornare il componente
      console.log('🔄 Reloading fresh data from server...');
      const freshReportData = await reloadReportData();
      console.log('✅ Fresh data loaded:', freshReportData);
      
      // 6. Aggiorna lo stato locale con i dati freschi
      setUpdatedReportData(freshReportData);
      setShowSignatureDialog(false);

      setResultDialogType('success');
      setResultDialogMessage('Firma salvata con successo!');
      setShowResultDialog(true);

    } catch (error) {
      console.error('❌ Error saving signature:', error);
      setResultDialogType('error');
      setResultDialogMessage(error instanceof Error ? error.message : 'Errore durante il salvataggio della firma.');
      setShowResultDialog(true);
    } finally {
      setIsSavingSignature(false);
    }
  };

  const openSignatureDialog = () => {
    setShowSignatureDialog(true);
  };

  // Funzione per salvare le modifiche al rapportino
  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges || isSaving) return;

    try {
      setIsSaving(true);
      console.log('💾 Salvataggio modifiche rapportino...');

      // Costruisci il payload aggiornato con i nuovi valori
      const payload = buildCompletePayload(updatedReportData.signature_url || '');
      
      // Sovrascrivi con i valori modificati
      payload.work_hours = editableWorkHours;
      payload.travel_hours = editableTravelHours;
      payload.customer_notes = editableCustomerNotes;

      console.log('📤 Payload aggiornato:', payload);

      // Chiama la PUT per aggiornare il rapportino
      await updateInterventionReport(payload);
      console.log('✅ Modifiche salvate con successo');

      // Ricarica i dati freschi dal server
      console.log('🔄 Ricaricamento dati aggiornati...');
      const freshReportData = await reloadReportData();
      console.log('✅ Dati ricaricati:', freshReportData);
      
      // Aggiorna lo stato locale
      setUpdatedReportData(freshReportData);
      
      // Mostra notifica di successo
      setResultDialogType('success');
      setResultDialogMessage('Modifiche salvate con successo!');
      setShowResultDialog(true);

    } catch (error) {
      console.error('❌ Errore durante il salvataggio:', error);
      setResultDialogType('error');
      setResultDialogMessage(error instanceof Error ? error.message : 'Errore durante il salvataggio delle modifiche.');
      setShowResultDialog(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      // Verifica che il token sia disponibile
      if (!token) {
        setResultDialogType('error');
        setResultDialogMessage('Errore di autenticazione. Effettuare il login.');
        setShowResultDialog(true);
        return;
      }

      const response = await fetch(`/api/intervention-reports/${updatedReportData.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'accept': 'application/json',
        },
      });

      if (response.ok) {
        setResultDialogType('success');
        setResultDialogMessage('Rapportino eliminato con successo!');
        setShowResultDialog(true);
        setShouldRedirectOnClose(true);
        console.log('✅ Eliminazione riuscita - flag redirect impostato a true');
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Errore durante l\'eliminazione del rapportino.';
        setResultDialogType('error');
        setResultDialogMessage(errorMessage);
        setShowResultDialog(true);
        console.error('❌ Error deleting report:', response.status, errorData);
      }
    } catch (error) {
      console.error('❌ Errore durante la richiesta di eliminazione:', error);
      setResultDialogType('error');
      setResultDialogMessage('Errore durante la richiesta di eliminazione.');
      setShowResultDialog(true);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-teal-600 text-white px-4 md:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl">
                Rapportino Intervento #{updatedReportData.id}
              </h1>
              {/* Nome Cliente */}
              {interventionData?.company_name && (
                <p className="text-teal-100 mt-1 font-bold">
                  {interventionData.company_name}
                </p>
              )}
              {/* Tipologia Intervento */}
              {interventionData?.type_label && (
                <p className="text-teal-100 text-sm md:text-base mt-1 font-medium">
                  {interventionData.type_label}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Pulsante Salva - visibile solo se modificabile */}
              {canEditReport() && (
                <button
                  onClick={handleSaveChanges}
                  disabled={!hasUnsavedChanges || isSaving}
                  className="flex items-center gap-2 bg-white text-teal-600 px-4 py-2 rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-teal-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Salva
                    </>
                  )}
                </button>
              )}
              
              {/* Badge Intervento Fallito */}
              {updatedReportData.is_failed && (
                <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg border-2 border-red-400 shadow-lg">
                  <XCircle size={20} className="text-red-200" />
                  <span className="font-bold text-sm md:text-base">INTERVENTO FALLITO</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Data di creazione sotto al titolo */}
        <div className="mb-6">
          <p className="text-gray-600 text-sm">
            Creato il {formatDate(updatedReportData.created_at)}
          </p>
        </div>

        {/* Sezione Firma Cliente */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <PenTool size={20} className="text-teal-600" />
                Firma Cliente
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {updatedReportData.signature_url 
                  ? 'Firma acquisita ✓' 
                  : updatedReportData.status === 'DRAFT' 
                    ? 'Clicca per raccogliere la firma del cliente'
                    : 'Nessuna firma disponibile'
                }
              </p>
            </div>
            {updatedReportData.status === 'DRAFT' && (
              <button
                onClick={openSignatureDialog}
                disabled={isSavingSignature}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSavingSignature ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <PenTool size={16} />
                    {updatedReportData.signature_url ? 'Modifica Firma' : 'Firma'}
                  </>
                )}
              </button>
            )}
          </div>
          
          {/* Mostra la firma esistente se presente */}
          {updatedReportData.signature_url && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="text-sm font-medium text-gray-600 mb-2">Firma del cliente:</div>
              <div className="bg-white rounded border p-4">
                <Image
                  src={updatedReportData.signature_url}
                  alt="Firma del cliente"
                  width={400}
                  height={200}
                  className="max-w-full h-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Informazioni principali */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informazioni Generali</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-teal-600" size={20} />
                <span className="font-medium text-gray-700">Ore Lavoro</span>
              </div>
              {canEditReport() ? (
                <input
                  type="number"
                  value={editableWorkHours}
                  onChange={(e) => setEditableWorkHours(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  className="text-2xl font-bold text-gray-900 bg-white border-2 border-teal-200 rounded-lg px-3 py-1 w-full focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              ) : (
                <div className="text-2xl font-bold text-gray-900">{updatedReportData.work_hours}h</div>
              )}
              <div className="text-sm text-gray-600">Ore effettive</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-orange-600" size={20} />
                <span className="font-medium text-gray-700">Ore Viaggio</span>
              </div>
              {canEditReport() ? (
                <input
                  type="number"
                  value={editableTravelHours}
                  onChange={(e) => setEditableTravelHours(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  className="text-2xl font-bold text-gray-900 bg-white border-2 border-orange-200 rounded-lg px-3 py-1 w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              ) : (
                <div className="text-2xl font-bold text-gray-900">{updatedReportData.travel_hours}h</div>
              )}
              <div className="text-sm text-gray-600">Ore trasferimento</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-blue-600" size={20} />
                <span className="font-medium text-gray-700">Intervento</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">#{updatedReportData.intervention_id}</div>
              <div className="text-sm text-gray-600">ID Intervento</div>
            </div>
          </div>

          {/* Note per il cliente */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="text-blue-600" size={20} />
                <h3 className="font-semibold text-gray-900">Note per il cliente</h3>
              </div>
              {canEditReport() && !showNotesField && (
                <button
                  onClick={() => setShowNotesField(true)}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                >
                  <Plus size={16} />
                  Aggiungi note
                </button>
              )}
            </div>
            
            {showNotesField ? (
              canEditReport() ? (
                <textarea
                  value={editableCustomerNotes}
                  onChange={(e) => setEditableCustomerNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900"
                  placeholder="Note che saranno leggibili dal cliente"
                />
              ) : (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-5 shadow-sm">
                  <p className="text-gray-900 text-base leading-relaxed font-medium">{updatedReportData.customer_notes}</p>
                </div>
              )
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-gray-500 text-sm">Nessuna nota inserita per il cliente</p>
              </div>
            )}
          </div>

          {/* Intervento fallito */}
          {updatedReportData.is_failed && updatedReportData.failure_reason && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="text-red-600" size={20} />
                <h3 className="font-semibold text-gray-900">Motivo del fallimento</h3>
              </div>
              <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg p-5 shadow-sm">
                <p className="text-red-900 text-base leading-relaxed font-medium">{updatedReportData.failure_reason}</p>
              </div>
            </div>
          )}
        </div>

        {/* Apparecchiature e interventi */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Apparecchiature e Interventi</h2>
          {updatedReportData.items && updatedReportData.items.length > 0 ? (
            <div className="space-y-6">
              {updatedReportData.items.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  {/* Header apparecchiatura */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {(() => {
                          const equipmentId = item.equipment_id;
                          const eq = equipmentId ? equipmentById[equipmentId] : undefined;
                          if (eq) {
                            return eq.description || `Apparecchiatura #${equipmentId}`;
                          }
                          return equipmentId ? `Apparecchiatura #${equipmentId}` : 'Apparecchiatura non specificata';
                        })()}
                      </h3>
                      {item.equipment_id && equipmentById[item.equipment_id] && (
                        <div className="text-sm text-gray-600 mt-1">
                          {equipmentById[item.equipment_id].brand_label && (
                            <span className="mr-2">{equipmentById[item.equipment_id].brand_label}</span>
                          )}
                          {equipmentById[item.equipment_id].model && (
                            <span className="mr-2">{equipmentById[item.equipment_id].model}</span>
                          )}
                          {equipmentById[item.equipment_id].serial_number && (
                            <span className="text-gray-500">S/N: {equipmentById[item.equipment_id].serial_number}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ricambi utilizzati */}
                  {item.articles && item.articles.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-3">Pezzi di ricambio usati</h4>
                      <div className="bg-white border border-teal-200 rounded-lg p-4">
                        <div className="space-y-2">
                          {item.articles.map((article, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-teal-50 border border-teal-200 p-3 rounded-lg">
                              <div className="flex-1">
                                {(() => {
                                  const ad = articleById[article.article_id];
                                  const title = ad?.short_description || article.article_name || 'Articolo';
                                  const desc = ad?.description || article.article_description;
                                  return (
                                    <>
                                      <span className="text-gray-900 font-medium">{title}</span>
                                      {desc && <div className="text-sm text-gray-600">{desc}</div>}
                                      <div className="text-xs text-gray-500">ID: {article.article_id}{ad?.pnc_code ? ` • PNC: ${ad.pnc_code}` : ''}</div>
                                    </>
                                  );
                                })()}
                              </div>
                              <div className="ml-3 text-sm text-gray-700 whitespace-nowrap">Qt: {article.quantity}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Note per questa apparecchiatura - Evidenza Maggiore */}
                  {item.note && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-amber-500 text-white p-1.5 rounded-full">
                          <MessageCircle size={16} />
                        </div>
                        <h4 className="font-bold text-gray-900 text-base">Note intervento per questa apparecchiatura</h4>
                      </div>
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500 rounded-lg p-4 shadow-sm">
                        <p className="text-gray-900 text-base leading-relaxed font-medium">{item.note}</p>
                      </div>
                    </div>
                  )}

                  {/* Gestione Gas per questa apparecchiatura */}
                  {item.fl_gas && (
                    <div className="mb-4">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Gestione gas per questa apparecchiatura</h4>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm font-medium text-gray-600 mb-1">Tipologia compressore</div>
                            <div className="text-gray-900">{getCompressorTypeName(item.gas_compressor_types_id)}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-600 mb-1">Nuova installazione</div>
                            <div className="text-gray-900">{item.is_new_installation ? 'Sì' : 'No'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-600 mb-1">Tipologia gas caricato</div>
                            <div className="text-gray-900">{getRechargeableGasTypeName(item.rechargeable_gas_types_id)}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-600 mb-1">Quantità gas caricato</div>
                            <div className="text-gray-900">{item.qty_gas_recharged} gr</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-600 mb-1">Carica max</div>
                            <div className="text-gray-900">{item.max_charge} gr</div>
                          </div>
                          {item.compressor_model && (
                            <div>
                              <div className="text-sm font-medium text-gray-600 mb-1">Modello compressore</div>
                              <div className="text-gray-900">{item.compressor_model}</div>
                            </div>
                          )}
                          {item.compressor_serial_num && (
                            <div>
                              <div className="text-sm font-medium text-gray-600 mb-1">Matricola compressore</div>
                              <div className="text-gray-900">{item.compressor_serial_num}</div>
                            </div>
                          )}
                          {item.compressor_unique_num && (
                            <div>
                              <div className="text-sm font-medium text-gray-600 mb-1">Numero univoco</div>
                              <div className="text-gray-900">{item.compressor_unique_num}</div>
                            </div>
                          )}
                        </div>

                        {/* Servizi aggiuntivi */}
                        {item.additional_services && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="text-sm font-medium text-gray-600 mb-2">Servizi aggiuntivi</div>
                            <div className="text-gray-900">{formatAdditionalServices(item.additional_services)}</div>
                          </div>
                        )}

                        {/* Recupero gas (se presente) */}
                        {(item.recovered_rech_gas_types_id || item.qty_gas_recovered) && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {item.recovered_rech_gas_types_id && (
                              <div>
                                <div className="text-sm font-medium text-gray-600 mb-1">Tipologia gas recuperato</div>
                                <div className="text-gray-900">{getRechargeableGasTypeName(item.recovered_rech_gas_types_id)}</div>
                              </div>
                            )}
                            {item.qty_gas_recovered && (
                              <div>
                                <div className="text-sm font-medium text-gray-600 mb-1">Quantità gas recuperato</div>
                                <div className="text-gray-900">{item.qty_gas_recovered} gr</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Immagini compressore (se presenti URL dedicati) */}
                  {(item.compressor_model_img_url || item.compressor_serial_num_img_url || item.compressor_unique_num_img_url) && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-3">Immagini compressore</h4>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {item.compressor_model_img_url && (
                            <div>
                              <div className="text-sm font-medium text-gray-600 mb-2">Modello</div>
                              <a href={item.compressor_model_img_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800">
                                <Eye size={16} />
                                Visualizza immagine
                              </a>
                            </div>
                          )}
                          {item.compressor_serial_num_img_url && (
                            <div>
                              <div className="text-sm font-medium text-gray-600 mb-2">Matricola</div>
                              <a href={item.compressor_serial_num_img_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800">
                                <Eye size={16} />
                                Visualizza immagine
                              </a>
                            </div>
                          )}
                          {item.compressor_unique_num_img_url && (
                            <div>
                              <div className="text-sm font-medium text-gray-600 mb-2">Numero Univoco</div>
                              <a href={item.compressor_unique_num_img_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800">
                                <Eye size={16} />
                                Visualizza immagine
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Immagini per questa apparecchiatura */}
                  {item.images && item.images.length > 0 && (
                    <div className="mb-1">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Immagini per questa apparecchiatura</h4>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {item.images.map((image, imgIndex) => (
                            <div key={imgIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                              <Image
                                src={image.file_url}
                                alt={image.file_name}
                                width={200}
                                height={150}
                                className="w-full h-32 object-cover cursor-zoom-in"
                                onClick={() => setLightboxUrl(image.file_url)}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
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
            <div className="text-center py-8 text-gray-500">Nessuna apparecchiatura registrata per questo rapportino</div>
          )}
        </div>

        {/* Pulsanti azione */}
        <div className="mt-6 flex justify-end gap-3">
          {updatedReportData.status === 'DRAFT' && (
            <button
              onClick={openSignatureDialog}
              disabled={isSavingSignature}
              className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSavingSignature ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <PenTool size={16} />
                  {updatedReportData.signature_url ? 'Modifica Firma' : 'Firma'}
                </>
              )}
            </button>
          )}
          {/* Pulsante stampa rimosso su richiesta */}
          {canDeleteReport() && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Trash2 size={16} />
              Elimina rapportino
            </button>
          )}
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
                  disabled={isSavingSignature}
                  className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
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
                  disabled={isSavingSignature}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={16} />
                  Cancella
                </button>
                <button
                  onClick={() => setShowSignatureDialog(false)}
                  disabled={isSavingSignature}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  onClick={saveSignature}
                  disabled={isSavingSignature}
                  className="flex items-center gap-2 px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSavingSignature ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <PenTool size={16} />
                      Salva Firma
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Conferma Eliminazione */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Trash2 size={24} className="text-red-600" />
                  Conferma Eliminazione
                </h2>
              </div>
              
              <p className="text-gray-600 mb-6">
                Sei sicuro di voler eliminare definitivamente questo rapportino? 
                <br />
                <strong>Questa azione non può essere annullata.</strong>
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Eliminazione...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Elimina Definitivamente
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Risultato */}
      {showResultDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  {resultDialogType === 'success' ? (
                    <CheckCircle size={24} className="text-green-600" />
                  ) : (
                    <XCircle size={24} className="text-red-600" />
                  )}
                  {resultDialogMessage}
                </h2>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    console.log('🔄 Chiusura dialog risultato - shouldRedirectOnClose:', shouldRedirectOnClose);
                    setShowResultDialog(false);
                    if (shouldRedirectOnClose) {
                      const interventionUrl = `/interventi?ai=${updatedReportData.intervention_id}`;
                      console.log('✅ Refresh e redirect alla pagina intervento:', interventionUrl);
                      window.location.href = interventionUrl;
                    } else {
                      console.log('⏸️ Nessun redirect necessario');
                    }
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox immagine a tutto schermo */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[70] bg-black bg-opacity-90 flex items-center justify-center" onClick={() => setLightboxUrl(null)}>
          <div className="max-w-5xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            <Image src={lightboxUrl} alt="Preview" width={1600} height={1200} className="w-auto h-auto max-w-full max-h-[85vh] object-contain" />
          </div>
          <button className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2" onClick={() => setLightboxUrl(null)}>
            <XCircle size={28} />
          </button>
        </div>
      )}
    </div>
  );
} 