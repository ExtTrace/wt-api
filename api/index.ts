import type { VercelRequest, VercelResponse } from '@vercel/node';
import handleRequest from '../handler';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleRequest(req, res);
}
