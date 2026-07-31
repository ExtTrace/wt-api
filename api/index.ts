import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  return response.status(200).json({
    name: 'AWT Central API Gateway',
    status: 'online',
    version: '1.0.0',
    services: [
      'anime-watch-tracker',
      'iot-monitoring',
      'job-tracker',
      'portfolio'
    ],
    timestamp: new Date().toISOString(),
    message: 'AWT Backend Services are up and running smoothly!'
  });
}
