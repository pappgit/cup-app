import type { Match } from '../types';
import { groupMatchesByDay } from '../lib/matchDisplay';
import { MatchCard } from './MatchCard';

interface MatchListProps {
  matches: Match[];
  teamName: (id: string) => string;
  favoriteTeamId?: string | null;
  emptyMessage?: string;
  showDayHeaders?: boolean;
}

export function MatchList({
  matches,
  teamName,
  favoriteTeamId = null,
  emptyMessage = 'Ingen kamper å vise ennå.',
  showDayHeaders = true,
}: MatchListProps) {
  if (matches.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  const days = groupMatchesByDay(matches);

  return (
    <div className="match-program">
      {days.map((day) => (
        <section key={day.dateKey} className="match-day-group">
          {showDayHeaders && (
            <h3 className="match-day-heading">{day.dateLabel}</h3>
          )}
          <div className="match-cards">
            {day.items.map((m) => {
              const highlight =
                !!favoriteTeamId &&
                (m.homeTeamId === favoriteTeamId || m.awayTeamId === favoriteTeamId);
              return (
                <MatchCard
                  key={m.id}
                  match={m}
                  homeName={teamName(m.homeTeamId)}
                  awayName={teamName(m.awayTeamId)}
                  highlight={highlight}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
