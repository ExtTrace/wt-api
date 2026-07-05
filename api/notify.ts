import type { VercelRequest, VercelResponse } from '@vercel/node';

const apiUrl = process.env.TELEGRAM_API_URL;

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // 1. Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // 2. Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { chatId, message } = request.body;

    if (!chatId || !message) {
      return response.status(400).json({ error: 'Missing chatId or message' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN is not configured');
      return response.status(500).json({ error: 'Internal Server Error' });
    }

    // 3. Send message to Telegram
    const url = `${apiUrl}/bot${botToken}/sendMessage`;
    const telegramResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.text();
      console.error('Telegram API error:', errorData);
      return response.status(502).json({ error: 'Failed to send message to Telegram' });
    }

    return response.status(200).json({ success: true });
  } catch (error) {
    console.error('Notification error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
