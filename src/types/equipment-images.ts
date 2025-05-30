// Types for Equipment Images API

export interface AddImageRequest {
  image_url: string;
}

export interface EquipmentImage {
  id: number;
  equipment_id: number;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export interface DeleteImageResponse {
  success: boolean;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
} 