import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { toggleDeviceStatus, getDeviceWithLocation, getAllDevices } from '../../lib/iot/db';
import { handleCors } from '../../lib/cors';

export default async function handleDeviceToggle(req: VercelRequest, res: VercelResponse) {
  handleCors(req, res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client is not configured' });
  }

  try {
    // ─── 1. POST / PATCH / PUT /api/iot/device-toggle (Toggle ON/OFF Status) ───
    if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
      const { device_id, is_active } = req.body || {};

      if (!device_id || typeof device_id !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid "device_id" string field' });
      }

      let targetStatus: boolean | undefined = undefined;
      if (typeof is_active === 'boolean') {
        targetStatus = is_active;
      }

      const updatedDevice = await toggleDeviceStatus(device_id, targetStatus);

      return res.status(200).json({
        success: true,
        message: `Device ${device_id} is now ${updatedDevice.is_active ? 'ACTIVE (ON)' : 'DEACTIVATED (OFF)'}`,
        data: updatedDevice,
      });
    }

    // ─── 2. GET /api/iot/device-toggle (Fetch Status of Single Device or All Devices) ───
    if (req.method === 'GET') {
      const deviceId = req.query.device_id as string | undefined;

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

      const devices = await getAllDevices();
      return res.status(200).json({
        success: true,
        count: devices?.length || 0,
        data: devices,
      });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('Device Toggle API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}
