// Tipi per le API degli interventi di assistenza

export interface ConnectedEquipment {
  id: number;
  model: string | null;
  description: string;
  serial_number: string | null;
  linked_serials?: string | null;
  brand_name?: string;
  subfamily_name?: string;
  customer_name?: string;
}

export interface ConnectedArticle {
  id: string;
  pnc_code: string | null;
  short_description: string;
  description: string;
  quantity: number;
}

export interface AssistanceIntervention {
  id: number;
  date: string;
  time_slot: string;
  from_datetime: string;
  to_datetime: string;
  customer_location_id: string;
  call_code: string;
  approved_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  invoiced_by: string | null;
  invoiced_at: string | null;
  company_name: string;
  assigned_to_name: string;
  assigned_to_surname: string | null;
  approved_by_name: string | null;
  approved_by_surname: string | null;
  cancelled_by_name: string | null;
  cancelled_by_surname: string | null;
  invoiced_by_name: string | null;
  invoiced_by_surname: string | null;
  zone_label: string;
  status_label: string;
  status_color: string;
  location_address: string;
  location_city: string;
  type_label: string;
  report_id: number | null;
  report_is_failed: boolean | null;
  calendar_notes?: string;
  assigned_to?: string | null;
  approved_by?: string | null;
  manual_check?: boolean;
}

export interface AssistanceInterventionDetail {
  id: number;
  date: string;
  time_slot: string;
  from_datetime: string;
  to_datetime: string;
  company_name: string;
  assigned_to_name: string;
  assigned_to_surname: string;
  zone_label: string;
  status_label: string;
  status_color: string;
  customer_id: number;
  customer_location_id: string;
  type_id: number;
  zone_id: number;
  address: string | null;
  flg_home_service: boolean;
  flg_discount_home_service: boolean;
  quotation_price: string;
  opening_hours: string;
  assigned_to: string;
  created_by: string;
  call_code: string;
  internal_notes: string;
  status_id: number;
  type_label: string;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  invoiced_by: string | null;
  invoiced_at: string | null;
  location_address: string | null;
  location_city: string | null;
  location_cap: string | null;
  location_state: string | null;
  location_company_name: string | null;
  report_id: number | null;
  report_is_failed: boolean | null;
  connected_equipment: ConnectedEquipment[];
  connected_articles: ConnectedArticle[];
  calendar_notes?: string;
  manual_check?: boolean;
}

export interface CreateAssistanceInterventionRequest {
  customer_id: number;
  type_id: number;
  zone_id: number;
  customer_location_id: string;
  flg_home_service: boolean;
  flg_discount_home_service: boolean;
  date: string | null;
  time_slot: string | null;
  from_datetime: string | null;
  to_datetime: string | null;
  quotation_price: number;
  opening_hours: string;
  assigned_to: string;
  call_code: string;
  internal_notes: string;
  status_id: number;
  equipments: number[];
  articles: Array<{
    article_id: string;
    quantity: number;
  }>;
}

export interface UpdateAssistanceInterventionRequest {
  customer_id: number;
  type_id: number;
  zone_id: number;
  customer_location_id: string;
  flg_home_service: boolean;
  flg_discount_home_service: boolean;
  date: string | null;
  time_slot: string | null;
  from_datetime: string | null;
  to_datetime: string | null;
  quotation_price: number;
  opening_hours: string;
  assigned_to: string;
  call_code: string;
  internal_notes: string;
  status_id: number;
  approved_by?: string;
  approved_at?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  invoiced_by?: string;
  invoiced_at?: string;
  equipments: number[];
  articles: Array<{
    article_id: string;
    quantity: number;
  }>;
  calendar_notes?: string;
  manual_check?: boolean;
}

export interface AssistanceInterventionsApiResponse {
  data: AssistanceIntervention[];
  meta: {
    total: number;
    page: number;
    skip: number;
    totalPages: number;
  };
}

export interface FailedInterventionReason {
  id: number;
  label: string;
}

// Parametri per le query API
export interface AssistanceInterventionsQueryParams {
  query?: string;
  page?: number;
  skip?: number;
  company_name?: string;
  assigned_to_name?: string;
  date?: string;
  from_date?: string;
  to_date?: string;
  zone_id?: string;
  status_id?: string;
  customer_id?: string;
} 