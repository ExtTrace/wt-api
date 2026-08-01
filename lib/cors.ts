import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://febriand.vercel.app',
  'https://dirgafeb.my.id',
  'https://dash-iot.dirgafeb.my.id',
];

/**
 * Set CORS headers dan handle OPTIONS preflight.
 * Return true jika request sudah dihandle (OPTIONS), caller harus langsung return.
 * Return false jika request bisa dilanjutkan.
 */
export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-sync-id',
  );

  // Handle OPTIONS preflight — return true supaya caller bisa langsung return
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
}

