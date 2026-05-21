import { Navigate } from 'react-router-dom';
import { useCup } from '../hooks/useCup';
import { computeStandings } from '../lib/standings';
import { normalizeScheduleParams } from '../lib/scheduleParams';
import { DEFAULT_SCHEDULE_PARAMS } from '../types';
import { useMemo } from 'react';

export function StandingsPage() {
  const { cup } = useCup();
  const params = normalizeScheduleParams(cup.scheduleParams ?? DEFAULT_SCHEDULE_PARAMS);
  const groups = params.groups ?? [];

  const tables = useMemo(
    () =>
      groups.map((g) => ({
        group: g,
        rows: computeStandings(g, cup.matches, cup.teams),
      })),
    [groups, cup.matches, cup.teams]
  );

  if (!params.seriesPlay) {
    return <Navigate to="/" replace />;
  }

  if (groups.length === 0) {
    return (
      <div className="empty-state">
        <p>Tabell er tilgjengelig når kamprogram er generert med sluttspill.</p>
        <p style={{ fontSize: '0.9rem', color: 'var(--grey-600)' }}>
          Admin: sett Sluttspill til Ja under Kamprogram og generer kamprogram.
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Tabell</h1>
        <p className="page-subtitle">
          3 poeng for seier, 1 poeng for uavgjort · poeng → målforskjell → mål
        </p>
      </header>

      {tables.map(({ group, rows }) => (
        <div key={group.id} className="card" style={{ marginBottom: '1.5rem' }}>
          <h2>{group.name}</h2>
          <div className="standings-wrap">
            <table className="standings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Lag</th>
                  <th>K</th>
                  <th>S</th>
                  <th>U</th>
                  <th>T</th>
                  <th>Mål</th>
                  <th>MF</th>
                  <th>P</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.teamId}>
                    <td>{i + 1}</td>
                    <td>{r.teamName}</td>
                    <td>{r.played}</td>
                    <td>{r.won}</td>
                    <td>{r.drawn}</td>
                    <td>{r.lost}</td>
                    <td>
                      {r.goalsFor}–{r.goalsAgainst}
                    </td>
                    <td>{r.goalDifference >= 0 ? `+${r.goalDifference}` : r.goalDifference}</td>
                    <td>
                      <strong>{r.points}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
