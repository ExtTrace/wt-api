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
        .from('bot_user_sessions')
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
        'Psychological Test': [],
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
        'Psychological Test': '🧠',
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
      await supabase.from('bot_user_sessions').delete().eq('chat_id', chatId);
      await editMessageText(chatId, messageId, '🚫 Aksi pendaftaran/menghubungkan telah dibatalkan.', {
        inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
      });
      return;
  }

  // Handle Dynamic Sub-data Callback Queries
  if (callbackData.startsWith('loker:select_update:')) {
    const appId = callbackData.split(':')[2];
    await editMessageText(chatId, messageId, '🔄 <b>Pilih bagian lamaran yang ingin di-update:</b>', {
      inline_keyboard: [
        [{ text: '📍 Update Status/Tahap', callback_data: `loker:choose_status:${appId}` }],
        [{ text: '🌐 Update Platform', callback_data: `loker:choose_platform:${appId}` }],
        [{ text: '↩️ Kembali', callback_data: 'loker:update' }]
      ]
    });
    return;
  }

  if (callbackData.startsWith('loker:choose_status:')) {
    const appId = callbackData.split(':')[2];
    const statuses = ['Applied', 'Interview', 'Psychological Test', 'Technical Test', 'Offering', 'Accepted', 'Rejected'];

    const inlineKeyboard = statuses.map((status) => [
      {
        text: status,
        callback_data: `loker:set_status:${appId}:${status}`
      }
    ]);
    inlineKeyboard.push([{ text: '↩️ Kembali', callback_data: `loker:select_update:${appId}` }]);

    await editMessageText(chatId, messageId, '🔄 <b>Pilih Tahap/Status Baru:</b>', {
      inline_keyboard: inlineKeyboard
    });
    return;
  }

  if (callbackData.startsWith('loker:choose_platform:')) {
    const appId = callbackData.split(':')[2];
    const platformKeyboard = await getPlatformKeyboard(appId);
    await editMessageText(chatId, messageId, '🌐 <b>Pilih Platform Baru:</b>', {
      inline_keyboard: platformKeyboard
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

  if (callbackData.startsWith('loker:set_platform:')) {
    const parts = callbackData.split(':');
    const targetId = parts[2];
    const platformId = parts[3];

    if (targetId === 'draft') {
      const { data: session } = await supabase
        .from('bot_user_sessions')
        .select('*')
        .eq('chat_id', chatId)
        .single();

      if (!session) {
        await editMessageText(chatId, messageId, '❌ Sesi pendaftaran kedaluwarsa. Silakan mulai kembali.', {
          inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
        });
        return;
      }

      const newDraft = { ...session.draft_data, platform_id: platformId };
      await supabase
        .from('bot_user_sessions')
        .update({ step: 'WAITING_STATUS', draft_data: newDraft })
        .eq('chat_id', chatId);

      const statuses = ['Applied', 'Interview', 'Psychological Test', 'Technical Test', 'Offering', 'Accepted', 'Rejected'];
      const inlineKeyboard = statuses.map((status) => [
        {
          text: status,
          callback_data: `loker:set_status:draft:${status}`
        }
      ]);
      inlineKeyboard.push([{ text: '🚫 Batal', callback_data: 'loker:cancel' }]);

      await editMessageText(
        chatId,
        messageId,
        `🏢 Perusahaan: <b>${newDraft.company}</b>\n` +
        `💼 Posisi: <b>${newDraft.position}</b>\n\n` +
        `Terakhir, silakan pilih <b>Tahap/Status Awal</b> lamaran Anda:`,
        {
          inline_keyboard: inlineKeyboard
        }
      );
    } else {
      const { error } = await supabase
        .from('job_applications')
        .update({ platform_id: platformId, updated_at: new Date().toISOString() })
        .eq('id', targetId)
        .eq('chat_id', chatId);

      if (error) {
        await editMessageText(chatId, messageId, `❌ Gagal meng-update platform: ${error.message}`, {
          inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
        });
      } else {
        await editMessageText(chatId, messageId, `✅ Platform lamaran berhasil diperbarui!`, {
          inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
        });
      }
    }
    return;
  }

  if (callbackData.startsWith('loker:set_status:')) {
    const parts = callbackData.split(':');
    const targetId = parts[2];
    const newStatus = parts[3];

    if (targetId === 'draft') {
      const { data: session } = await supabase
        .from('bot_user_sessions')
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
          platform_id: draft.platform_id || null,
          status: newStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        await editMessageText(chatId, messageId, `❌ Gagal menyimpan lamaran: ${error.message}`, {
          inline_keyboard: [[{ text: '↩️ Kembali ke Menu', callback_data: 'loker:menu' }]]
        });
      } else {
        let platformName = '';
        if (draft.platform_id) {
          const { data: p } = await supabase.from('job_platforms').select('name').eq('id', draft.platform_id).single();
          if (p) platformName = p.name;
        }

        await supabase.from('bot_user_sessions').delete().eq('chat_id', chatId);
        await editMessageText(
          chatId,
          messageId,
          `✅ <b>Lamaran Berhasil Disimpan!</b>\n\n` +
          `🏢 Perusahaan: <b>${draft.company}</b>\n` +
          `💼 Posisi: <b>${draft.position}</b>\n` +
          (platformName ? `🌐 Platform: <b>${platformName}</b>\n` : '') +
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

async function getPlatformKeyboard(draftId: string = 'draft') {
  let platforms: any[] = [];
  if (supabase) {
    const { data } = await supabase.from('job_platforms').select('id, name, code').order('id', { ascending: true });
    if (data && data.length > 0) {
      platforms = data;
    }
  }

  if (platforms.length === 0) {
    platforms = [
      { id: 1, name: 'LinkedIn', code: 'linkedin' },
      { id: 2, name: 'JobStreet', code: 'jobstreet' },
      { id: 3, name: 'Glints', code: 'glints' },
      { id: 4, name: 'Kalibrr', code: 'kalibrr' },
      { id: 5, name: 'Glassdoor', code: 'glassdoor' },
      { id: 6, name: 'Instagram', code: 'instagram' },
      { id: 7, name: 'Email Direct', code: 'email' },
      { id: 8, name: 'Google Form', code: 'gform' },
      { id: 9, name: 'Website Perusahaan', code: 'company_site' },
      { id: 10, name: 'Lainnya', code: 'other' }
    ];
  }

  const inlineKeyboard: any[][] = [];
  for (let i = 0; i < platforms.length; i += 2) {
    const row: any[] = [
      { text: platforms[i].name, callback_data: `loker:set_platform:${draftId}:${platforms[i].id}` }
    ];
    if (i + 1 < platforms.length) {
      row.push({ text: platforms[i + 1].name, callback_data: `loker:set_platform:${draftId}:${platforms[i + 1].id}` });
    }
    inlineKeyboard.push(row);
  }
  inlineKeyboard.push([{ text: '🚫 Batal', callback_data: 'loker:cancel' }]);
  return inlineKeyboard;
}

export async function handleLokerConversationStep(chatId: string, text: string, session: any): Promise<void> {
  if (!supabase) return;
  const step = session.step;
  const draft = session.draft_data;

  if (step === 'WAITING_COMPANY') {
    const newDraft = { ...draft, company: text };
    await supabase
      .from('bot_user_sessions')
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
      .from('bot_user_sessions')
      .update({ step: 'WAITING_PLATFORM', draft_data: newDraft })
      .eq('chat_id', chatId);

    const platformKeyboard = await getPlatformKeyboard('draft');

    await sendMessage(
      chatId,
      `🏢 Perusahaan: <b>${draft.company}</b>\n` +
      `💼 Posisi: <b>${text}</b>\n\n` +
      `Selanjutnya, silakan pilih <b>Platform Lamaran</b> tempat Anda melamar:`,
      {
        inline_keyboard: platformKeyboard
      }
    );
  }
}
