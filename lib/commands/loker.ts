import { supabase } from '../supabase';
import { sendMessage, editMessageText, answerCallbackQuery } from '../telegram';

// Send Loker Main Menu Keyboard
export async function sendLokerMenu(chatId: string, messageId?: number) {
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

export async function handleLokerCallbackQuery(chatId: string, callbackQuery: any): Promise<void> {
  if (!supabase) return;
  const callbackData: string = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;

  await answerCallbackQuery(callbackQuery.id);

  switch (callbackData) {
    case 'loker:menu':
      await sendLokerMenu(chatId, messageId);
      return;

    case 'loker:add':
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
      return;

    case 'loker:list': {
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
        return;
      }

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

      if (!hasContent) msg += `Belum ada lamaran aktif.`;

      await editMessageText(chatId, messageId, msg.trim(), {
        inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
      });
      return;
    }

    case 'loker:update': {
      const { data: apps } = await supabase
        .from('job_applications')
        .select('*')
        .eq('chat_id', chatId);

      if (!apps || apps.length === 0) {
        await editMessageText(chatId, messageId, '❌ Tidak ada lamaran untuk di-update.', {
          inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
        });
        return;
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
      return;
    }

    case 'loker:delete': {
      const { data: apps } = await supabase
        .from('job_applications')
        .select('*')
        .eq('chat_id', chatId);

      if (!apps || apps.length === 0) {
        await editMessageText(chatId, messageId, '❌ Tidak ada lamaran untuk dihapus.', {
          inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
        });
        return;
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
      return;
    }

    case 'loker:cancel':
      await supabase.from('user_sessions').delete().eq('chat_id', chatId);
      await editMessageText(chatId, messageId, '🚫 Aksi pendaftaran/menghubungkan telah dibatalkan.', {
        inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
      });
      return;
  }

  // Handle Dynamic Sub-data Callback Queries
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
    return;
  }

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
    return;
  }

  if (callbackData.startsWith('loker:set_status:')) {
    const parts = callbackData.split(':');
    const targetId = parts[2];
    const newStatus = parts[3];

    if (targetId === 'draft') {
      const { data: session } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('chat_id', chatId)
        .single();

      if (!session) {
        await editMessageText(chatId, messageId, '❌ Sesi pendaftaran kedaluwarsa. Silakan mulai kembali.', {
          inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
        });
        return;
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
  }
}

export async function handleLokerConversationStep(chatId: string, text: string, session: any): Promise<void> {
  if (!supabase) return;
  const step = session.step;
  const draft = session.draft_data;

  if (step === 'WAITING_COMPANY') {
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
    return;
  }

  if (step === 'WAITING_POSITION') {
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
  }
}
