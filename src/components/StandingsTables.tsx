import { useMemo } from 'react';
import type { Group, Match, Team } from '../types';
import { computeStandings } from '../lib/standings';

interface StandingsTablesProps {
  groups: Group[];
  matches: Match[];
  teams: Team[];
  title?: string;
  compact?: boolean;
}

export function StandingsTables({
  groups,
  matches,
  teams,
  title,
  compact = false,
}: StandingsTablesProps) {
  const tables = useMemo(
    () =>
      groups.map((g) => ({
        group: g,
        rows: computeStandings(g, matches, teams),
      })),
    [groups, matches, teams]
  );

  if (groups.length === 0) {
    return (
      <p className="standings-empty">
        Ingen grupper ennå. Generer kamprogram eller opprett grupper under Kampprogram.
      </p>
    );
  }

  return (
    <div className={`standings-tables ${compact ? 'standings-tables--compact' : ''}`}>
      {title && <h3 className="standings-tables-title">{title}</h3>}
      {tables.map(({ group, rows }) => (
        <div key={group.id} className="standings-tables-group">
          <h4 className="standings-tables-group-name">{group.name}</h4>
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
                    <td>
                      {r.goalDifference >= 0 ? `+${r.goalDifference}` : r.goalDifference}
                    </td>
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
    </div>
  );
}
