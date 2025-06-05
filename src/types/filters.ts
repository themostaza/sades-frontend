// Device Groups (Apparecchiature)
export interface DeviceGroup {
  id: number;
  label: string;
  external_id: string;
  created_at: string;
  updated_at: string;
}

// Device Brands (Marchi)
export interface DeviceBrand {
  id: number;
  label: string;
  external_id: string;
  created_at: string;
  updated_at: string;
}

// Device Subgroups
export interface DeviceSubgroup {
  id: number;
  label: string;
  external_id: string;
  device_group_id: number;
  created_at: string;
  updated_at: string;
}

// Rechargeable Gas Types
export interface RechargeableGasType {
  id: number;
  label: string;
  created_at: string;
  updated_at: string;
}

// Gas Compressor Types
export interface GasCompressorType {
  id: number;
  label: string;
  created_at: string;
  updated_at: string;
}

// Device Families (Modelli)
export interface DeviceFamily {
  id: string;
  label: string;
}

// Device Subfamilies (Sottofamiglie)
export interface DeviceSubfamily {
  id: string;
  device_family_id: string;
  label: string;
} 