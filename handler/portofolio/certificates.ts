import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { setCacheControl } from '../../lib/cache';

interface CertificateRecord {
  item_id: string;
  title: string;
  issuer: string;
  issue_date: string;
  credential_id: string;
  credential_url: string;
}

export default async function handleCertificates(
  req: VercelRequest,
  res: VercelResponse,
) {
  setCacheControl(res, 30);

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' });
  }

  const lang = (req.query.lang as string) || 'id';

  try {
    const { data, error } = await supabase
      .from('portfolio_certificates')
      .select('*')
      .eq('lang', lang)
      .order('order_index', { ascending: true });

    if (error) throw error;

    const records = (data || []) as unknown as CertificateRecord[];

    const formatted = records.map((c: CertificateRecord) => ({
      id: c.item_id,
      title: c.title,
      issuer: c.issuer,
      issueDate: c.issue_date,
      credentialId: c.credential_id || '',
      credentialUrl: c.credential_url || '',
    }));

    return res.status(200).json(formatted);
  } catch (error: any) {
    console.error('Certificates API error:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Internal Server Error' });
  }
}
