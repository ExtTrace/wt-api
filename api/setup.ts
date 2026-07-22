import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setBotCommands } from '../lib/telegram';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const commands = [
    { command: 'start', description: 'Mulai dan lihat panduan penggunaan' },
    { command: 'list', description: 'Lihat daftar anime yang sedang ditonton' },
    {
      command: 'new',
      description: 'Anime dengan episode baru yang belum ditonton',
    },
    {
      command: 'schedule',
      description: 'Cek jadwal episode berikutnya dari AniList',
    },
    {
      command: 'link',
      description: 'Hubungkan bot ke ekstensi (butuh Sync ID)',
    },
    {
      command: 'loker',
      description: 'Kelola dan lacak progress lamaran kerja (Loker)',
    },
  ];

  try {
    await setBotCommands(commands);

    return res.status(200).json({
      success: true,
      message: 'Bot commands registered successfully!',
      commands,
    });
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
