import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';

interface SkillRecord {
  item_id: string;
  category: string;
  skills: any[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' });
  }

  const lang = (req.query.lang as string) || 'id';

  try {
    const { data, error } = await supabase
      .from('portfolio_skills')
      .select('*')
      .eq('lang', lang)
      .order('order_index', { ascending: true });

    if (error) throw error;

    const records = (data || []) as unknown as SkillRecord[];

    const formatted = records.map((s: SkillRecord) => ({
      id: s.item_id,
      category: s.category,
      skills: s.skills || [],
    }));

    return res.status(200).json(formatted);
  } catch (error: any) {
    console.error('Skills API error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
