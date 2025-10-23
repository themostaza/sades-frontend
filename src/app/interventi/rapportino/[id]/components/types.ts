import type { ConnectedEquipment, ConnectedArticle } from '../../../../../types/assistance-interventions';

// Tipi specifici per l'editing dei rapportini
export interface SelectedArticle {
  article: ConnectedArticle;
  quantity: number;
  relationId?: number; // ID della relazione nel DB (undefined per nuovi articoli)
}

export interface AttachedFile {
  id: string;
  name: string;
  uploadDate: string;
  url: string;
}

export interface EditableEquipmentItem {
  id: string;
  originalId?: number; // ID originale dal DB, undefined per nuovi items
  selectedEquipment: ConnectedEquipment | null;
  selectedArticles: SelectedArticle[];
  notes: string;
  
  // Gas management
  hasGas: boolean;
  tipologiaCompressore: string;
  nuovaInstallazione: string;
  tipologiaGasCaricato: string;
  quantitaGasCaricato: string;
  caricaMax: string;
  modelloCompressore: string;
  matricolaCompressore: string;
  numeroUnivoco: string;
  serviziAggiuntivi: string[];
  tipologiaGasRecuperato: string;
  quantitaGasRecuperato: string;
  
  // Images
  hasImages: boolean;
  images: AttachedFile[];
}

// Re-export dei tipi necessari per comodità
export type { ConnectedEquipment, ConnectedArticle };

