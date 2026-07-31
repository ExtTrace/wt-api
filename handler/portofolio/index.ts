import type { VercelRequest, VercelResponse } from '@vercel/node';
import handleProjects from './projects';
import handleSkills from './skills';
import handleCertificates from './certificates';
import handleEducation from './education';
import handleExperience from './experience';
import handleSocials from './socials';

export default function handlePortofolio(
  req: VercelRequest,
  res: VercelResponse,
  slug: string[],
) {
  const [, endpoint] = slug;

  switch (endpoint) {
    case 'certificate':
      return handleCertificates(req, res);

    case 'education':
      return handleEducation(req, res);

    case 'experience':
      return handleExperience(req, res);

    case 'projects':
      return handleProjects(req, res);

    case 'skills':
      return handleSkills(req, res);

    case 'socials':
      return handleSocials(req, res);

    default:
      return res.status(404).json({
        message: 'Not found',
      });
  }
}
