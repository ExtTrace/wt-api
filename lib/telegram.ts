const apiUrl = process.env.TELEGRAM_API_URL;
const botToken = process.env.TELEGRAM_BOT_TOKEN;

export async function sendMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: any,
): Promise<void> {
  if (!botToken || !apiUrl) return;
  await fetch(`${apiUrl}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  });
}

export async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  replyMarkup?: any,
): Promise<void> {
  if (!botToken || !apiUrl) return;
  await fetch(`${apiUrl}/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  if (!botToken || !apiUrl) return;
  await fetch(`${apiUrl}/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });
}

export async function setBotCommands(
  commands: { command: string; description: string }[],
): Promise<void> {
  if (!botToken || !apiUrl) {
    throw new Error('Bot token or API URL not configured');
  }

  const response = await fetch(`${apiUrl}/bot${botToken}/setMyCommands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ commands }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API Error: ${error}`);
  }
}
