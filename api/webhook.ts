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
  isArchived?: boolean;
  lastWatchedAt: string;
}

interface MediaStorage {
  items: MediaItem[];
}

async function sendMessage(chatId: number | string, text: string): Promise<void> {
  if (!botToken || !apiUrl) return;
  await fetch(`${apiUrl}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const update = req.body;

    if (!update?.message?.text) {
      return res.status(200).send('OK');
    }

    const chatId = String(update.message.chat.id);
    const text: string = update.message.text.trim();

    // ─── /start ───────────────────────────────────────────────────────
    if (text.startsWith('/start')) {
      await sendMessage(
        chatId,
        `👋 Selamat datang di <b>Anime Watch Tracker Bot</b>!\n\n` +
        `Gunakan perintah berikut:\n` +
        `• <code>/link &lt;sync-id&gt;</code> — Hubungkan bot ke ekstensi Anda\n` +
        `• <code>/list</code> — Lihat daftar tontonan Anda\n` +
        `• <code>/new</code> — Episode baru yang belum ditonton\n` +
        `• <code>/schedule</code> — Cek jadwal episode berikutnya\n\n` +
        `Untuk menghubungkan, buka menu <b>Options → Data Management</b> di ekstensi, ` +
        `salin Sync ID Anda, lalu kirim:\n<code>/link awt-sync-xxxxxxxx</code>`
      );
      return res.status(200).send('OK');
    }

    // ─── /link <sync-id> ──────────────────────────────────────────────
    if (text.startsWith('/link')) {
      const parts = text.split(/\s+/);
      const syncId = parts[1]?.trim();

      if (!syncId || !syncId.startsWith('awt-sync-')) {
        await sendMessage(chatId, `❌ Format tidak valid.\n\nGunakan: <code>/link awt-sync-xxxxxxxx</code>\n\nSync ID bisa ditemukan di <b>Options → Data Management</b> pada ekstensi.`);
        return res.status(200).send('OK');
      }

      if (!supabase) {
        await sendMessage(chatId, '❌ Database tidak terkonfigurasi.');
        return res.status(200).send('OK');
      }

      // Verify that the sync ID exists in the database
      const { data: syncData } = await supabase
        .from('sync_storage')
        .select('id')
        .eq('id', syncId)
        .single();

      if (!syncData) {
        await sendMessage(chatId, `❌ Sync ID <code>${syncId}</code> tidak ditemukan.\n\nPastikan Anda sudah mengaktifkan <b>Cloud Sync</b> di ekstensi dan ID yang dimasukkan sudah benar.`);
        return res.status(200).send('OK');
      }

      // Save the link
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

    // ─── /list ────────────────────────────────────────────────────────
    if (text.startsWith('/list')) {
      if (!supabase) {
        await sendMessage(chatId, '❌ Database tidak terkonfigurasi.');
        return res.status(200).send('OK');
      }

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

    // ─── /schedule ────────────────────────────────────────────────────
    if (text.startsWith('/schedule')) {
      if (!supabase) {
        await sendMessage(chatId, '❌ Database tidak terkonfigurasi.');
        return res.status(200).send('OK');
      }

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

      // Query AniList for all anime in parallel
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
          const json = await res.json() as { data?: { Media?: { title: { romaji: string; english: string | null }; nextAiringEpisode: { airingAt: number; episode: number } | null } } };
          return { item, anilist: json?.data?.Media ?? null };
        })
      );

      const now = Math.floor(Date.now() / 1000);

      // Separate into: has schedule, no schedule
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

      // Sort: soonest first (already in order since Promise.allSettled preserves order)
      let msg = `🗓️ <b>Jadwal Episode Berikutnya</b>\n\n`;

      if (withSchedule.length > 0) {
        msg += withSchedule.join('\n\n');
      }

      if (noSchedule.length > 0) {
        msg += `\n\n⏹️ <b>Tidak Ada Jadwal (${noSchedule.length})</b>\n`;
        msg += `<i>Mungkin sudah selesai tayang atau belum ada info</i>\n`;
        msg += noSchedule.join('\n');
      }

      if (withSchedule.length === 0 && noSchedule.length === 0) {
        msg += 'Tidak ada informasi jadwal yang tersedia.';
      }

      await sendMessage(chatId, msg);
      return res.status(200).send('OK');
    }

    // ─── /new ──────────────────────────────────────────────────────────
    if (text.startsWith('/new')) {
      if (!supabase) {
        await sendMessage(chatId, '❌ Database tidak terkonfigurasi.');
        return res.status(200).send('OK');
      }

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

    // Unknown command
    await sendMessage(chatId, `❓ Perintah tidak dikenal.\n\nPerintah yang tersedia:\n• /start\n• /link &lt;sync-id&gt;\n• /list\n• /new\n• /schedule`);
    return res.status(200).send('OK');

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).send('OK');
  }
}
