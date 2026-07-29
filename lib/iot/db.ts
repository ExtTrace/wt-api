import { supabase } from '../supabase';
import type { AnalyticsResult } from './analytics';

export interface SavedTelemetryPayload {
  telemetryId: string;
  analyticsId: string;
  deviceId: string;
  temperature: number;
  humidity: number;
  analytics: AnalyticsResult;
  createdAt: string;
}

/**
 * Verifies if device_id exists in iot_devices master table.
 */
export async function verifyDevice(deviceId: string): Promise<boolean> {
  if (!supabase) throw new Error('Supabase client is not initialized');

  const { data, error } = await supabase
    .from('iot_devices')
    .select('device_id, is_active')
    .eq('device_id', deviceId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.is_active !== false;
}

/**
 * Auto-registers a new device if not registered.
 */
export async function registerDeviceIfMissing(deviceId: string, deviceName?: string, location?: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client is not initialized');

  await supabase
    .from('iot_devices')
    .upsert(
      {
        device_id: deviceId,
        device_name: deviceName || `Device ${deviceId}`,
        location: location || 'Ruangan',
        is_active: true,
      },
      { onConflict: 'device_id' }
    );
}

/**
 * Records raw telemetry into iot_telemetry_logs and calculated analytics into iot_room_analytics.
 */
export async function recordTelemetry(
  deviceId: string,
  temperature: number,
  humidity: number,
  analytics: AnalyticsResult
): Promise<SavedTelemetryPayload> {
  if (!supabase) throw new Error('Supabase client is not initialized');

  // 1. Save raw telemetry log
  const { data: telemetry, error: telemetryError } = await supabase
    .from('iot_telemetry_logs')
    .insert([
      {
        device_id: deviceId,
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
    temperature,
    humidity,
    analytics,
    createdAt: telemetry.created_at,
  };
}

/**
 * Fetches recent telemetry & room analytics history.
 */
export async function fetchTelemetryHistory(deviceId?: string, limit = 20) {
  if (!supabase) throw new Error('Supabase client is not initialized');

  let query = supabase
    .from('iot_telemetry_logs')
    .select(`
      id,
      device_id,
      temperature,
      humidity,
      created_at,
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
