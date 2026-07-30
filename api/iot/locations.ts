import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { createOrUpdateLocation, getAllLocations, getLocationById } from '../../lib/iot/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client is not configured' });
  }

  try {
    // ─── 1. POST / PUT / PATCH /api/iot/locations (Create or Update Location Data) ───
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const { id, location_name, city } = req.body || {};

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid "id" string field (ex: "LOC-JAKARTA-01")' });
      }

      if (!location_name || typeof location_name !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid "location_name" string field' });
      }

      const location = await createOrUpdateLocation(id, location_name, city);

      return res.status(201).json({
        success: true,
        message: 'Location saved successfully',
        data: location,
      });
    }

    // ─── 2. GET /api/iot/locations (Supports both GET ALL & GET ONE) ───
    if (req.method === 'GET') {
      const locationId = (req.query.id || req.query.location_id) as string | undefined;

      // GET ONE: jika query parameter ?id=LOC-BANDUNG-01 diberikan
      if (locationId) {
        const location = await getLocationById(locationId);
        if (!location) {
          return res.status(404).json({ error: `Location ${locationId} not found` });
        }
        return res.status(200).json({
          success: true,
          data: location,
        });
      }

      // GET ALL: jika tanpa parameter id
      const locations = await getAllLocations();
      return res.status(200).json({
        success: true,
        count: locations?.length || 0,
        data: locations,
      });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('Locations API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}
