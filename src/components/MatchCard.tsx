import type { Match } from '../types';
import { formatCourtAbbrev, formatCourtTitle } from '../lib/courtDisplay';
import { isPlayoffMatch } from '../lib/groups';
import { getMatchDisplayParts, PLAYOFF_TBD } from '../lib/matchDisplay';

interface MatchCardProps {
  match: Match;
  homeName: string;
  awayName: string;
  displayLabel?: string;
  highlight?: boolean;
  compact?: boolean;
}

export function MatchCard({
  match,
  homeName,
  awayName,
  displayLabel,
  highlight = false,
  compact = false,
}: MatchCardProps) {
  const { time, court } = getMatchDisplayParts(match.startTime, match.court);
  const courtAbbrev = formatCourtAbbrev(court);
  const courtTitle = formatCourtTitle(court);
  const hasScore = match.homeScore != null && match.awayScore != null;
  const isPlayoff = isPlayoffMatch(match);
  const isGroup = match.phase === 'group' && Boolean(match.groupId);
  const teamsPending = isPlayoff && homeName === PLAYOFF_TBD;

  const playoffDetail =
    isPlayoff && displayLabel && !displayLabel.startsWith('Sluttspill')
      ? displayLabel
      : isPlayoff && displayLabel === 'Sluttspill'
        ? undefined
        : isPlayoff
          ? displayLabel
          : undefined;

  return (
    <article
      className={`match-card ${highlight ? 'match-card--highlight' : ''} ${
        compact ? 'match-card--compact' : ''
      } ${isPlayoff ? 'match-card--playoff' : ''} ${isGroup ? 'match-card--group' : ''}`}
    >
      <div className="match-card-rail">
        {isPlayoff && <span className="match-card-playoff-badge">Sluttspill</span>}
        {match.matchNumber != null && (
          <span className="match-card-number">#{match.matchNumber}</span>
        )}
        <time className="match-card-time" dateTime={match.startTime}>
          {time}
        </time>
        {courtAbbrev && (
          <span
            className="match-card-court-abbr"
            title={courtTitle}
            aria-label={`Hall: ${court ?? courtAbbrev}`}
          >
            {courtAbbrev}
          </span>
        )}
      </div>

      <div className="match-card-main">
        {isGroup && (
          <span className="match-card-group-badge">Gruppe {match.groupId}</span>
        )}

        {isPlayoff && playoffDetail && (
          <span className="match-card-label match-card-label--playoff">{playoffDetail}</span>
        )}

        {teamsPending ? (
          <p className="match-card-tbd">{PLAYOFF_TBD}</p>
        ) : (
          <div className="match-card-teams">
            <div className="match-card-team match-card-team--home">
              <span className="match-card-team-name">{homeName}</span>
            </div>

            <div className="match-card-vs" aria-hidden>
              {hasScore ? (
                <span className="match-card-score">
                  {match.homeScore}
                  <span className="match-card-score-sep">–</span>
                  {match.awayScore}
                </span>
              ) : (
                <span className="match-card-vs-text">vs</span>
              )}
            </div>

            <div className="match-card-team match-card-team--away">
              <span className="match-card-team-name">{awayName}</span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
