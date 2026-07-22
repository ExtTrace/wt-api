import { sendMessage } from '../telegram';

export async function handleStart(chatId: string): Promise<void> {
  await sendMessage(
    chatId,
    `👋 Selamat datang di <b>Anime Watch Tracker Bot</b>!\n\n` +
    `Gunakan perintah berikut:\n` +
    `• <code>/link</code> — Hubungkan bot ke ekstensi Anda\n` +
    `• <code>/list</code> — Lihat daftar tontonan Anda\n` +
    `• <code>/new</code> — Episode baru yang belum ditonton\n` +
    `• <code>/schedule</code> — Cek jadwal episode berikutnya\n` +
    `• <code>/loker</code> — 💼 Kelola dan lacak progress Lamaran Kerja Anda\n\n` +
    `Untuk menghubungkan, buka menu <b>Options → Data Management</b> di ekstensi, ` +
    `salin Sync ID Anda, lalu ketik /link di sini.`
  );
}
