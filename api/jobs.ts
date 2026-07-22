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
    let query = supabase
      .from('job_applications')
      .select('id, company, position, status, updated_at');

    // 1. Filter by status
    const status = req.query.status;
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    // 2. Search by company or position (case-insensitive)
    const search = req.query.search;
    if (search && typeof search === 'string') {
      query = query.or(`company.ilike.%${search}%,position.ilike.%${search}%`);
    }

    // 3. Order by updated_at (asc/desc, default desc)
    const order = req.query.order === 'asc' ? 'asc' : 'desc';
    query = query.order('updated_at', { ascending: order === 'asc' });

    const { data: jobs, error } = await query;

    if (error) throw error;

    return res.status(200).json({ success: true, data: jobs });
  } catch (error: any) {
    console.error('Fetch jobs error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
