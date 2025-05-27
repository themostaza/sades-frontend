import { CreateEquipmentRequest, UpdateEquipmentRequest } from '../types/equipment';

// Validation errors interface
export interface ValidationError {
  field: string;
  message: string;
}

// Validate date format (YYYY-MM-DD)
export function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
}

// Validate datetime format (ISO 8601)
export function isValidDateTimeFormat(datetime: string): boolean {
  const parsedDate = new Date(datetime);
  return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
}

// Validate phone number format (basic validation)
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Validate URL format
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Validate create equipment request
export function validateCreateEquipmentRequest(data: CreateEquipmentRequest): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields validation
  if (!data.description || data.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Description is required' });
  }

  if (!data.customer_id || data.customer_id <= 0) {
    errors.push({ field: 'customer_id', message: 'Valid customer_id is required' });
  }

  if (!data.brand_id || data.brand_id <= 0) {
    errors.push({ field: 'brand_id', message: 'Valid brand_id is required' });
  }

  // Optional fields validation
  if (data.sale_date && !isValidDateFormat(data.sale_date)) {
    errors.push({ field: 'sale_date', message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (data.fgas_check_date && !isValidDateFormat(data.fgas_check_date)) {
    errors.push({ field: 'fgas_check_date', message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (data.tech_sheet_uploaded_at && !isValidDateFormat(data.tech_sheet_uploaded_at)) {
    errors.push({ field: 'tech_sheet_uploaded_at', message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (data.machine_design_uploaded_at && !isValidDateFormat(data.machine_design_uploaded_at)) {
    errors.push({ field: 'machine_design_uploaded_at', message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (data.electrical_diagram_uploaded_at && !isValidDateFormat(data.electrical_diagram_uploaded_at)) {
    errors.push({ field: 'electrical_diagram_uploaded_at', message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (data.service_manual_uploaded_at && !isValidDateFormat(data.service_manual_uploaded_at)) {
    errors.push({ field: 'service_manual_uploaded_at', message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (data.instruction_manual_uploaded_at && !isValidDateFormat(data.instruction_manual_uploaded_at)) {
    errors.push({ field: 'instruction_manual_uploaded_at', message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (data.created_at && !isValidDateTimeFormat(data.created_at)) {
    errors.push({ field: 'created_at', message: 'Invalid datetime format. Use ISO 8601 format' });
  }

  if (data.updated_at && !isValidDateTimeFormat(data.updated_at)) {
    errors.push({ field: 'updated_at', message: 'Invalid datetime format. Use ISO 8601 format' });
  }

  if (data.tech_assist_phone_num && !isValidPhoneNumber(data.tech_assist_phone_num)) {
    errors.push({ field: 'tech_assist_phone_num', message: 'Invalid phone number format' });
  }

  // URL validations
  if (data.tech_sheet_url && !isValidUrl(data.tech_sheet_url)) {
    errors.push({ field: 'tech_sheet_url', message: 'Invalid URL format' });
  }

  if (data.machine_design_url && !isValidUrl(data.machine_design_url)) {
    errors.push({ field: 'machine_design_url', message: 'Invalid URL format' });
  }

  if (data.electrical_diagram_url && !isValidUrl(data.electrical_diagram_url)) {
    errors.push({ field: 'electrical_diagram_url', message: 'Invalid URL format' });
  }

  if (data.service_manual_url && !isValidUrl(data.service_manual_url)) {
    errors.push({ field: 'service_manual_url', message: 'Invalid URL format' });
  }

  if (data.instruction_manual_url && !isValidUrl(data.instruction_manual_url)) {
    errors.push({ field: 'instruction_manual_url', message: 'Invalid URL format' });
  }

  return errors;
}

// Validate update equipment request
export function validateUpdateEquipmentRequest(data: UpdateEquipmentRequest): ValidationError[] {
  const errors: ValidationError[] = [];

  // ID validation
  if (!data.id || data.id <= 0) {
    errors.push({ field: 'id', message: 'Valid equipment ID is required' });
  }

  // Optional fields validation (same as create, but all optional except ID)
  if (data.description !== undefined && (!data.description || data.description.trim().length === 0)) {
    errors.push({ field: 'description', message: 'Description cannot be empty if provided' });
  }

  if (data.customer_id !== undefined && data.customer_id <= 0) {
    errors.push({ field: 'customer_id', message: 'Valid customer_id is required if provided' });
  }

  if (data.brand_id !== undefined && data.brand_id <= 0) {
    errors.push({ field: 'brand_id', message: 'Valid brand_id is required if provided' });
  }

  // Date validations
  if (data.sale_date && !isValidDateFormat(data.sale_date)) {
    errors.push({ field: 'sale_date', message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (data.fgas_check_date && !isValidDateFormat(data.fgas_check_date)) {
    errors.push({ field: 'fgas_check_date', message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (data.tech_sheet_uploaded_at && !isValidDateFormat(data.tech_sheet_uploaded_at)) {
    errors.push({ field: 'tech_sheet_uploaded_at', message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (data.machine_design_uploaded_at && !isValidDateFormat(data.machine_design_uploaded_at)) {
    errors.push({ field: 'machine_design_uploaded_at', message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (data.electrical_diagram_uploaded_at && !isValidDateFormat(data.electrical_diagram_uploaded_at)) {
    errors.push({ field: 'electrical_diagram_uploaded_at', message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (data.service_manual_uploaded_at && !isValidDateFormat(data.service_manual_uploaded_at)) {
    errors.push({ field: 'service_manual_uploaded_at', message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (data.instruction_manual_uploaded_at && !isValidDateFormat(data.instruction_manual_uploaded_at)) {
    errors.push({ field: 'instruction_manual_uploaded_at', message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (data.created_at && !isValidDateTimeFormat(data.created_at)) {
    errors.push({ field: 'created_at', message: 'Invalid datetime format. Use ISO 8601 format' });
  }

  if (data.updated_at && !isValidDateTimeFormat(data.updated_at)) {
    errors.push({ field: 'updated_at', message: 'Invalid datetime format. Use ISO 8601 format' });
  }

  if (data.tech_assist_phone_num && !isValidPhoneNumber(data.tech_assist_phone_num)) {
    errors.push({ field: 'tech_assist_phone_num', message: 'Invalid phone number format' });
  }

  // URL validations
  if (data.tech_sheet_url && !isValidUrl(data.tech_sheet_url)) {
    errors.push({ field: 'tech_sheet_url', message: 'Invalid URL format' });
  }

  if (data.machine_design_url && !isValidUrl(data.machine_design_url)) {
    errors.push({ field: 'machine_design_url', message: 'Invalid URL format' });
  }

  if (data.electrical_diagram_url && !isValidUrl(data.electrical_diagram_url)) {
    errors.push({ field: 'electrical_diagram_url', message: 'Invalid URL format' });
  }

  if (data.service_manual_url && !isValidUrl(data.service_manual_url)) {
    errors.push({ field: 'service_manual_url', message: 'Invalid URL format' });
  }

  if (data.instruction_manual_url && !isValidUrl(data.instruction_manual_url)) {
    errors.push({ field: 'instruction_manual_url', message: 'Invalid URL format' });
  }

  return errors;
} 