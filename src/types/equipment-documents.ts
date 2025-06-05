// Types for Equipment Documents API

export interface AddDocumentRequest {
  document_url: string;
  name: string;
}

export interface EquipmentDocument {
  id: number;
  equipment_id: number;
  document_url: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DeleteDocumentResponse {
  success: boolean;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
}

// Document types enum for the equipment
export enum DocumentType {
  TECH_SHEET = 'tech_sheet',
  MACHINE_DESIGN = 'machine_design', 
  ELECTRICAL_DIAGRAM = 'electrical_diagram',
  SERVICE_MANUAL = 'service_manual',
  INSTRUCTION_MANUAL = 'instruction_manual'
}

export interface DocumentTypeInfo {
  key: DocumentType;
  name: string;
  urlField: keyof Equipment;
  uploadedAtField: keyof Equipment;
}

// Equipment interface subset for documents
interface Equipment {
  tech_sheet_url: string | null;
  tech_sheet_uploaded_at: string | null;
  machine_design_url: string | null;
  machine_design_uploaded_at: string | null;
  electrical_diagram_url: string | null;
  electrical_diagram_uploaded_at: string | null;
  service_manual_url: string | null;
  service_manual_uploaded_at: string | null;
  instruction_manual_url: string | null;
  instruction_manual_uploaded_at: string | null;
} 