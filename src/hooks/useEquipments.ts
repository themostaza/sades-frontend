import { useState, useCallback } from 'react';
import { Equipment, EquipmentsApiResponse, EquipmentQueryParams } from '../types/equipment';
import { useAuth } from '../contexts/AuthContext';

interface UseEquipmentsState {
  equipments: Equipment[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

interface UseEquipmentsReturn extends UseEquipmentsState {
  fetchEquipments: (params?: EquipmentQueryParams) => Promise<void>;
  refetch: () => Promise<void>;
  clearError: () => void;
}

export function useEquipments(): UseEquipmentsReturn {
  const { token } = useAuth();
  const [state, setState] = useState<UseEquipmentsState>({
    equipments: [],
    loading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const [lastParams, setLastParams] = useState<EquipmentQueryParams>({});

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }, [token]);

  const fetchEquipments = useCallback(async (params: EquipmentQueryParams = {}) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      setLastParams(params);

      const searchParams = new URLSearchParams();
      
      // Set default values
      searchParams.append('page', params.page || '1');
      searchParams.append('skip', params.skip || '20');
      
      // Add optional parameters
      if (params.query?.trim()) {
        searchParams.append('query', params.query.trim());
      }
      if (params.customer_id) {
        searchParams.append('customer_id', params.customer_id);
      }
      if (params.customer_location_id) {
        searchParams.append('customer_location_id', params.customer_location_id);
      }
      if (params.group_id) {
        searchParams.append('group_id', params.group_id);
      }
      if (params.brand_id) {
        searchParams.append('brand_id', params.brand_id);
      }
      if (params.family_id) {
        searchParams.append('family_id', params.family_id);
      }
      if (params.subfamily_id) {
        searchParams.append('subfamily_id', params.subfamily_id);
      }

      const response = await fetch(`/api/equipments?${searchParams.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }

      const data: EquipmentsApiResponse = await response.json();
      
      setState(prev => ({
        ...prev,
        equipments: data.data,
        currentPage: data.meta.page,
        totalPages: data.meta.totalPages,
        totalItems: data.meta.total,
        loading: false,
        error: null,
      }));
      
    } catch (err) {
      console.error('Error fetching equipments:', err);
      const errorMessage = err instanceof Error ? err.message : 'Errore nel caricamento delle apparecchiature';
      
      setState(prev => ({
        ...prev,
        equipments: [],
        loading: false,
        error: errorMessage,
      }));
    }
  }, [getAuthHeaders]);

  const refetch = useCallback(() => {
    return fetchEquipments(lastParams);
  }, [fetchEquipments, lastParams]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    fetchEquipments,
    refetch,
    clearError,
  };
}