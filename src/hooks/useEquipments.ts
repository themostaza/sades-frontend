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
    console.log('========================================');
    console.log('🔵 [useEquipments] Starting fetchEquipments');
    console.log('🔵 [useEquipments] Params:', params);
    console.log('🔵 [useEquipments] Has token:', !!token);
    console.log('========================================');
    
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

      const url = `/api/equipments?${searchParams.toString()}`;
      console.log('🔵 [useEquipments] Fetching URL:', url);
      console.log('🔵 [useEquipments] Headers:', getAuthHeaders());

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      console.log('🔵 [useEquipments] Response status:', response.status);
      console.log('🔵 [useEquipments] Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [useEquipments] Error response:', errorText);
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }

      const data: EquipmentsApiResponse = await response.json();
      console.log('✅ [useEquipments] Success! Data received:');
      console.log('✅ [useEquipments] Equipments count:', data.data?.length || 0);
      console.log('✅ [useEquipments] Total items:', data.meta?.total || 0);
      console.log('✅ [useEquipments] Current page:', data.meta?.page);
      console.log('✅ [useEquipments] Total pages:', data.meta?.totalPages);
      console.log('✅ [useEquipments] First equipment:', data.data?.[0]);
      console.log('========================================');
      
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
      console.error('💥 [useEquipments] Error fetching equipments:', err);
      console.error('💥 [useEquipments] Error type:', err instanceof Error ? 'Error' : typeof err);
      console.error('💥 [useEquipments] Error message:', err instanceof Error ? err.message : String(err));
      console.error('💥 [useEquipments] Error stack:', err instanceof Error ? err.stack : 'No stack');
      console.log('========================================');
      
      const errorMessage = err instanceof Error ? err.message : 'Errore nel caricamento delle apparecchiature';
      
      setState(prev => ({
        ...prev,
        equipments: [],
        loading: false,
        error: errorMessage,
      }));
    }
  }, [getAuthHeaders, token]);

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