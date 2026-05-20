import type { Match } from '../types';
import { getMatchDisplayParts } from '../lib/matchDisplay';

interface MatchCardProps {
  match: Match;
  homeName: string;
  awayName: string;
  highlight?: boolean;
  compact?: boolean;
}

export function MatchCard({
  match,
  homeName,
  awayName,
  highlight = false,
  compact = false,
}: MatchCardProps) {
  const { time, court } = getMatchDisplayParts(match.startTime, match.court);
  const hasScore = match.homeScore != null && match.awayScore != null;

  return (
    <article
      className={`match-card ${highlight ? 'match-card--highlight' : ''} ${
        compact ? 'match-card--compact' : ''
      }`}
    >
      <div className="match-card-meta">
        <span className="match-card-time">{time}</span>
        {court && <span className="match-card-court">{court}</span>}
      </div>

      {match.label && <p className="match-card-label">{match.label}</p>}

      <div className="match-card-teams">
        <span className="match-card-team match-card-team--home">{homeName}</span>
        <span className="match-card-vs" aria-hidden>
          {hasScore ? (
            <span className="match-card-score">
              {match.homeScore}–{match.awayScore}
            </span>
          ) : (
            'vs'
          )}
        </span>
        <span className="match-card-team match-card-team--away">{awayName}</span>
      </div>
    </article>
  );
}
