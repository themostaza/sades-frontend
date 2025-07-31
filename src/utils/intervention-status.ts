import { AssistanceIntervention } from '../types/assistance-interventions';

/**
 * Elenco delle opzioni di stato per i filtri e le visualizzazioni.
 */
export const statusOptions = [
  { key: '', label: 'Tutti gli stati' },
  { key: 'da_assegnare', label: 'Da assegnare' },
  { key: 'attesa_preventivo', label: 'Attesa preventivo' },
  { key: 'attesa_ricambio', label: 'Attesa ricambio' },
  { key: 'in_carico', label: 'In carico' },
  { key: 'da_confermare', label: 'Da confermare' },
  { key: 'completato', label: 'Completato' },
  { key: 'non_completato', label: 'Non completato' },
  { key: 'annullato', label: 'Annullato' },
  { key: 'fatturato', label: 'Fatturato' },
  { key: 'collocamento', label: 'Collocamento' },
];

/**
 * Mappa una chiave di stato (es. 'da_assegnare') al suo corrispondente ID numerico.
 * @param statusKey La chiave testuale dello stato.
 * @returns L'ID numerico o `null` se non trovato.
 */
export const getStatusId = (statusKey: string): number | null => {
  const statusMap: Record<string, number> = {
    'da_assegnare': 1,
    'attesa_preventivo': 2,
    'attesa_ricambio': 3,
    'in_carico': 4,
    'da_confermare': 5,
    'completato': 6,
    'non_completato': 7,
    'annullato': 8,
    'fatturato': 9,
    'collocamento': 10
  };
  return statusMap[statusKey] || null;
};


/**
 * Calcola lo stato di un intervento basandosi su una serie di regole di business.
 * @param intervention L'oggetto intervento da analizzare.
 * @returns Un oggetto con `label` (etichetta leggibile) e `key` (identificatore univoco) dello stato.
 */
export const calculateStatus = (intervention: AssistanceIntervention): { label: string; key: string } => {
  // Priorità massima: se invoiced_by è valorizzato → fatturato
  if (intervention.invoiced_by) {
    return { label: 'Fatturato', key: 'fatturato' };
  }
  
  // Priorità alta: se cancelled_by è valorizzato → annullato
  if (intervention.cancelled_by) {
    return { label: 'Annullato', key: 'annullato' };
  }
  
  // Controllo dei campi obbligatori per l'assegnazione
  const requiredFields = [
    intervention.assigned_to_name,
    intervention.date,
    intervention.time_slot,
    intervention.from_datetime,
    intervention.to_datetime
  ];
  
  // Se uno dei campi obbligatori non è valorizzato → da_assegnare
  if (requiredFields.some(field => !field || field.trim() === '')) {
    return { label: 'Da assegnare', key: 'da_assegnare' };
  }
  
  // Tutti i campi obbligatori sono valorizzati → in_carico
  let currentStatus = { label: 'In carico', key: 'in_carico' };
  
  // Se c'è un report_id → da_confermare
  if (intervention.report_id !== null) {
    currentStatus = { label: 'Da confermare', key: 'da_confermare' };
    
    // Se c'è anche approved_by → controllo report_is_failed
    if (intervention.approved_by_name) {
      if (intervention.report_is_failed === true) {
        currentStatus = { label: 'Non completato', key: 'non_completato' };
      } else if (intervention.report_is_failed === false || intervention.report_is_failed === null) {
        currentStatus = { label: 'Completato', key: 'completato' };
      }
    }
  }
  
  return currentStatus;
};

/**
 * Restituisce le classi CSS di Tailwind per colorare un badge di stato.
 * @param statusKey La chiave dello stato (es. 'completato', 'in_carico').
 * @returns Una stringa contenente le classi CSS per lo stile del badge.
 */
export const getStatusColor = (statusKey: string) => {
  // Mappatura basata sulla chiave del status calcolato
  switch (statusKey) {
    case 'da_assegnare':
      return 'bg-orange-100 text-orange-800';
    case 'attesa_preventivo':
      return 'bg-yellow-100 text-yellow-800';
    case 'attesa_ricambio':
      return 'bg-blue-100 text-blue-800';
    case 'in_carico':
      return 'bg-teal-100 text-teal-800';
    case 'da_confermare':
      return 'bg-purple-100 text-purple-800';
    case 'completato':
      return 'bg-green-100 text-green-800';
    case 'non_completato':
      return 'bg-gray-100 text-gray-800';
    case 'annullato':
      return 'bg-red-100 text-red-800';
    case 'fatturato':
      return 'bg-emerald-100 text-emerald-800';
    case 'collocamento':
      return 'bg-indigo-100 text-indigo-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
