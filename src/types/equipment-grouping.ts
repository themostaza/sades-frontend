// Types for Equipment Grouping API

export interface LinkEquipmentRequest {
  equipment_id: number;
}

export interface RemoveEquipmentFromGroupingResponse {
  success: boolean;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
} 