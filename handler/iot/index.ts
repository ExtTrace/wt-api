import type { VercelRequest, VercelResponse } from '@vercel/node';
import handleDeviceLocation from './device-location';
import handleDeviceToggle from './device-toggle';
import handleLocations from './locations';
import handleTelemetry from './telemetry';
import handleLogin from './login';

export default function handleIOT(
  req: VercelRequest,
  res: VercelResponse,
  slug: string[],
) {
  const [, endpoint] = slug;

  switch (endpoint) {
    case 'device-location':
      return handleDeviceLocation(req, res);

    case 'device-toggle':
      return handleDeviceToggle(req, res);

    case 'locations':
      return handleLocations(req, res);

    case 'login':
      return handleLogin(req, res);

    case 'telemetry':
      return handleTelemetry(req, res);

    default:
      return res.status(404).json({
        message: 'Not found',
      });
  }
}
