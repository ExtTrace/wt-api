import type { VercelRequest, VercelResponse } from '@vercel/node';
import handleCronCheck from './cron-check';
import handleNotify from './notify';
import handleSync from './sync';

export default function handleAWT(req: VercelRequest, res: VercelResponse) {
  const slug = Array.isArray(req.query.slug)
    ? req.query.slug
    : [req.query.slug];

  switch (slug[1]) {
    case 'cron-check':
      return handleCronCheck(req, res);

    case 'notify':
      return handleNotify(req, res);

    case 'sync':
      return handleSync(req, res);

    default:
      return res.status(404).json({
        message: 'Not found',
      });
  }
}
