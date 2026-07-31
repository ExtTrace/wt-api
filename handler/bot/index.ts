import type { VercelRequest, VercelResponse } from '@vercel/node';
import handleSetup from './setup';
import handleWebhook from './webhook';

export default function handleBot(
  req: VercelRequest,
  res: VercelResponse,
  slug: string[],
) {
  switch (slug[1]) {
    case 'setup':
      return handleSetup(req, res);

    case 'webhook':
      return handleWebhook(req, res);

    default:
      return res.status(404).json({
        message: 'Not found',
      });
  }
}
