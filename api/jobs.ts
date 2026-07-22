import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://febriand.vercel.app',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://febriand.vercel.app');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden: Origin not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' });
  }

  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    let query = supabase
      .from('job_applications')
      .select('id, company, position, status, updated_at', { count: 'exact' });

    const status = req.query.status;
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const search = req.query.search;
    if (search && typeof search === 'string') {
      query = query.or(`company.ilike.%${search}%,position.ilike.%${search}%`);
    }

    const order = req.query.order === 'asc' ? 'asc' : 'desc';
    query = query.order('updated_at', { ascending: order === 'asc' });
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
      },
    });
  } catch (error: any) {
    console.error('Fetch jobs error:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Internal Server Error' });
  }
}
