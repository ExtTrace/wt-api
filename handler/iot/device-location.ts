import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { updateDeviceLocation, getDeviceWithLocation, getAllDevices } from '../../lib/iot/db';

export default async function handleDeviceLocation(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client is not configured' });
  }

  try {
    // ─── 1. POST / PATCH / PUT /api/iot/device-location (Update Device Active Location) ───
    if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
      const { device_id, location_id } = req.body || {};

      if (!device_id || typeof device_id !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid "device_id" string field' });
      }

      if (!location_id || typeof location_id !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid "location_id" string field (ex: "LOC-JAKARTA-01")' });
      }

      const updatedDevice = await updateDeviceLocation(device_id, location_id);

      return res.status(200).json({
        success: true,
        message: `Active location for device ${device_id} updated to ${location_id} successfully`,
        data: updatedDevice,
      });
    }

    // ─── 2. GET /api/iot/device-location (Supports both GET ALL & GET ONE) ───
    if (req.method === 'GET') {
      const deviceId = req.query.device_id as string | undefined;

      // GET ONE: jika parameter device_id diberikan
      if (deviceId) {
        const device = await getDeviceWithLocation(deviceId);
        if (!device) {
          return res.status(404).json({ error: `Device ${deviceId} not found` });
        }
        return res.status(200).json({
          success: true,
          data: device,
        });
      }

      // GET ALL: jika tanpa parameter device_id
      const devices = await getAllDevices();
      return res.status(200).json({
        success: true,
        count: devices?.length || 0,
        data: devices,
      });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('Device Location API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}
