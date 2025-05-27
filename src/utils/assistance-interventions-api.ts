// Utility functions per le API degli interventi di assistenza

import {
  AssistanceInterventionsApiResponse,
  AssistanceInterventionDetail,
  CreateAssistanceInterventionRequest,
  UpdateAssistanceInterventionRequest,
  FailedInterventionReason,
  AssistanceInterventionsQueryParams
} from '../types/assistance-interventions';

// Base URL per le API
const API_BASE = '/api';

// Helper per costruire headers con autenticazione
const getAuthHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Helper per costruire query string
const buildQueryString = (params: AssistanceInterventionsQueryParams): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });
  
  return searchParams.toString();
};

// API Functions

/**
 * Recupera la lista degli interventi di assistenza con filtri e paginazione
 */
export const fetchAssistanceInterventions = async (
  params: AssistanceInterventionsQueryParams = {},
  token?: string
): Promise<AssistanceInterventionsApiResponse> => {
  const queryString = buildQueryString(params);
  const url = `${API_BASE}/assistance-interventions${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch assistance interventions: ${response.status}`);
  }
  
  return response.json();
};

/**
 * Recupera i dettagli di un singolo intervento di assistenza
 */
export const fetchAssistanceInterventionDetail = async (
  id: number | string,
  token?: string
): Promise<AssistanceInterventionDetail> => {
  const response = await fetch(`${API_BASE}/assistance-interventions/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch assistance intervention detail: ${response.status}`);
  }
  
  return response.json();
};

/**
 * Crea un nuovo intervento di assistenza
 */
export const createAssistanceIntervention = async (
  data: CreateAssistanceInterventionRequest,
  token?: string
): Promise<AssistanceInterventionDetail> => {
  const response = await fetch(`${API_BASE}/assistance-interventions`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create assistance intervention: ${response.status}`);
  }
  
  return response.json();
};

/**
 * Aggiorna un intervento di assistenza esistente
 */
export const updateAssistanceIntervention = async (
  id: number | string,
  data: UpdateAssistanceInterventionRequest,
  token?: string
): Promise<AssistanceInterventionDetail> => {
  const response = await fetch(`${API_BASE}/assistance-interventions/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update assistance intervention: ${response.status}`);
  }
  
  return response.json();
};

/**
 * Elimina un intervento di assistenza
 */
export const deleteAssistanceIntervention = async (
  id: number | string,
  token?: string
): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE}/assistance-interventions/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete assistance intervention: ${response.status}`);
  }
  
  return response.json();
};

/**
 * Genera e scarica il PDF di un intervento di assistenza
 */
export const downloadAssistanceInterventionPDF = async (
  id: number | string,
  token?: string
): Promise<Blob> => {
  const response = await fetch(`${API_BASE}/assistance-interventions/${id}/pdf`, {
    method: 'GET',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to generate PDF: ${response.status}`);
  }
  
  return response.blob();
};

/**
 * Recupera la lista dei motivi di fallimento degli interventi
 */
export const fetchFailedInterventionReasons = async (
  token?: string
): Promise<FailedInterventionReason[]> => {
  const response = await fetch(`${API_BASE}/failed-intervention-reasons`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch failed intervention reasons: ${response.status}`);
  }
  
  return response.json();
};

// Helper per scaricare il PDF
export const downloadPDFFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}; 