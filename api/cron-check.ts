import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const apiUrl = process.env.TELEGRAM_API_URL;
const botToken = process.env.TELEGRAM_BOT_TOKEN;

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const ANILIST_URL = 'https://graphql.anilist.co';
const ANILIST_QUERY = `
  query ($search: String) {
    Media(search: $search, type: ANIME, status_in: [RELEASING, NOT_YET_RELEASED]) {
      id
      title { romaji english }
      nextAiringEpisode { airingAt episode }
    }
  }
`;

// Helper: send Telegram notification
async function sendTelegram(chatId: string, text: string): Promise<void> {
  if (!botToken || !apiUrl) return;
  await fetch(`${apiUrl}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

// Helper: send Discord notification
async function sendDiscord(webhookUrl: string, text: string): Promise<void> {
  // Convert HTML tags to Markdown/Discord format simply
  let discordText = text
    .replace(/<b>(.*?)<\/b>/g, '**$1**')
    .replace(/<i>(.*?)<\/i>/g, '*$1*')
    .replace(/<code>(.*?)<\/code>/g, '`$1`')
    .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)');

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: discordText }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' });
  }

  try {
    // 1. Fetch all sync storage records
    const { data: records, error: fetchError } = await supabase
      .from('sync_storage')
      .select('*');

    if (fetchError) throw fetchError;

    const results = [];

    // 2. Loop through each sync record
    for (const record of records || []) {
      const payload = record.data;
      if (!payload || !payload.cloudSettings?.enabled || !payload.cloudSettings?.useCloudCron) {
        continue; // Skip if Cloud Sync or Cloud Cron is disabled
      }

      const items = payload.items || [];
      const tgSettings = payload.telegramSettings;
      const dsSettings = payload.discordSettings;

      // Skip if no notifications are configured
      const tgEnabled = tgSettings?.enabled && tgSettings?.chatId;
      const dsEnabled = dsSettings?.enabled && dsSettings?.webhookUrl;
      if (!tgEnabled && !dsEnabled) {
        continue;
      }

      let updated = false;
      const newlyReleased = [];
      const upcomingReminders = [];

      // Process each media item
      for (const item of items) {
        if (item.isArchived) continue;

        let shouldQuery = true;
        if (item.nextEpisodeAvailableAt) {
          const nextAiringMs = new Date(item.nextEpisodeAvailableAt).getTime();
          const now = Date.now();
          const timeUntilAiring = nextAiringMs - now;

          if (timeUntilAiring > 0) {
            shouldQuery = false;

            // Reminder within 24 hours
            const ONE_DAY_MS = 24 * 60 * 60 * 1000;
            if (timeUntilAiring <= ONE_DAY_MS && item.nextEpisode) {
              const reminderStr = `Episode ${item.nextEpisode}`;
              if (item.lastNotifiedReminderEpisode !== reminderStr) {
                item.lastNotifiedReminderEpisode = reminderStr;
                updated = true;
                upcomingReminders.push({
                  title: item.title,
                  episode: reminderStr,
                  time: item.nextEpisodeAvailableAt,
                  link: item.url,
                });
              }
            }
          }
        }

        if (shouldQuery) {
          try {
            const aniResponse = await fetch(ANILIST_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ query: ANILIST_QUERY, variables: { search: item.title } }),
            });

            if (aniResponse.ok) {
              const json = await aniResponse.json() as any;
              const anilistResult = json?.data?.Media;

              if (anilistResult?.nextAiringEpisode) {
                const nextEpNum = anilistResult.nextAiringEpisode.episode;
                const latestAiredEpNum = nextEpNum - 1;
                const latestAiredEpStr = `Episode ${latestAiredEpNum}`;

                const userWatchedEpMatch = item.episode?.match(/\d+/);
                const userWatchedEpNum = userWatchedEpMatch ? parseInt(userWatchedEpMatch[0], 10) : 0;

                // Save next airing time
                item.nextEpisodeAvailableAt = new Date(anilistResult.nextAiringEpisode.airingAt * 1000).toISOString();
                item.nextEpisode = nextEpNum.toString();
                updated = true;

                if (
                  latestAiredEpNum > 0 &&
                  latestAiredEpNum > userWatchedEpNum &&
                  item.lastNotifiedEpisode !== latestAiredEpStr
                ) {
                  item.lastNotifiedEpisode = latestAiredEpStr;
                  item.hasNewEpisode = true;
                  newlyReleased.push({
                    title: item.title,
                    episode: latestAiredEpStr,
                    link: item.url,
                  });
                }
              } else {
                // Set checking offset for completed series to avoid spam
                item.nextEpisodeAvailableAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                item.nextEpisode = null;
                updated = true;
              }
            }
          } catch (err) {
            console.error(`Error querying AniList for ${item.title}:`, err);
          }
        }
      }

      // Build message
      let fullMessage = '';

      if (upcomingReminders.length > 0) {
        fullMessage += `⏰ <b>${upcomingReminders.length} Anime Akan Tayang (Besok)!</b>\n\n`;
        for (const reminder of upcomingReminders) {
          const dateStr = new Date(reminder.time).toLocaleDateString('id-ID', {
            weekday: 'short', day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'
          });
          fullMessage += `<b>${reminder.title}</b>\n${reminder.episode} - ${dateStr} WIB\n<a href="${reminder.link}">Tonton Besok</a>\n\n`;
        }
      }

      if (newlyReleased.length > 0) {
        fullMessage += `🎬 <b>${newlyReleased.length} Anime Sedang Tayang!</b>\n\n`;
        for (const release of newlyReleased) {
          fullMessage += `<b>${release.title}</b>\n${release.episode} - <a href="${release.link}">Tonton Sekarang</a>\n\n`;
        }
      }

      if (fullMessage.trim()) {
        const finalMessage = `🌙 <b>Anime Daily Digest (Cloud)</b>\n\n${fullMessage.trim()}`;

        if (tgEnabled) {
          await sendTelegram(tgSettings.chatId, finalMessage).catch(console.error);
        }
        if (dsEnabled) {
          await sendDiscord(dsSettings.webhookUrl, finalMessage).catch(console.error);
        }
      }

      // Save updated data to Supabase
      if (updated) {
        payload.items = items;
        const { error: updateError } = await supabase
          .from('sync_storage')
          .update({ data: payload, updated_at: new Date().toISOString() })
          .eq('id', record.id);

        if (updateError) {
          console.error(`Failed to update supabase record ${record.id}:`, updateError);
        }
      }

      results.push({ id: record.id, updated, notified: !!fullMessage.trim() });
    }

    return res.status(200).json({ success: true, results });
  } catch (error: any) {
    console.error('Cron error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
