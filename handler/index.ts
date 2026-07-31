import type { VercelRequest, VercelResponse } from '@vercel/node';
import handleAWT from './awt';
import handleBot from './bot';
import handleIOT from './iot';
import handleJob from './job';
import handlePortofolio from './portofolio';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const slug = Array.isArray(req.query.slug)
    ? req.query.slug
    : req.query.slug
      ? [req.query.slug]
      : [];

  switch (slug[0]) {
    case 'awt':
      return handleAWT(req, res);

    case 'bot':
      return handleBot(req, res);

    case 'iot':
      return handleIOT(req, res);

    case 'job':
      return handleJob(req, res);

    case 'portofolio':
      return handlePortofolio(req, res);

    default:
      return res.status(404).json({
        message: 'Not found',
      });
  }
}
