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
    to_warehouse_id: string;
    quantity: number;
    notes?: string;
  }[];
  global_notes?: string;
}

export interface BulkUnloadingRequest {
  unloadings: {
    article_id: string;
    from_warehouse_id: string;
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
  // Summary information for errors
  summary?: {
    total_attempted: number;
    successful: number;
    failed: number;
    most_common_errors?: string[];
  };
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

// Inventory Activities Types
export type InventoryActivityType = 
  | 'exceeding_quantities_from_report'
  | 'verify_created_report_for_approval'
  | 'check_inventory_after_report_approved';

export type InventoryActivityStatus = 'to_do' | 'done';

export interface InventoryActivity {
  id: string; // UUID
  type: InventoryActivityType;
  status: InventoryActivityStatus;
  data?: object; // Additional data in JSON format
  report_id?: number | null;
  assistance_intervention_id?: number | null;
  done_at?: string | null; // ISO timestamp
  done_by?: string | null; // UUID of user who completed
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface CreateInventoryActivityRequest {
  activities: Array<{
    type: InventoryActivityType;
    status: InventoryActivityStatus;
    data?: object;
    report_id?: number;
    assistance_intervention_id?: number;
    done_at?: string;
    done_by?: string;
  }>;
}

export interface CreateInventoryActivitiesResponse {
  message: string;
  activities: InventoryActivity[];
}

export interface UpdateInventoryActivityRequest {
  type?: InventoryActivityType;
  status?: InventoryActivityStatus;
  data?: object;
  report_id?: number;
  assistance_intervention_id?: number;
  done_at?: string;
  done_by?: string;
}

export interface UpdateInventoryActivityResponse {
  message: string;
  activity: InventoryActivity;
}

export interface InventoryActivitiesResponse {
  activities: InventoryActivity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InventoryActivitiesFilters {
  type?: InventoryActivityType;
  status?: InventoryActivityStatus;
  created_from?: string; // YYYY-MM-DD
  created_to?: string; // YYYY-MM-DD
  report_id?: number;
  assistance_intervention_id?: number;
  page?: number;
  limit?: number;
}

// Complete Activity Types
export interface WarehouseTransfer {
  warehouse_id: string;
  quantity: number;
}

export interface DistributionWarehouse {
  warehouse_id: string;
  quantity: number;
}

export interface CompleteActivityRequest {
  activity_id: string;
  warehouse_transfers?: WarehouseTransfer[];
  distribution_warehouses?: DistributionWarehouse[];
}

export interface ActivityMovement {
  movement_id: string;
  article_id: string;
  article_description: string;
  from_warehouse?: string;
  to_warehouse?: string;
  quantity: number;
  notes?: string;
  created_at: string;
}

export interface CompleteActivityResponse {
  message: string;
  activity_id: string;
  case_type: 'ECCESSO' | 'PARI' | 'USO_PARZIALE';
  movements_executed: ActivityMovement[];
  summary: {
    article_id: string;
    report_quantity: number;
    intervention_quantity: number;
    total_movements: number;
  };
}