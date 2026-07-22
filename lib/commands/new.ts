import { supabase } from '../supabase';
import { sendMessage } from '../telegram';
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

export async function handleNew(chatId: string): Promise<void> {
  if (!supabase) return;
  const syncId = await getSyncIdForChat(chatId);
  if (!syncId) {
    await sendMessage(chatId, `❌ Akun belum dihubungkan.\n\nKetik: <code>/link</code>`);
    return;
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
    return;
  }

  let msg = `🆕 <b>Episode Baru Belum Ditonton (${unwatched.length})</b>\n\n`;

  for (const item of unwatched) {
    const ep = item.episode ? ` — sudah sampai Ep ${item.episode}` : '';
    const nextEp = item.nextEpisode ? ` | Ep baru: ${item.nextEpisode}` : '';
    msg += `📺 <b>${item.title}</b>\n   └${ep}${nextEp}\n`;
  }

  msg += `\n<i>Buka ekstensi untuk menandai sudah ditonton</i>`;

  await sendMessage(chatId, msg);
}
