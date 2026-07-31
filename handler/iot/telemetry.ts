import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { computeAnalytics } from '../../lib/iot/analytics';
import { getDeviceWithLocation, registerDeviceIfMissing, recordTelemetry, fetchTelemetryHistory } from '../../lib/iot/db';

export default async function handleTelemetry(req: VercelRequest, res: VercelResponse) {
  // OPTIONS preflight check handled cleanly by Vercel
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client is not configured' });
  }

  try {
    // ─── 1. POST /api/iot/telemetry (Incoming ESP32 Telemetry) ──────
    if (req.method === 'POST') {
      const { device_id, temperature, humidity } = req.body || {};

      // Input Validation
      if (!device_id || typeof device_id !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid "device_id" string field' });
      }

      if (typeof temperature !== 'number' || isNaN(temperature)) {
        return res.status(400).json({ error: 'Missing or invalid "temperature" numeric field' });
      }

      if (typeof humidity !== 'number' || isNaN(humidity)) {
        return res.status(400).json({ error: 'Missing or invalid "humidity" numeric field' });
      }

      // Check device registration & is_active status in iot_devices master table
      let device = await getDeviceWithLocation(device_id);
      let locationId = device?.location_id;

      if (!device) {
        // Auto-register device if missing with default location and active status
        locationId = await registerDeviceIfMissing(device_id, `ESP32 Device (${device_id})`, 'LOC-BANDUNG-01');
      } else if (device.is_active === false) {
        // If device is remotely deactivated in Supabase (is_active = false)
        return res.status(200).json({
          success: true,
          is_active: false,
          message: 'Device is currently deactivated remotely in database',
        });
      }

      // Compute mathematical & business analytics
      const analytics = computeAnalytics(temperature, humidity);

      // Relational Insertion into Supabase Database
      const result = await recordTelemetry(device_id, temperature, humidity, analytics, locationId);

      return res.status(201).json({
        success: true,
        is_active: true,
        message: 'Telemetry and analytics recorded successfully',
        data: {
          id: result.telemetryId,
          device_id: result.deviceId,
          location_id: result.locationId,
          temperature: result.temperature,
          humidity: result.humidity,
          analytics: {
            dew_point: result.analytics.dewPoint,
            mould_risk: result.analytics.mouldRisk,
            room_status: result.analytics.roomStatus,
          },
          created_at: result.createdAt,
        },
      });
    }

    // ─── 2. GET /api/iot/telemetry (Fetch Paginated History Logs) ─────
    if (req.method === 'GET') {
      const deviceId = req.query.device_id as string | undefined;
      const locationId = req.query.location_id as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await fetchTelemetryHistory(deviceId, page, limit, locationId);

      return res.status(200).json({
        success: true,
        pagination: result.pagination,
        count: result.data.length,
        data: result.data,
      });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('IoT Telemetry API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}
