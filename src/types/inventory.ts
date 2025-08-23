// Inventory API Types

export interface BulkTransferRequest {
  transfers: {
    article_id: string;
    from_warehouse_id: string;
    to_warehouse_id: string;
    quantity: number;
    notes?: string;
  }[];
  global_notes?: string;
}

export interface BulkLoadingRequest {
  loadings: {
    article_id: string;
    from_warehouse_id: string;
    quantity: number;
    notes?: string;
  }[];
  global_notes?: string;
}

export interface BulkUnloadingRequest {
  unloadings: {
    article_id: string;
    to_warehouse_id: string;
    quantity: number;
    notes?: string;
  }[];
  global_notes?: string;
}

export interface InventoryMovement {
  id: string;
  article_id: string;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  quantity: number;
  type: 'intra' | 'loading' | 'unloading';
  notes: string | null;
  report_id?: string | null;
  intervention_id?: string | null;
  created_at: string;
  updated_at?: string;
  
  // Joined fields
  article_description?: string;
  article_full_description?: string;
  pnc_code?: string;
  from_warehouse_description?: string;
  to_warehouse_description?: string;
  report_id_joined?: string;
  intervention_call_code?: string;
}

export interface BulkOperationResult {
  total_transfers?: number;
  total_loadings?: number;
  total_unloadings?: number;
  successful_transfers?: number;
  successful_loadings?: number;
  successful_unloadings?: number;
  failed_transfers?: number;
  failed_loadings?: number;
  failed_unloadings?: number;
  movements: Array<{
    movement_id: string;
    article_id: string;
    article_description: string;
    from_warehouse?: string;
    to_warehouse?: string;
    quantity: number;
    notes?: string;
    created_at: string;
  }>;
  errors: Array<{
    transfer_index?: number;
    loading_index?: number;
    unloading_index?: number;
    transfer_data?: unknown;
    loading_data?: unknown;
    unloading_data?: unknown;
    error: string;
  }>;
}

export interface BulkOperationResponse {
  message: string;
  data: BulkOperationResult;
}

export interface InventoryMovementsResponse {
  data: InventoryMovement[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface InventoryMovementResponse {
  data: InventoryMovement;
}

export interface InventoryMovementsFilters {
  page?: number;
  limit?: number;
  type?: 'intra' | 'loading' | 'unloading';
  article_id?: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  warehouse_id?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
}
