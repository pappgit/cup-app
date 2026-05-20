import { useState } from 'react';
import { MatchList } from '../components/MatchList';
import { useCup } from '../hooks/useCup';
import { getFavoriteTeamId } from '../lib/storage';

export function MatchesPage() {
  const { cup } = useCup();
  const favoriteId = getFavoriteTeamId();
  const [filterTeam, setFilterTeam] = useState<string>(favoriteId ?? '');

  const teamName = (id: string) => cup.teams.find((t) => t.id === id)?.name ?? 'Ukjent lag';

  let matches = [...cup.matches].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  if (filterTeam) {
    matches = matches.filter(
      (m) => m.homeTeamId === filterTeam || m.awayTeamId === filterTeam
    );
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Kamper</h1>
        {matches.length > 0 && (
          <p className="page-subtitle">
            {matches.length} kamp{matches.length !== 1 ? 'er' : ''}
            {filterTeam ? ` · ${teamName(filterTeam)}` : ''}
          </p>
        )}
      </header>

      {cup.teams.length > 0 && (
        <div className="card filter-bar">
          <div className="form-group">
            <label>Filtrer på lag</label>
            <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
              <option value="">Alle lag</option>
              {cup.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="card">
        <MatchList
          matches={matches}
          teamName={teamName}
          favoriteTeamId={favoriteId}
        />
      </div>
    </>
  );
}
