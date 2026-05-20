import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MatchList } from '../components/MatchList';
import { useCup } from '../hooks/useCup';
import { getFavoriteTeamId, setFavoriteTeamId } from '../lib/storage';
import { SponsorStrip } from '../components/SponsorStrip';

export function HomePage() {
  const { cup } = useCup();
  const [favoriteId, setFavoriteId] = useState(getFavoriteTeamId);

  const teamName = (id: string) => cup.teams.find((t) => t.id === id)?.name ?? 'Ukjent lag';

  const favoriteMatches = favoriteId
    ? cup.matches
        .filter((m) => m.homeTeamId === favoriteId || m.awayTeamId === favoriteId)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    : [];

  const upcoming = [...cup.matches]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 8);

  const handleFavorite = (id: string) => {
    setFavoriteTeamId(id);
    setFavoriteId(id);
  };

  return (
    <>
      <section className="hero">
        <h1>Velkommen til {cup.name}!</h1>
        <p>Følg med på kamper, velg favorittlag og besøk kiosken vår i hallen.</p>
      </section>

      {cup.teams.length > 0 && (
        <div className="card card-accent" style={{ marginBottom: '1.25rem' }}>
          <h2>Ditt favorittlag</h2>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select
              value={favoriteId ?? ''}
              onChange={(e) => handleFavorite(e.target.value)}
            >
              <option value="">Velg lag …</option>
              {cup.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {favoriteId && favoriteMatches.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <MatchList
                matches={favoriteMatches}
                teamName={teamName}
                favoriteTeamId={favoriteId}
                showDayHeaders={favoriteMatches.length > 3}
              />
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h2>
          Kamprogram
          {cup.matches.length > 0 && (
            <span className="match-count-badge">{cup.matches.length}</span>
          )}
        </h2>
        {cup.matches.length === 0 ? (
          <p className="empty-state" style={{ padding: '1rem 0' }}>
            Kamprogrammet er ikke klart ennå. Kom tilbake snart!
          </p>
        ) : (
          <>
            <MatchList
              matches={upcoming}
              teamName={teamName}
              favoriteTeamId={favoriteId}
              showDayHeaders
            />
            {cup.matches.length > 8 && (
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--grey-600)' }}>
                Viser de 8 neste kampene.{' '}
                <Link to="/kamper" className="link-accent">
                  Se hele programmet →
                </Link>
              </p>
            )}
          </>
        )}
      </div>

      <SponsorStrip sponsors={cup.sponsors} />
    </>
  );
}
