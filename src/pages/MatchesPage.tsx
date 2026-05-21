import { useMemo } from 'react';
import { MatchList } from '../components/MatchList';
import { ScheduleTeamFilter } from '../components/ScheduleTeamFilter';
import { useCup } from '../hooks/useCup';
import { useCupMatches } from '../hooks/useCupMatches';
import { useFavoriteTeam } from '../hooks/useFavoriteTeam';

export function MatchesPage() {
  const { cup } = useCup();
  const cupMatches = useCupMatches();
  const { teamId: viewFilter, setFavorite: setViewFilter } = useFavoriteTeam();

  const teamName = (id: string) => cup.teams.find((t) => t.id === id)?.name ?? 'Ukjent lag';

  const matches = useMemo(() => {
    const sorted = [...cupMatches].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    if (!viewFilter) return sorted;
    return sorted.filter(
      (m) => m.homeTeamId === viewFilter || m.awayTeamId === viewFilter
    );
  }, [cupMatches, viewFilter]);

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Kamper</h1>
        {matches.length > 0 && (
          <p className="page-subtitle">
            {matches.length} kamp{matches.length !== 1 ? 'er' : ''}
            {viewFilter ? ` · ${teamName(viewFilter)}` : ' · hele programmet'}
          </p>
        )}
      </header>

      {cup.teams.length > 0 && (
        <div className="card filter-bar">
          <ScheduleTeamFilter
            teams={cup.teams}
            value={viewFilter}
            onChange={setViewFilter}
            id="matches-team-filter"
          />
        </div>
      )}

      <div className="card">
        <MatchList matches={matches} teamName={teamName} favoriteTeamId={viewFilter || null} />
      </div>
    </>
  );
}
