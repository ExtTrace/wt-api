import { supabase } from '../supabase';
import { sendMessage } from '../telegram';
import { fetchUpcomingEpisode } from '../anilist';
import type { MediaStorage } from '../types';

async function getSyncIdForChat(chatId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('chat_links')
    .select('sync_id')
    .eq('chat_id', chatId)
    .single();
  return data?.sync_id || null;
}

export async function handleSchedule(chatId: string): Promise<void> {
  if (!supabase) return;
  const syncId = await getSyncIdForChat(chatId);
  if (!syncId) {
    await sendMessage(chatId, `❌ Akun belum dihubungkan.\n\nKetik: <code>/link</code>\n\nSync ID bisa ditemukan di <b>Options → Data Management</b> pada ekstensi.`);
    return;
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
    return;
  }

  await sendMessage(chatId, `🔍 Mengecek jadwal untuk <b>${active.length} anime</b>...\n<i>Mohon tunggu sebentar</i>`);

  const results = await Promise.allSettled(
    active.map(async (item) => {
      const anilist = await fetchUpcomingEpisode(item.title);
      return { item, anilist };
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
}
