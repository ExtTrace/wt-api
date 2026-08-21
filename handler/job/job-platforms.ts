import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { handleCors } from '../../lib/cors';
import { setCacheControl } from '../../lib/cache';

export default async function handleJobPlatforms(
  req: VercelRequest,
  res: VercelResponse,
) {
  handleCors(req, res);
  setCacheControl(res, 300);

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' });
  }

  try {
    const { data: platforms, error } = await supabase
      .from('job_platforms')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: platforms || [],
    });
  } catch (error: any) {
    console.error('Fetch job platforms error:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Internal Server Error' });
  }
}
