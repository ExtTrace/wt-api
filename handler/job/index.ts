import type { VercelRequest, VercelResponse } from '@vercel/node';
import handleJobStats from './job-stats';
import handleJobs from './jobs';

export default function handleJob(
  req: VercelRequest,
  res: VercelResponse,
  slug: string[],
) {
  const [, endpoint] = slug;

  switch (endpoint) {
    case 'job-stats':
      return handleJobStats(req, res);

    case 'jobs':
      return handleJobs(req, res);

    default:
      return res.status(404).json({
        message: 'Not found',
      });
  }
}
