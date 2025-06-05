import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  DeviceGroup, 
  DeviceBrand, 
  DeviceSubgroup, 
  RechargeableGasType, 
  GasCompressorType, 
  DeviceFamily, 
  DeviceSubfamily 
} from '../types/filters';

interface UseFiltersReturn {
  // Data
  deviceGroups: DeviceGroup[];
  deviceBrands: DeviceBrand[];
  deviceSubgroups: DeviceSubgroup[];
  rechargeableGasTypes: RechargeableGasType[];
  gasCompressorTypes: GasCompressorType[];
  deviceFamilies: DeviceFamily[];
  deviceSubfamilies: DeviceSubfamily[];
  
  // Loading states
  loading: {
    deviceGroups: boolean;
    deviceBrands: boolean;
    deviceSubgroups: boolean;
    rechargeableGasTypes: boolean;
    gasCompressorTypes: boolean;
    deviceFamilies: boolean;
    deviceSubfamilies: boolean;
  };
  
  // Error states
  errors: {
    deviceGroups: string | null;
    deviceBrands: string | null;
    deviceSubgroups: string | null;
    rechargeableGasTypes: string | null;
    gasCompressorTypes: string | null;
    deviceFamilies: string | null;
    deviceSubfamilies: string | null;
  };
  
  // Functions
  fetchDeviceSubfamilies: (familyId: string) => Promise<void>;
}

export const useFilters = (): UseFiltersReturn => {
  const { token } = useAuth();
  
  // Data states
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([]);
  const [deviceBrands, setDeviceBrands] = useState<DeviceBrand[]>([]);
  const [deviceSubgroups, setDeviceSubgroups] = useState<DeviceSubgroup[]>([]);
  const [rechargeableGasTypes, setRechargeableGasTypes] = useState<RechargeableGasType[]>([]);
  const [gasCompressorTypes, setGasCompressorTypes] = useState<GasCompressorType[]>([]);
  const [deviceFamilies, setDeviceFamilies] = useState<DeviceFamily[]>([]);
  const [deviceSubfamilies, setDeviceSubfamilies] = useState<DeviceSubfamily[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState({
    deviceGroups: false,
    deviceBrands: false,
    deviceSubgroups: false,
    rechargeableGasTypes: false,
    gasCompressorTypes: false,
    deviceFamilies: false,
    deviceSubfamilies: false,
  });
  
  // Error states
  const [errors, setErrors] = useState({
    deviceGroups: null as string | null,
    deviceBrands: null as string | null,
    deviceSubgroups: null as string | null,
    rechargeableGasTypes: null as string | null,
    gasCompressorTypes: null as string | null,
    deviceFamilies: null as string | null,
    deviceSubfamilies: null as string | null,
  });

  // Generic fetch function
  const fetchData = async <T>(
    endpoint: string,
    setData: (data: T[]) => void,
    loadingKey: keyof typeof loading,
    errorKey: keyof typeof errors
  ) => {
    if (!token) return;

    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    setErrors(prev => ({ ...prev, [errorKey]: null }));

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: T[] = await response.json();
      setData(data);
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      setErrors(prev => ({ ...prev, [errorKey]: error instanceof Error ? error.message : 'Unknown error' }));
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Fetch device subfamilies by family ID
  const fetchDeviceSubfamilies = async (familyId: string) => {
    if (!token) return;

    setLoading(prev => ({ ...prev, deviceSubfamilies: true }));
    setErrors(prev => ({ ...prev, deviceSubfamilies: null }));

    try {
      const response = await fetch(`/api/device-families/${familyId}/subfamilies`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DeviceSubfamily[] = await response.json();
      setDeviceSubfamilies(data);
    } catch (error) {
      console.error('Error fetching device subfamilies:', error);
      setErrors(prev => ({ ...prev, deviceSubfamilies: error instanceof Error ? error.message : 'Unknown error' }));
    } finally {
      setLoading(prev => ({ ...prev, deviceSubfamilies: false }));
    }
  };

  // Fetch all filter data on mount
  useEffect(() => {
    if (!token) return;

    // Fetch all filter data
    fetchData('/api/device-groups', setDeviceGroups, 'deviceGroups', 'deviceGroups');
    fetchData('/api/device-brands', setDeviceBrands, 'deviceBrands', 'deviceBrands');
    fetchData('/api/device-subgroups', setDeviceSubgroups, 'deviceSubgroups', 'deviceSubgroups');
    fetchData('/api/rechargeable-gas-types', setRechargeableGasTypes, 'rechargeableGasTypes', 'rechargeableGasTypes');
    fetchData('/api/gas-compressor-types', setGasCompressorTypes, 'gasCompressorTypes', 'gasCompressorTypes');
    fetchData('/api/device-families', setDeviceFamilies, 'deviceFamilies', 'deviceFamilies');
  }, [token]);

  return {
    deviceGroups,
    deviceBrands,
    deviceSubgroups,
    rechargeableGasTypes,
    gasCompressorTypes,
    deviceFamilies,
    deviceSubfamilies,
    loading,
    errors,
    fetchDeviceSubfamilies,
  };
}; 