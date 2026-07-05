import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  return response.status(200).json({
    name: 'Anime Watch Tracker API',
    status: 'online',
    version: '1.0.0',
    message: 'Backend is up and running!'
  });
}
