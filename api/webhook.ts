import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const apiUrl = process.env.TELEGRAM_API_URL;
const botToken = process.env.TELEGRAM_BOT_TOKEN;

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

interface MediaItem {
  title: string;
  episode?: string | null;
  season?: string | null;
  nextEpisode?: string | null;
  hasNewEpisode?: boolean;
  isArchived?: boolean;
  lastWatchedAt: string;
}

interface MediaStorage {
  items: MediaItem[];
}

// Helper: send Telegram Message
async function sendMessage(chatId: number | string, text: string, replyMarkup?: any): Promise<void> {
  if (!botToken || !apiUrl) return;
  await fetch(`${apiUrl}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    }),
  });
}

// Helper: edit Telegram Message text
async function editMessageText(chatId: number | string, messageId: number, text: string, replyMarkup?: any): Promise<void> {
  if (!botToken || !apiUrl) return;
  await fetch(`${apiUrl}/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    }),
  });
}

// Helper: answer Telegram callback query
async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  if (!botToken || !apiUrl) return;
  await fetch(`${apiUrl}/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text
    }),
  });
}

async function getSyncIdForChat(chatId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('chat_links')
    .select('sync_id')
    .eq('chat_id', chatId)
    .single();
  return data?.sync_id || null;
}

// Send Loker Main Menu Keyboard
async function sendLokerMenu(chatId: string, messageId?: number) {
  const text = `💼 <b>Menu Pelacak Lamaran Kerja (Loker)</b>\n\nSilakan pilih menu aksi di bawah ini untuk mengelola loker Anda:`;
  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '➕ Tambah Lamaran', callback_data: 'loker:add' },
        { text: '📋 Lihat Semua', callback_data: 'loker:list' }
      ],
      [
        { text: '🔄 Update Status', callback_data: 'loker:update' },
        { text: '❌ Hapus Lamaran', callback_data: 'loker:delete' }
      ]
    ]
  };

  if (messageId) {
    await editMessageText(chatId, messageId, text, replyMarkup);
  } else {
    await sendMessage(chatId, text, replyMarkup);
  }
}

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
      const callbackQuery = update.callback_query;
      const callbackData: string = callbackQuery.data;
      const chatId = String(callbackQuery.message.chat.id);
      const messageId = callbackQuery.message.message_id;

      await answerCallbackQuery(callbackQuery.id);

      // A. Main Menu
      if (callbackData === 'loker:menu') {
        await sendLokerMenu(chatId, messageId);
        return res.status(200).send('OK');
      }

      // B. Add Application -> Starts conversation
      if (callbackData === 'loker:add') {
        await supabase
          .from('user_sessions')
          .upsert({ chat_id: chatId, step: 'WAITING_COMPANY', draft_data: {} }, { onConflict: 'chat_id' });

        await editMessageText(
          chatId,
          messageId,
          `➕ <b>Tambah Lamaran Kerja Baru</b>\n\nSilakan ketik <b>Nama Perusahaan</b> yang Anda lamar:\n\n<i>Ketik apa saja untuk mengirim nama perusahaan...</i>`,
          {
            inline_keyboard: [[{ text: '🚫 Batal', callback_data: 'loker:cancel' }]]
          }
        );
        return res.status(200).send('OK');
      }

      // C. List Applications
      if (callbackData === 'loker:list') {
        const { data: apps } = await supabase
          .from('job_applications')
          .select('*')
          .eq('chat_id', chatId)
          .order('id', { ascending: true });

        if (!apps || apps.length === 0) {
          await editMessageText(
            chatId,
            messageId,
            `📋 <b>Daftar Lamaran Kerja</b>\n\nBelum ada lamaran kerja yang tercatat. Silakan tambah lamaran baru!`,
            {
              inline_keyboard: [
                [{ text: '➕ Tambah Lamaran', callback_data: 'loker:add' }],
                [{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]
              ]
            }
          );
          return res.status(200).send('OK');
        }

        // Group by status
        const groups: Record<string, any[]> = {
          'Applied': [],
          'Interview': [],
          'Technical Test': [],
          'Offering': [],
          'Accepted': [],
          'Rejected': []
        };

        for (const app of apps) {
          const status = app.status || 'Applied';
          if (!groups[status]) groups[status] = [];
          groups[status].push(app);
        }

        let msg = `📋 <b>Daftar Lamaran Kerja Anda</b>\n\n`;
        let hasContent = false;

        const emojiMap: Record<string, string> = {
          'Applied': '📝',
          'Interview': '👥',
          'Technical Test': '💻',
          'Offering': '✨',
          'Accepted': '🎉',
          'Rejected': '❌'
        };

        for (const status of Object.keys(groups)) {
          const list = groups[status];
          if (list.length > 0) {
            hasContent = true;
            msg += `${emojiMap[status] || '•'} <b>${status} (${list.length})</b>\n`;
            for (const app of list) {
              msg += `  ├ <b>${app.company}</b> — ${app.position}\n`;
            }
            msg += `\n`;
          }
        }

        if (!hasContent) {
          msg += `Belum ada lamaran aktif.`;
        }

        await editMessageText(chatId, messageId, msg.trim(), {
          inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
        });
        return res.status(200).send('OK');
      }

      // D. Update Application Status (Select Application)
      if (callbackData === 'loker:update') {
        const { data: apps } = await supabase
          .from('job_applications')
          .select('*')
          .eq('chat_id', chatId);

        if (!apps || apps.length === 0) {
          await editMessageText(chatId, messageId, '❌ Tidak ada lamaran untuk di-update.', {
            inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
          });
          return res.status(200).send('OK');
        }

        const inlineKeyboard = apps.map((app: any) => [
          {
            text: `${app.company} - ${app.position} (${app.status})`,
            callback_data: `loker:select_update:${app.id}`
          }
        ]);
        inlineKeyboard.push([{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]);

        await editMessageText(chatId, messageId, '🔄 <b>Pilih lamaran yang ingin di-update statusnya:</b>', {
          inline_keyboard: inlineKeyboard
        });
        return res.status(200).send('OK');
      }

      // E. Update Application Status (Select Status)
      if (callbackData.startsWith('loker:select_update:')) {
        const appId = callbackData.split(':')[2];
        const statuses = ['Applied', 'Interview', 'Technical Test', 'Offering', 'Accepted', 'Rejected'];

        const inlineKeyboard = statuses.map((status) => [
          {
            text: status,
            callback_data: `loker:set_status:${appId}:${status}`
          }
        ]);
        inlineKeyboard.push([{ text: '↩️ Kembali', callback_data: 'loker:update' }]);

        await editMessageText(chatId, messageId, '🔄 <b>Pilih Tahap/Status Baru:</b>', {
          inline_keyboard: inlineKeyboard
        });
        return res.status(200).send('OK');
      }

      // F. Delete Application (Select Application)
      if (callbackData === 'loker:delete') {
        const { data: apps } = await supabase
          .from('job_applications')
          .select('*')
          .eq('chat_id', chatId);

        if (!apps || apps.length === 0) {
          await editMessageText(chatId, messageId, '❌ Tidak ada lamaran untuk dihapus.', {
            inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
          });
          return res.status(200).send('OK');
        }

        const inlineKeyboard = apps.map((app: any) => [
          {
            text: `🗑️ Hapus ${app.company} - ${app.position}`,
            callback_data: `loker:confirm_delete:${app.id}`
          }
        ]);
        inlineKeyboard.push([{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]);

        await editMessageText(chatId, messageId, '🗑️ <b>Pilih lamaran yang ingin dihapus:</b>', {
          inline_keyboard: inlineKeyboard
        });
        return res.status(200).send('OK');
      }

      // G. Delete Application (Confirm Action)
      if (callbackData.startsWith('loker:confirm_delete:')) {
        const appId = callbackData.split(':')[2];
        const { error } = await supabase
          .from('job_applications')
          .delete()
          .eq('id', appId)
          .eq('chat_id', chatId);

        if (error) {
          await editMessageText(chatId, messageId, `❌ Gagal menghapus lamaran: ${error.message}`, {
            inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
          });
        } else {
          await editMessageText(chatId, messageId, '✅ Lamaran berhasil dihapus dari daftar tracker loker Anda.', {
            inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
          });
        }
        return res.status(200).send('OK');
      }

      // H. Cancel session
      if (callbackData === 'loker:cancel') {
        await supabase.from('user_sessions').delete().eq('chat_id', chatId);
        await editMessageText(chatId, messageId, '🚫 Aksi pendaftaran loker telah dibatalkan.', {
          inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
        });
        return res.status(200).send('OK');
      }

      // I. Set Status (Finalize saving new draft or updating existing record)
      if (callbackData.startsWith('loker:set_status:')) {
        const parts = callbackData.split(':');
        const targetId = parts[2];
        const newStatus = parts[3];

        if (targetId === 'draft') {
          // Finalize saving new application draft
          const { data: session } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('chat_id', chatId)
            .single();

          if (!session) {
            await editMessageText(chatId, messageId, '❌ Sesi pendaftaran kedaluwarsa. Silakan mulai kembali.', {
              inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
            });
            return res.status(200).send('OK');
          }

          const draft = session.draft_data;
          const { error } = await supabase
            .from('job_applications')
            .insert({
              chat_id: chatId,
              company: draft.company,
              position: draft.position,
              status: newStatus
            });

          if (error) {
            await editMessageText(chatId, messageId, `❌ Gagal menyimpan lamaran: ${error.message}`, {
              inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
            });
          } else {
            await supabase.from('user_sessions').delete().eq('chat_id', chatId);
            await editMessageText(
              chatId,
              messageId,
              `✅ <b>Lamaran Berhasil Disimpan!</b>\n\n` +
              `🏢 Perusahaan: <b>${draft.company}</b>\n` +
              `💼 Posisi: <b>${draft.position}</b>\n` +
              `📍 Tahap saat ini: <b>${newStatus}</b>`,
              {
                inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
              }
            );
          }
        } else {
          // Update existing job application status
          const { error } = await supabase
            .from('job_applications')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', targetId)
            .eq('chat_id', chatId);

          if (error) {
            await editMessageText(chatId, messageId, `❌ Gagal meng-update status: ${error.message}`, {
              inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
            });
          } else {
            await editMessageText(chatId, messageId, `✅ Status lamaran berhasil diperbarui menjadi <b>${newStatus}</b>!`, {
              inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
            });
          }
        }
        return res.status(200).send('OK');
      }
    }

    // ─── 2. HANDLE STANDARD CHAT TEXT INPUTS ──────────────────────────
    if (!update?.message?.text) {
      return res.status(200).send('OK');
    }

    const chatId = String(update.message.chat.id);
    const text: string = update.message.text.trim();

    // Check active conversational session
    const { data: activeSession } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (activeSession) {
      const step = activeSession.step;
      const draft = activeSession.draft_data;

      if (step === 'WAITING_COMPANY') {
        // Save company name
        const newDraft = { ...draft, company: text };
        await supabase
          .from('user_sessions')
          .update({ step: 'WAITING_POSITION', draft_data: newDraft })
          .eq('chat_id', chatId);

        await sendMessage(
          chatId,
          `🏢 Perusahaan: <b>${text}</b>\n\nSelanjutnya, silakan ketik <b>Posisi Pekerjaan</b> (Contoh: <i>Software Engineer</i>):`,
          {
            inline_keyboard: [[{ text: '🚫 Batal', callback_data: 'loker:cancel' }]]
          }
        );
        return res.status(200).send('OK');
      }

      if (step === 'WAITING_POSITION') {
        // Save position and prompt status selection
        const newDraft = { ...draft, position: text };
        await supabase
          .from('user_sessions')
          .update({ step: 'WAITING_STATUS', draft_data: newDraft })
          .eq('chat_id', chatId);

        const statuses = ['Applied', 'Interview', 'Technical Test', 'Offering', 'Accepted', 'Rejected'];
        const inlineKeyboard = statuses.map((status) => [
          {
            text: status,
            callback_data: `loker:set_status:draft:${status}`
          }
        ]);
        inlineKeyboard.push([{ text: '🚫 Batal', callback_data: 'loker:cancel' }]);

        await sendMessage(
          chatId,
          `🏢 Perusahaan: <b>${draft.company}</b>\n` +
          `💼 Posisi: <b>${text}</b>\n\n` +
          `Terakhir, silakan pilih **Tahap/Status Awal** lamaran Anda:`,
          {
            inline_keyboard: inlineKeyboard
          }
        );
        return res.status(200).send('OK');
      }
    }

    // ─── 3. COMMAND: /loker (Job Tracker Menu) ───────────────────────
    if (text.startsWith('/loker')) {
      await sendLokerMenu(chatId);
      return res.status(200).send('OK');
    }

    // ─── COMMAND: /start ──────────────────────────────────────────────
    if (text.startsWith('/start')) {
      await sendMessage(
        chatId,
        `👋 Selamat datang di <b>Anime Watch Tracker Bot</b>!\n\n` +
        `Gunakan perintah berikut:\n` +
        `• <code>/link &lt;sync-id&gt;</code> — Hubungkan bot ke ekstensi Anda\n` +
        `• <code>/list</code> — Lihat daftar tontonan Anda\n` +
        `• <code>/new</code> — Episode baru yang belum ditonton\n` +
        `• <code>/schedule</code> — Cek jadwal episode berikutnya\n` +
        `• <code>/loker</code> — 💼 Kelola dan lacak progress Lamaran Kerja Anda\n\n` +
        `Untuk menghubungkan, buka menu <b>Options → Data Management</b> di ekstensi, ` +
        `salin Sync ID Anda, lalu kirim:\n<code>/link awt-sync-xxxxxxxx</code>`
      );
      return res.status(200).send('OK');
    }

    // ─── COMMAND: /link <sync-id> ─────────────────────────────────────
    if (text.startsWith('/link')) {
      const parts = text.split(/\s+/);
      const syncId = parts[1]?.trim();

      if (!syncId || !syncId.startsWith('awt-sync-')) {
        await sendMessage(chatId, `❌ Format tidak valid.\n\nGunakan: <code>/link awt-sync-xxxxxxxx</code>\n\nSync ID bisa ditemukan di <b>Options → Data Management</b> pada ekstensi.`);
        return res.status(200).send('OK');
      }

      const { data: syncData } = await supabase
        .from('sync_storage')
        .select('id')
        .eq('id', syncId)
        .single();

      if (!syncData) {
        await sendMessage(chatId, `❌ Sync ID <code>${syncId}</code> tidak ditemukan.\n\nPastikan Anda sudah mengaktifkan <b>Cloud Sync</b> di ekstensi dan ID yang dimasukkan sudah benar.`);
        return res.status(200).send('OK');
      }

      const { error } = await supabase
        .from('chat_links')
        .upsert({ chat_id: chatId, sync_id: syncId }, { onConflict: 'chat_id' });

      if (error) {
        console.error('Supabase upsert error:', JSON.stringify(error));
        await sendMessage(chatId, `❌ Gagal menyimpan link.\n\n<code>${error.message}</code>\n\nPastikan tabel <b>chat_links</b> sudah dibuat di Supabase.`);
        return res.status(200).send('OK');
      }

      await sendMessage(chatId, `✅ Berhasil dihubungkan!\n\nSync ID: <code>${syncId}</code>\n\nSekarang ketik /list untuk melihat daftar tontonan Anda.`);
      return res.status(200).send('OK');
    }

    // ─── COMMAND: /list ───────────────────────────────────────────────
    if (text.startsWith('/list')) {
      const syncId = await getSyncIdForChat(chatId);
      if (!syncId) {
        await sendMessage(chatId, `❌ Akun belum dihubungkan.\n\nKirim: <code>/link &lt;sync-id&gt;</code>\n\nSync ID bisa ditemukan di <b>Options → Data Management</b> pada ekstensi.`);
        return res.status(200).send('OK');
      }

      const { data: storageData } = await supabase
        .from('sync_storage')
        .select('data')
        .eq('id', syncId)
        .single();

      const storage = storageData?.data as MediaStorage | null;
      const allItems = storage?.items ?? [];

      if (allItems.length === 0) {
        await sendMessage(chatId, '📋 Daftar tontonan Anda masih kosong.');
        return res.status(200).send('OK');
      }

      const active = allItems.filter((i) => !i.isArchived);
      const archived = allItems.filter((i) => i.isArchived);

      let msg = `📋 <b>Daftar Tontonan Anda</b>\n\n`;

      if (active.length > 0) {
        msg += `🎬 <b>Sedang Ditonton (${active.length})</b>\n`;
        for (const item of active.slice(0, 20)) {
          const ep = item.episode ? ` — Ep ${item.episode}` : '';
          const season = item.season ? ` S${item.season}` : '';
          msg += `• ${item.title}${season}${ep}\n`;
        }
        if (active.length > 20) msg += `<i>...dan ${active.length - 20} lainnya</i>\n`;
      }

      if (archived.length > 0) {
        msg += `\n✅ <b>Selesai (${archived.length} anime)</b>\n`;
      }

      msg += `\n<i>Terakhir disinkronkan dari ekstensi</i>`;

      await sendMessage(chatId, msg);
      return res.status(200).send('OK');
    }

    // ─── COMMAND: /schedule ───────────────────────────────────────────
    if (text.startsWith('/schedule')) {
      const syncId = await getSyncIdForChat(chatId);
      if (!syncId) {
        await sendMessage(chatId, `❌ Akun belum dihubungkan.\n\nKirim: <code>/link &lt;sync-id&gt;</code>\n\nSync ID bisa ditemukan di <b>Options → Data Management</b> pada ekstensi.`);
        return res.status(200).send('OK');
      }

      const { data: storageData } = await supabase
        .from('sync_storage')
        .select('data')
        .eq('id', syncId)
        .single();

      const storage = storageData?.data as MediaStorage | null;
      const active = (storage?.items ?? []).filter((i) => !i.isArchived);

      if (active.length === 0) {
        await sendMessage(chatId, '📋 Tidak ada anime yang sedang ditonton.');
        return res.status(200).send('OK');
      }

      await sendMessage(chatId, `🔍 Mengecek jadwal untuk <b>${active.length} anime</b>...\n<i>Mohon tunggu sebentar</i>`);

      const ANILIST_URL = 'https://graphql.anilist.co';
      const graphqlQuery = `
        query ($search: String) {
          Media(search: $search, type: ANIME, status_in: [RELEASING, NOT_YET_RELEASED]) {
            id
            title { romaji english }
            nextAiringEpisode { airingAt episode }
          }
        }
      `;

      const results = await Promise.allSettled(
        active.map(async (item) => {
          const res = await fetch(ANILIST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ query: graphqlQuery, variables: { search: item.title } }),
          });
          const json = await res.json() as any;
          return { item, anilist: json?.data?.Media ?? null };
        })
      );

      const now = Math.floor(Date.now() / 1000);
      const withSchedule: string[] = [];
      const noSchedule: string[] = [];

      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        const { item, anilist } = result.value;

        if (anilist?.nextAiringEpisode) {
          const { airingAt, episode } = anilist.nextAiringEpisode;
          const diffSec = airingAt - now;
          const diffDays = Math.floor(diffSec / 86400);
          const diffHours = Math.floor((diffSec % 86400) / 3600);
          const diffMins = Math.floor((diffSec % 3600) / 60);

          let timeStr = '';
          if (diffSec <= 0) {
            timeStr = 'Sudah tayang!';
          } else if (diffDays > 0) {
            timeStr = `${diffDays}h ${diffHours}j lagi`;
          } else if (diffHours > 0) {
            timeStr = `${diffHours}j ${diffMins}m lagi`;
          } else {
            timeStr = `${diffMins}m lagi`;
          }

          const dateStr = new Date(airingAt * 1000).toLocaleDateString('id-ID', {
            weekday: 'short', day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'
          });

          withSchedule.push(`📺 <b>${item.title}</b>\n   └ Ep ${episode} • ${timeStr}\n   └ <i>${dateStr} WIB</i>`);
        } else {
          noSchedule.push(`• ${item.title}`);
        }
      }

      let msg = `🗓️ <b>Jadwal Episode Berikutnya</b>\n\n`;

      if (withSchedule.length > 0) {
        msg += withSchedule.join('\n\n');
      }

      if (noSchedule.length > 0) {
        msg += `\n\n⏹️ <b>Tidak Ada Jadwal (${noSchedule.length})</b>\n`;
        msg += `<i>Mungkin sudah selesai tayang atau belum ada info</i>\n`;
        msg += noSchedule.join('\n');
      }

      await sendMessage(chatId, msg);
      return res.status(200).send('OK');
    }

    // ─── COMMAND: /new ────────────────────────────────────────────────
    if (text.startsWith('/new')) {
      const syncId = await getSyncIdForChat(chatId);
      if (!syncId) {
        await sendMessage(chatId, `❌ Akun belum dihubungkan.\n\nKirim: <code>/link &lt;sync-id&gt;</code>`);
        return res.status(200).send('OK');
      }

      const { data: storageData } = await supabase
        .from('sync_storage')
        .select('data')
        .eq('id', syncId)
        .single();

      const storage = storageData?.data as MediaStorage | null;
      const unwatched = (storage?.items ?? []).filter(
        (i) => !i.isArchived && i.hasNewEpisode === true
      );

      if (unwatched.length === 0) {
        await sendMessage(chatId, '✅ Tidak ada anime dengan episode baru yang belum ditonton. Semua sudah up-to-date!');
        return res.status(200).send('OK');
      }

      let msg = `🆕 <b>Episode Baru Belum Ditonton (${unwatched.length})</b>\n\n`;

      for (const item of unwatched) {
        const ep = item.episode ? ` — sudah sampai Ep ${item.episode}` : '';
        const nextEp = item.nextEpisode ? ` | Ep baru: ${item.nextEpisode}` : '';
        msg += `📺 <b>${item.title}</b>\n   └${ep}${nextEp}\n`;
      }

      msg += `\n<i>Buka ekstensi untuk menandai sudah ditonton</i>`;

      await sendMessage(chatId, msg);
      return res.status(200).send('OK');
    }

    // Unknown command fallback (only if no active conversational step is running)
    await sendMessage(chatId, `❓ Perintah tidak dikenal.\n\nPerintah yang tersedia:\n• /start\n• /link &lt;sync-id&gt;\n• /list\n• /new\n• /schedule\n• /loker`);
    return res.status(200).send('OK');

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).send('OK');
  }
}
