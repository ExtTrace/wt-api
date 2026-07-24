import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';
import { handleCors } from '../lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  handleCors(req, res);

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' });
  }

  try {
    const { data: apps, error } = await supabase
      .from('job_applications')
      .select('status');

    if (error) throw error;

    const stats: Record<string, number> = {
      Applied: 0,
      Interview: 0,
      'Technical Test': 0,
      Offering: 0,
      Accepted: 0,
      Rejected: 0,
      Total: 0,
    };

    if (apps) {
      for (const app of apps) {
        const status = app.status;
        if (status && typeof stats[status] !== 'undefined') {
          stats[status]++;
        } else if (status) {
          // Fallback for custom status
          stats[status] = (stats[status] || 0) + 1;
        }
        stats['Total']++;
      }
    }

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Fetch job stats error:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Internal Server Error' });
  }
}
