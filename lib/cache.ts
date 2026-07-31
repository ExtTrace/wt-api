import type { VercelResponse } from '@vercel/node';

/**
 * Helper to set standard Vercel CDN Cache-Control headers.
 * Eliminates code duplication across REST API handlers.
 * 
 * @param res VercelResponse object
 * @param maxAgeSeconds CDN cache duration in seconds (default: 300s = 5 mins)
 * @param staleSeconds Stale-while-revalidate duration in seconds (default: 86400s = 24 hrs)
 */
export function setCacheControl(
  res: VercelResponse,
  maxAgeSeconds = 300,
  staleSeconds = 86400
): void {
  res.setHeader(
    'Cache-Control',
    `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${staleSeconds}`
  );
}
