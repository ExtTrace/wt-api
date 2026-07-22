import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';

const ALLOWED_ORIGIN = '*';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-sync-id'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' });
  }

  const syncId = req.headers['x-sync-id'];
  if (!syncId || typeof syncId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid x-sync-id header' });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('sync_storage')
        .select('data')
        .eq('id', syncId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return res.status(200).json({ data: data?.data || null });
    }

    if (req.method === 'POST') {
      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ error: 'Missing data in request body' });
      }

      const { error } = await supabase
        .from('sync_storage')
        .upsert(
          { id: syncId, data: data, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Sync API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
