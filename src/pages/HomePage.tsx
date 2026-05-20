import { useMemo, useState } from 'react';
import { MatchList } from '../components/MatchList';
import { SCHEDULE_VIEW_ALL, ScheduleTeamFilter } from '../components/ScheduleTeamFilter';
import { useCup } from '../hooks/useCup';
import { getFavoriteTeamId } from '../lib/storage';
import { normalizeScheduleParams } from '../lib/scheduleParams';
import { DEFAULT_SCHEDULE_PARAMS } from '../types';
import { SponsorStrip } from '../components/SponsorStrip';

export function HomePage() {
  const { cup } = useCup();
  const [viewFilter, setViewFilter] = useState(() => getFavoriteTeamId() ?? SCHEDULE_VIEW_ALL);

  const params = normalizeScheduleParams(cup.scheduleParams ?? DEFAULT_SCHEDULE_PARAMS);
  const teamName = (id: string) => cup.teams.find((t) => t.id === id)?.name ?? 'Ukjent lag';

  const allMatches = useMemo(
    () =>
      [...cup.matches].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      ),
    [cup.matches]
  );

  const displayedMatches = useMemo(() => {
    if (!viewFilter) return allMatches;
    return allMatches.filter(
      (m) => m.homeTeamId === viewFilter || m.awayTeamId === viewFilter
    );
  }, [allMatches, viewFilter]);

  const hasResults = displayedMatches.some(
    (m) => m.homeScore != null && m.awayScore != null
  );

  const scheduleTitle = viewFilter
    ? `Kamper for ${teamName(viewFilter)}`
    : 'Kamprogram';

  return (
    <>
      <section className="hero">
        <h1>Velkommen til {cup.name}!</h1>
        <p>Velg lag for å se bare deres kamper, eller hele kamprogrammet.</p>
      </section>

      <div className="card">
        <h2>
          {scheduleTitle}
          {displayedMatches.length > 0 && (
            <span className="match-count-badge">{displayedMatches.length}</span>
          )}
        </h2>

        {cup.teams.length > 0 && (
          <ScheduleTeamFilter
            teams={cup.teams}
            value={viewFilter}
            onChange={setViewFilter}
          />
        )}

        {params.seriesPlay && hasResults && (
          <p className="schedule-results-hint">
            Resultater vises under hver kamp når de er registrert i admin.
          </p>
        )}

        {cup.matches.length === 0 ? (
          <p className="empty-state" style={{ padding: '1rem 0' }}>
            Kamprogrammet er ikke klart ennå. Kom tilbake snart!
          </p>
        ) : displayedMatches.length === 0 ? (
          <p className="empty-state" style={{ padding: '1rem 0' }}>
            Ingen kamper for {teamName(viewFilter)} ennå.
          </p>
        ) : (
          <MatchList
            matches={displayedMatches}
            teamName={teamName}
            favoriteTeamId={viewFilter || null}
            showDayHeaders
          />
        )}
      </div>

      <SponsorStrip sponsors={cup.sponsors} />
    </>
  );
}
