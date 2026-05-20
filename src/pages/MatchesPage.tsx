import { useState } from 'react';
import { useCup } from '../hooks/useCup';
import { getFavoriteTeamId } from '../lib/storage';
import { formatMatchTime } from '../lib/scheduler';

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
      <h1 className="page-title">Kamper</h1>

      {cup.teams.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
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
        {matches.length === 0 ? (
          <p className="empty-state">Ingen kamper å vise ennå.</p>
        ) : (
          <ul className="match-list">
            {matches.map((m) => {
              const isFavorite =
                favoriteId &&
                (m.homeTeamId === favoriteId || m.awayTeamId === favoriteId);
              return (
                <li
                  key={m.id}
                  className={`match-item ${isFavorite ? 'match-favorite' : ''}`}
                >
                  <span className="match-time">{formatMatchTime(m.startTime)}</span>
                  <span className="match-teams">
                    {teamName(m.homeTeamId)}
                    <span className="vs">vs</span>
                    {teamName(m.awayTeamId)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
