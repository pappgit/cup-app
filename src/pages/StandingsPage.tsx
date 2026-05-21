import { Navigate } from 'react-router-dom';
import { useMemo } from 'react';
import { StandingsTables } from '../components/StandingsTables';
import { useCup } from '../hooks/useCup';
import { normalizeScheduleParams } from '../lib/scheduleParams';
import { DEFAULT_SCHEDULE_PARAMS } from '../types';

export function StandingsPage() {
  const { cup } = useCup();
  const params = normalizeScheduleParams(cup.scheduleParams ?? DEFAULT_SCHEDULE_PARAMS);
  const groups = params.groups ?? [];

  const subtitle = useMemo(
    () =>
      groups.length > 0
        ? '3 poeng for seier, 1 poeng for uavgjort · poeng → målforskjell → mål'
        : undefined,
    [groups.length]
  );

  if (!params.seriesPlay) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Tabell</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </header>

      <StandingsTables groups={groups} matches={cup.matches} teams={cup.teams} />
    </>
  );
}
