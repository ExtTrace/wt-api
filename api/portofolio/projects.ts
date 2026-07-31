import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' });
  }

  const lang = (req.query.lang as string) || 'id';

  try {
    const { data, error } = await supabase
      .from('portfolio_projects')
      .select('*')
      .eq('lang', lang)
      .order('order_index', { ascending: true });

    if (error) throw error;

    const formatted = (data || []).map((p) => ({
      id: p.item_id,
      title: p.title,
      subtitle: p.subtitle,
      overview: p.overview,
      responsibilities: p.responsibilities || [],
      features: p.features || [],
      architecture: p.architecture || {},
      apiPreview: p.api_preview || undefined,
      gallery: p.gallery || [],
      challenges: p.challenges,
      solutions: p.solutions,
      lessonsLearned: p.lessons_learned,
      techStack: p.tech_stack || [],
      githubUrl: p.github_url || '',
      liveUrl: p.live_url || '',
    }));

    return res.status(200).json(formatted);
  } catch (error: any) {
    console.error('Projects API error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
