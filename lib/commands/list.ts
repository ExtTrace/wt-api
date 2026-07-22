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

export async function handleList(chatId: string): Promise<void> {
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
  const allItems = storage?.items ?? [];

  if (allItems.length === 0) {
    await sendMessage(chatId, '📋 Daftar tontonan Anda masih kosong.');
    return;
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
}
