import type { VercelRequest, VercelResponse } from '@vercel/node';

const apiUrl = process.env.TELEGRAM_API_URL;

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).send('Method Not Allowed');
  }

  try {
    const update = request.body;

    // Telegram sends the message object inside the update
    if (update && update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      // If user sends /start, reply with their Chat ID
      if (text.startsWith('/start')) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
          console.error('TELEGRAM_BOT_TOKEN is not configured');
          return response.status(500).json({ error: 'Internal Server Error' });
        }

        const replyMessage = `👋 Selamat datang di <b>Anime Watch Tracker Bot</b>!\n\nChat ID Anda adalah: <code>${chatId}</code>\n\nSilakan salin Chat ID di atas dan masukkan ke dalam pengaturan ekstensi Anime Watch Tracker Anda.`;

        const url = `${apiUrl}/bot${botToken}/sendMessage`;
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyMessage,
            parse_mode: 'HTML',
          }),
        });
      }
    }

    // Always return 200 OK to Telegram so it doesn't retry
    return response.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 so Telegram stops retrying the bad update
    return response.status(200).send('OK');
  }
}
