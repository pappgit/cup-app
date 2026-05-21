import { useCallback, useEffect, useState } from 'react';
import { SCHEDULE_VIEW_ALL } from '../components/ScheduleTeamFilter';
import {
  FAVORITE_TEAM_EVENT,
  getFavoriteTeamId,
  setFavoriteTeamId,
} from '../lib/storage';

export function useFavoriteTeam() {
  const [teamId, setTeamId] = useState(
    () => getFavoriteTeamId() ?? SCHEDULE_VIEW_ALL
  );

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail;
      setTeamId(detail ?? SCHEDULE_VIEW_ALL);
    };
    window.addEventListener(FAVORITE_TEAM_EVENT, onChange);
    return () => window.removeEventListener(FAVORITE_TEAM_EVENT, onChange);
  }, []);

  const setFavorite = useCallback((id: string) => {
    setFavoriteTeamId(id || null);
    setTeamId(id);
  }, []);

  return { teamId, setFavorite, favoriteTeamId: teamId || null };
}
