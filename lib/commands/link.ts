import { supabase } from '../supabase';
import { sendMessage } from '../telegram';

export async function handleLinkStart(chatId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('user_sessions')
    .upsert({ chat_id: chatId, step: 'WAITING_SYNC_ID', draft_data: {} }, { onConflict: 'chat_id' });

  await sendMessage(
    chatId,
    `🔗 <b>Hubungkan Perangkat</b>\n\nSilakan ketik atau tempelkan <b>Sync ID</b> Anda yang ada di menu Options → Data Management ekstensi:\n\n<i>Contoh: awt-sync-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</i>`,
    {
      inline_keyboard: [[{ text: '🚫 Batal', callback_data: 'loker:cancel' }]]
    }
  );
}

export async function handleLinkStep(chatId: string, text: string): Promise<void> {
  if (!supabase) return;
  const syncId = text.trim();
  if (!syncId.startsWith('awt-sync-')) {
    await sendMessage(
      chatId,
      `❌ Format Sync ID tidak valid.\n\nHarus diawali dengan <code>awt-sync-</code>. Silakan ketik kembali Sync ID yang benar, atau klik Batal:`,
      {
        inline_keyboard: [[{ text: '🚫 Batal', callback_data: 'loker:cancel' }]]
      }
    );
    return;
  }

  const { data: syncData } = await supabase
    .from('sync_storage')
    .select('id')
    .eq('id', syncId)
    .single();

  if (!syncData) {
    await sendMessage(
      chatId,
      `❌ Sync ID <code>${syncId}</code> tidak ditemukan.\n\nPastikan Anda sudah mengaktifkan <b>Cloud Sync</b> di ekstensi dan menyalin ID dengan benar. Silakan ketik kembali:`,
      {
        inline_keyboard: [[{ text: '🚫 Batal', callback_data: 'loker:cancel' }]]
      }
    );
    return;
  }

  const { error } = await supabase
    .from('chat_links')
    .upsert({ chat_id: chatId, sync_id: syncId }, { onConflict: 'chat_id' });

  if (error) {
    console.error('Supabase upsert error:', JSON.stringify(error));
    await sendMessage(chatId, `❌ Gagal menyimpan link: <code>${error.message}</code>`);
    return;
  }

  await supabase.from('user_sessions').delete().eq('chat_id', chatId);
  await sendMessage(chatId, `✅ Berhasil dihubungkan!\n\nSync ID: <code>${syncId}</code>\n\nSekarang ketik /list untuk melihat daftar tontonan Anda.`);
}
