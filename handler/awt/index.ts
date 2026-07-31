import type { VercelRequest, VercelResponse } from '@vercel/node';
import handleCronCheck from './cron-check';
import handleNotify from './notify';
import handleSync from './sync';

export default function handleAWT(
  req: VercelRequest,
  res: VercelResponse,
  slug: string[],
) {
  const [, endpoint] = slug;

  switch (endpoint) {
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
