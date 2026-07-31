import type { VercelRequest, VercelResponse } from '@vercel/node';
import handleSetup from './setup';
import handleWebhook from './webhook';

export default function handleBot(
  req: VercelRequest,
  res: VercelResponse,
  slug: string[],
) {
  const [, endpoint] = slug;

  switch (endpoint) {
    case 'setup':
      return handleSetup(req, res, slug);

    case 'webhook':
      return handleWebhook(req, res);

    default:
      return res.status(404).json({
        message: 'Not found',
      });
  }
}
