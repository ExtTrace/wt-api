import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';

interface EducationRecord {
  item_id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  description: string;
}

export default async function handleEducation(req: VercelRequest, res: VercelResponse) {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' });
  }

  const lang = (req.query.lang as string) || 'id';

  try {
    const { data, error } = await supabase
      .from('portfolio_education')
      .select('*')
      .eq('lang', lang)
      .order('order_index', { ascending: true });

    if (error) throw error;

    const records = (data || []) as unknown as EducationRecord[];

    const formatted = records.map((e: EducationRecord) => ({
      id: e.item_id,
      institution: e.institution,
      degree: e.degree,
      fieldOfStudy: e.field_of_study,
      startDate: e.start_date,
      endDate: e.end_date,
      description: e.description || '',
    }));

    return res.status(200).json(formatted);
  } catch (error: any) {
    console.error('Education API error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
