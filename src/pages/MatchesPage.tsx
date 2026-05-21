import { useMemo } from 'react';
import { MatchList } from '../components/MatchList';
import { ScheduleTeamFilter } from '../components/ScheduleTeamFilter';
import { isPlayoffPhase } from '../lib/groups';
import { useCup } from '../hooks/useCup';
import { useCupMatchDisplay } from '../hooks/useCupMatchDisplay';
import { useFavoriteTeam } from '../hooks/useFavoriteTeam';

export function MatchesPage() {
  const { cup } = useCup();
  const { matches: cupMatches, groupStageComplete, teamName } = useCupMatchDisplay();
  const { teamId: viewFilter, setFavorite: setViewFilter } = useFavoriteTeam();

  const matches = useMemo(() => {
    const sorted = [...cupMatches].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    if (!viewFilter) return sorted;
    return sorted.filter((m) => {
      if (isPlayoffPhase(m.phase) && !groupStageComplete) return false;
      return m.homeTeamId === viewFilter || m.awayTeamId === viewFilter;
    });
  }, [cupMatches, viewFilter, groupStageComplete]);

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1 className="page-title">Kamper</h1>
        <p className="page-subtitle">
          {matches.length > 0
            ? `${matches.length} kamp${matches.length !== 1 ? 'er' : ''}${
                viewFilter ? ` · ${teamName(viewFilter)}` : ' · hele programmet'
              }`
            : 'Kamprogrammet publiseres snart.'}
        </p>
      </header>

      {cup.teams.length > 0 && (
        <div className="filter-bar">
          <ScheduleTeamFilter
            teams={cup.teams}
            value={viewFilter}
            onChange={setViewFilter}
            id="matches-team-filter"
            label="Vis kamper for"
          />
        </div>
      )}

      <div className="card">
        <h2>Program</h2>
        <MatchList
          matches={matches}
          teamName={teamName}
          favoriteTeamId={viewFilter || null}
          emptyMessage="Ingen kamper å vise med valgt filter."
        />
      </div>
    </div>
  );
}
