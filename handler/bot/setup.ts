import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setBotCommands, setWebhook } from '../../lib/telegram';
import { canAccessLoker } from '../../lib/permission';

export default async function handleSetup(req: VercelRequest, res: VercelResponse) {
  const isAllowed = await canAccessLoker(req.query.chatId as string);

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
  ];

  if (isAllowed) {
    commands.push({
      command: 'loker',
      description: 'Kelola dan lacak progress lamaran kerja (Loker)',
    });
  }

  try {
    // 1. Register commands
    await setBotCommands(commands);

    // 2. Automatically register / update webhook to Telegram using the current request host
    const host = req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const webhookUrl = `${proto}://${host}/api/bot/webhook`;
    await setWebhook(webhookUrl);

    return res.status(200).json({
      success: true,
      message: 'Bot commands and Webhook registered successfully!',
      webhookUrl,
      commands,
    });
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
