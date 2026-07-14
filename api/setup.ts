import type { VercelRequest, VercelResponse } from '@vercel/node';

const apiUrl = process.env.TELEGRAM_API_URL;
const botToken = process.env.TELEGRAM_BOT_TOKEN;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!botToken || !apiUrl) {
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  const commands = [
    { command: 'start', description: 'Mulai dan lihat panduan penggunaan' },
    { command: 'list', description: 'Lihat daftar anime yang sedang ditonton' },
    { command: 'new', description: 'Anime dengan episode baru yang belum ditonton' },
    { command: 'schedule', description: 'Cek jadwal episode berikutnya dari AniList' },
    { command: 'link', description: 'Hubungkan bot ke ekstensi (butuh Sync ID)' },
  ];

  try {
    // Register commands
    const setCommandsRes = await fetch(`${apiUrl}/bot${botToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands }),
    });

    const setCommandsData = await setCommandsRes.json();

    if (!setCommandsRes.ok) {
      return res.status(502).json({ error: 'Failed to set commands', detail: setCommandsData });
    }

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
