import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' });
  }

  const lang = (req.query.lang as string) || 'id';

  try {
    const { data, error } = await supabase
      .from('portfolio_experiences')
      .select('*')
      .eq('lang', lang)
      .order('order_index', { ascending: true });

    if (error) throw error;

    const formatted = (data || []).map((e) => ({
      id: e.item_id,
      role: e.role,
      company: e.company,
      companyUrl: e.company_url || '',
      location: e.location,
      type: e.type,
      startDate: e.start_date,
      endDate: e.end_date,
      description: e.description,
      achievements: e.achievements || [],
      techStack: e.tech_stack || [],
    }));

    return res.status(200).json(formatted);
  } catch (error: any) {
    console.error('Experience API error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
