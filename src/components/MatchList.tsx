import type { Match } from '../types';
import { groupMatchesByDay } from '../lib/matchDisplay';
import { useCupMatchDisplay } from '../hooks/useCupMatchDisplay';
import { MatchCard } from './MatchCard';

interface MatchListProps {
  matches: Match[];
  teamName?: (id: string) => string;
  favoriteTeamId?: string | null;
  emptyMessage?: string;
  showDayHeaders?: boolean;
}

export function MatchList({
  matches,
  teamName: teamNameProp,
  favoriteTeamId = null,
  emptyMessage = 'Ingen kamper å vise ennå.',
  showDayHeaders = true,
}: MatchListProps) {
  const display = useCupMatchDisplay();
  const teamName = teamNameProp ?? display.teamName;
  const getTeamNames = display.getTeamNames;
  const getLabel = display.getLabel;
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
              const names = getTeamNames(m);
              const highlight =
                !!favoriteTeamId &&
                display.groupStageComplete &&
                (m.homeTeamId === favoriteTeamId || m.awayTeamId === favoriteTeamId);
              return (
                <MatchCard
                  key={m.id}
                  match={m}
                  homeName={names.homeName}
                  awayName={names.awayName}
                  displayLabel={getLabel(m)}
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
