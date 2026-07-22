import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' });
  }

  try {
    const { data: jobs, error } = await supabase
      .from('job_applications')
      .select('id, company, position, status, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data: jobs });
  } catch (error: any) {
    console.error('Fetch jobs error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
