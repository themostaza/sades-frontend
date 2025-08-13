// Types for Intervention Reports

export interface CreateInterventionReportRequest {
  work_hours: number;
  travel_hours: number;
  customer_notes: string;
  is_failed: boolean;
  failure_reason?: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT';
  items: CreateInterventionReportItem[];
}

export interface CreateInterventionReportItem {
  // Backend expects equipment_id for creation
  equipment_id: number | null;
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
  images: InterventionReportImage[];
  articles: InterventionReportArticle[];
}

export interface InterventionReportImage {
  id?: number;
  file_name: string;
  file_url: string;
}

export interface InterventionReportArticle {
  article_id: string;
  quantity: number;
}

// Response types
export interface InterventionReportSummary {
  id: number;
  intervention_id: number;
  total_work_hours: number;
  customer_notes: string;
  is_failed: boolean;
  failure_reason?: string;
  status: string;
  signature_url?: string;
  created_at: string;
  created_by: string;
  updated_by: string;
}

export interface InterventionReportDetail extends InterventionReportSummary {
  work_hours: number;
  travel_hours: number;
  items: InterventionReportItemDetail[];
}

export interface InterventionReportItemDetail {
  id: number;
  // In detail responses we receive the historical field name
  intervention_equipment_id: number;
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
  images?: InterventionReportImage[];
  articles?: InterventionReportArticleDetail[];
}

export interface InterventionReportArticleDetail {
  id: string;
  article_id: string;
  quantity: number;
  article_name?: string;
  article_description?: string;
} 