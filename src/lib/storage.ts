/** Personlig lagring i nettleseren (favorittlag). Cup-data ligger i Supabase. */

const FAVORITE_KEY = 'tunet-cup-favorite';

export function getFavoriteTeamId(): string | null {
  return localStorage.getItem(FAVORITE_KEY);
}

export function setFavoriteTeamId(teamId: string | null): void {
  if (teamId) localStorage.setItem(FAVORITE_KEY, teamId);
  else localStorage.removeItem(FAVORITE_KEY);
}
