import { supabase } from '../supabase';
import type { AnalyticsResult } from './analytics';

export interface SavedTelemetryPayload {
  telemetryId: string;
  analyticsId: string;
  deviceId: string;
  locationId: string;
  temperature: number;
  humidity: number;
  analytics: AnalyticsResult;
  createdAt: string;
}

/**
 * Fetches device info including active location_id from iot_devices.
 */
export async function getDeviceWithLocation(deviceId: string) {
  if (!supabase) throw new Error('Supabase client is not initialized');

  const { data, error } = await supabase
    .from('iot_devices')
    .select('device_id, device_name, is_active, location_id')
    .eq('device_id', deviceId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Fetches all registered IoT devices with location details.
 */
export async function getAllDevices() {
  if (!supabase) throw new Error('Supabase client is not initialized');

  const { data, error } = await supabase
    .from('iot_devices')
    .select(`
      device_id,
      device_name,
      is_active,
      location_id,
      created_at,
      iot_locations (
        id,
        location_name,
        city
      )
    `)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Toggles or explicitly sets is_active status for an IoT device in iot_devices.
 */
export async function toggleDeviceStatus(deviceId: string, targetStatus?: boolean) {
  if (!supabase) throw new Error('Supabase client is not initialized');

  let newStatus = targetStatus;
  if (newStatus === undefined) {
    const existing = await getDeviceWithLocation(deviceId);
    if (!existing) {
      throw new Error(`Device ${deviceId} not found`);
    }
    newStatus = !existing.is_active;
  }

  const { data, error } = await supabase
    .from('iot_devices')
    .update({ is_active: newStatus })
    .eq('device_id', deviceId)
    .select(`
      device_id,
      device_name,
      is_active,
      location_id,
      iot_locations (
        id,
        location_name,
        city
      )
    `)
    .single();

  if (error || !data) {
    throw new Error(`Failed to update device status: ${error?.message || 'Unknown error'}`);
  }

  return data;
}

/**
 * Updates active location_id for a device in iot_devices.
 */
export async function updateDeviceLocation(deviceId: string, locationId: string) {
  if (!supabase) throw new Error('Supabase client is not initialized');

  const { data, error } = await supabase
    .from('iot_devices')
    .update({ location_id: locationId })
    .eq('device_id', deviceId)
    .select(`
      device_id,
      device_name,
      is_active,
      location_id,
      iot_locations (
        id,
        location_name,
        city
      )
    `)
    .single();

  if (error || !data) {
    throw new Error(`Failed to update device location: ${error?.message || 'Unknown error'}`);
  }

  return data;
}

/**
 * Fetches all registered locations from iot_locations.
 */
export async function getAllLocations() {
  if (!supabase) throw new Error('Supabase client is not initialized');

  const { data, error } = await supabase
    .from('iot_locations')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Fetches a single location by ID from iot_locations.
 */
export async function getLocationById(id: string) {
  if (!supabase) throw new Error('Supabase client is not initialized');

  const { data, error } = await supabase
    .from('iot_locations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Creates or updates a location record in iot_locations.
 */
export async function createOrUpdateLocation(id: string, locationName: string, city?: string) {
  if (!supabase) throw new Error('Supabase client is not initialized');

  const { data, error } = await supabase
    .from('iot_locations')
    .upsert(
      {
        id,
        location_name: locationName,
        city: city || null,
        is_active: true,
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to save location: ${error?.message || 'Unknown error'}`);
  }

  return data;
}

/**
 * Auto-registers a missing device with a default location_id.
 */
export async function registerDeviceIfMissing(
  deviceId: string,
  deviceName?: string,
  locationId = 'LOC-BANDUNG-01'
): Promise<string> {
  if (!supabase) throw new Error('Supabase client is not initialized');

  const targetLocation = locationId || 'LOC-BANDUNG-01';

  await supabase
    .from('iot_devices')
    .upsert(
      {
        device_id: deviceId,
        device_name: deviceName || `Device ${deviceId}`,
        location_id: targetLocation,
        is_active: true,
      },
      { onConflict: 'device_id' }
    );

  return targetLocation;
}

/**
 * Records raw telemetry and location_id into iot_telemetry_logs, and calculated analytics into iot_room_analytics.
 */
export async function recordTelemetry(
  deviceId: string,
  temperature: number,
  humidity: number,
  analytics: AnalyticsResult,
  locationId?: string
): Promise<SavedTelemetryPayload> {
  if (!supabase) throw new Error('Supabase client is not initialized');

  const targetLocationId = locationId || 'LOC-BANDUNG-01';

  // 1. Save raw telemetry log with relational location_id
  const { data: telemetry, error: telemetryError } = await supabase
    .from('iot_telemetry_logs')
    .insert([
      {
        device_id: deviceId,
        location_id: targetLocationId,
        temperature,
        humidity,
      },
    ])
    .select('id, created_at')
    .single();

  if (telemetryError || !telemetry) {
    throw new Error(`Failed to insert telemetry log: ${telemetryError?.message || 'Unknown error'}`);
  }

  // 2. Save calculated analytics
  const { data: roomAnalytics, error: analyticsError } = await supabase
    .from('iot_room_analytics')
    .insert([
      {
        telemetry_id: telemetry.id,
        dew_point: analytics.dewPoint,
        mould_risk: analytics.mouldRisk,
        room_status: analytics.roomStatus,
      },
    ])
    .select('id')
    .single();

  if (analyticsError || !roomAnalytics) {
    throw new Error(`Failed to insert room analytics: ${analyticsError?.message || 'Unknown error'}`);
  }

  return {
    telemetryId: telemetry.id,
    analyticsId: roomAnalytics.id,
    deviceId,
    locationId: targetLocationId,
    temperature,
    humidity,
    analytics,
    createdAt: telemetry.created_at,
  };
}

/**
 * Fetches recent telemetry & room analytics history along with location information.
 */
export async function fetchTelemetryHistory(deviceId?: string, limit = 20) {
  if (!supabase) throw new Error('Supabase client is not initialized');

  let query = supabase
    .from('iot_telemetry_logs')
    .select(`
      id,
      device_id,
      location_id,
      temperature,
      humidity,
      created_at,
      iot_locations (
        id,
        location_name,
        city
      ),
      iot_room_analytics (
        id,
        dew_point,
        mould_risk,
        room_status
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (deviceId) {
    query = query.eq('device_id', deviceId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data;
}
