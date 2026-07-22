import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';
import { sendMessage } from '../lib/telegram';
import {
  handleStart,
  handleLinkStart,
  handleLinkStep,
  handleList,
  handleSchedule,
  handleNew,
  sendLokerMenu,
  handleLokerCallbackQuery,
  handleLokerConversationStep,
} from '../lib/commands';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const update = req.body;

    if (!supabase) {
      console.error('Supabase is not configured');
      return res.status(200).send('OK');
    }

    // ─── 1. HANDLE INLINE KEYBOARD CALLBACK QUERIES ──────────────────
    if (update?.callback_query) {
      const chatId = String(update.callback_query.message.chat.id);
      const callbackData: string = update.callback_query.data;

      if (callbackData.startsWith('loker:')) {
        await handleLokerCallbackQuery(chatId, update.callback_query);
      }
      return res.status(200).send('OK');
    }

    // ─── 2. HANDLE STANDARD CHAT TEXT INPUTS ──────────────────────────
    if (!update?.message?.text) {
      return res.status(200).send('OK');
    }

    const chatId = String(update.message.chat.id);
    const text: string = update.message.text.trim();

    // Check active conversational session first
    const { data: activeSession } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (activeSession) {
      if (activeSession.step === 'WAITING_SYNC_ID') {
        await handleLinkStep(chatId, text);
      } else {
        await handleLokerConversationStep(chatId, text, activeSession);
      }
      return res.status(200).send('OK');
    }

    // Get command prefix (e.g. /start, /link)
    const command = text.split(/\s+/)[0].toLowerCase();

    // ─── 3. COMMAND DISPATCHER SWITCH-CASE ───────────────────────────
    switch (command) {
      case '/start':
        await handleStart(chatId);
        break;

      case '/link':
        await handleLinkStart(chatId);
        break;

      case '/list':
        await handleList(chatId);
        break;

      case '/schedule':
        await handleSchedule(chatId);
        break;

      case '/new':
        await handleNew(chatId);
        break;

      case '/loker':
        await sendLokerMenu(chatId);
        break;

      default:
        // Unknown command fallback
        await sendMessage(
          chatId,
          `❓ Perintah tidak dikenal.\n\nPerintah yang tersedia:\n` +
          `• /start\n• /link\n• /list\n• /new\n• /schedule\n• /loker`
        );
    }

    return res.status(200).send('OK');

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).send('OK');
  }
}
