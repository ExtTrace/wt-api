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
    // 1. Parse pagination parameters
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    
    // Safety boundaries
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    // Start query with exact count option
    let query = supabase
      .from('job_applications')
      .select('id, company, position, status, updated_at', { count: 'exact' });

    // 2. Filter by status
    const status = req.query.status;
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    // 3. Search by company or position (case-insensitive)
    const search = req.query.search;
    if (search && typeof search === 'string') {
      query = query.or(`company.ilike.%${search}%,position.ilike.%${search}%`);
    }

    // 4. Order by updated_at (asc/desc, default desc)
    const order = req.query.order === 'asc' ? 'asc' : 'desc';
    query = query.order('updated_at', { ascending: order === 'asc' });

    // 5. Apply pagination range
    query = query.range(from, to);

    const { data: jobs, count, error } = await query;

    if (error) throw error;

    const total = count || 0;
    const totalPages = Math.ceil(total / safeLimit);

    return res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
      }
    });
  } catch (error: any) {
    console.error('Fetch jobs error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
