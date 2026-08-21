import type { VercelRequest, VercelResponse } from '@vercel/node';
import handleAWT from './awt';
import handleBot from './bot';
import handleIOT from './iot';
import handleJob from './job';
import handlePortofolio from './portofolio';
import { getSlug } from '../lib/request';

export default function handleRequest(req: VercelRequest, res: VercelResponse) {
  const slug = getSlug(req);

  switch (slug[0]) {
    case 'awt':
      return handleAWT(req, res, slug);

    case 'bot':
      return handleBot(req, res, slug);

    case 'iot':
      return handleIOT(req, res, slug);

    case 'job':
    case 'job-stats':
    case 'job-platforms':
      return handleJob(req, res, slug);

    case 'portofolio':
      return handlePortofolio(req, res, slug);

    default:
      return res.status(404).json({
        message: 'Not found',
      });
  }
}
