import { supabase } from './supabase';

export async function canAccessLoker(chatId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase
    .from('awt_chat_links')
    .select('can_use_loker')
    .eq('chat_id', chatId)
    .maybeSingle();

  return data?.can_use_loker ?? false;
}
