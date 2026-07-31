import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';

interface ExperienceRecord {
  item_id: string;
  role: string;
  company: string;
  company_url: string;
  location: string;
  type: string;
  start_date: string;
  end_date: string;
  description: string;
  achievements: string[];
  tech_stack: string[];
}

export default async function handleExperience(req: VercelRequest, res: VercelResponse) {
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

    const records = (data || []) as unknown as ExperienceRecord[];

    const formatted = records.map((e: ExperienceRecord) => ({
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
