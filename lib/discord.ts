export async function sendDiscord(webhookUrl: string, text: string): Promise<void> {
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
