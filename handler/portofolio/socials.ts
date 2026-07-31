import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';

interface SocialRecord {
  platform: string;
  url: string;
  label: string;
  icon_name: string;
}

export default async function handleSocials(req: VercelRequest, res: VercelResponse) {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' });
  }

  const lang = (req.query.lang as string) || 'id';

  try {
    const { data, error } = await supabase
      .from('portfolio_socials')
      .select('*')
      .eq('lang', lang)
      .order('order_index', { ascending: true });

    if (error) throw error;

    const records = (data || []) as unknown as SocialRecord[];

    const formatted = records.map((s: SocialRecord) => ({
      platform: s.platform,
      url: s.url,
      label: s.label,
      iconName: s.icon_name || '',
    }));

    return res.status(200).json(formatted);
  } catch (error: any) {
    console.error('Socials API error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
