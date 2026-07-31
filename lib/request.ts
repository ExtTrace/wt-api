import type { VercelRequest } from '@vercel/node';

export function getSlug(req: VercelRequest): string[] {
  return (req.url ?? '')
    .split('?')[0]
    .replace(/^\/api\/?/, '')
    .split('/')
    .filter(Boolean);
}
