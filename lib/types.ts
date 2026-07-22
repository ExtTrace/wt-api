export interface MediaItem {
  title: string;
  episode?: string | null;
  season?: string | null;
  nextEpisode?: string | null;
  hasNewEpisode?: boolean;
  isArchived?: boolean;
  lastWatchedAt: string;
}

export interface MediaStorage {
  items: MediaItem[];
}

export interface JobApplication {
  id?: number;
  chat_id: string;
  company: string;
  position: string;
  status: string;
  updated_at?: string;
}

export interface UserSession {
  chat_id: string;
  step: string;
  draft_data: any;
  updated_at?: string;
}
