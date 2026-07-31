import type { VercelRequest, VercelResponse } from '@vercel/node';
import handleDeviceLocation from './device-location';
import handleDeviceToggle from './device-toggle';
import handleLocations from './locations';
import handleTelemetry from './telemetry';

export default function handleIOT(req: VercelRequest, res: VercelResponse) {
  const slug = Array.isArray(req.query.slug)
    ? req.query.slug
    : [req.query.slug];

  switch (slug[1]) {
    case 'device-location':
      return handleDeviceLocation(req, res);

    case 'device-toggle':
      return handleDeviceToggle(req, res);

    case 'locations':
      return handleLocations(req, res);

    case 'telemetry':
      return handleTelemetry(req, res);

    default:
      return res.status(404).json({
        message: 'Not found',
      });
  }
}
