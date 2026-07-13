import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGIN = '*'; // In production, restrict this to chrome-extension://<id>

// Ensure Supabase environment variables are set in Vercel Dashboard
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-sync-id'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase URL or Key is not configured' });
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

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned (which is fine for new users)
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
    console.error('Supabase Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
