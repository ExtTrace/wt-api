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

export interface AniListMedia {
  id: number;
  title: {
    romaji: string;
    english: string | null;
  };
  nextAiringEpisode: {
    airingAt: number;
    episode: number;
  } | null;
}

export async function fetchUpcomingEpisode(title: string): Promise<AniListMedia | null> {
  try {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: ANILIST_QUERY,
        variables: { search: title },
      }),
    });

    if (!response.ok) return null;
    const json = await response.json() as { data?: { Media?: AniListMedia } };
    return json?.data?.Media ?? null;
  } catch (error) {
    console.error(`AniList query error for ${title}:`, error);
    return null;
  }
}
