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
  const phaseKind =
    match.phase === 'final'
      ? 'Finale'
      : match.phase === 'semifinal'
        ? 'Semifinale'
        : match.phase === 'quarterfinal'
          ? 'Kvartfinale'
          : 'Sluttspill';
  const teamsPending = isPlayoff && homeName === PLAYOFF_TBD;
  const showPhaseCell = isGroup || isPlayoff;

  const playoffDetail =
    isPlayoff && displayLabel && !displayLabel.startsWith('Sluttspill')
      ? displayLabel
      : undefined;

  return (
    <article
      className={`match-card ${highlight ? 'match-card--highlight' : ''} ${
        compact ? 'match-card--compact' : ''
      } ${isPlayoff ? 'match-card--playoff' : ''} ${isGroup ? 'match-card--group' : ''} ${
        showPhaseCell ? 'match-card--has-phase' : 'match-card--no-phase'
      } ${courtAbbrev ? '' : 'match-card--no-court'}`}
    >
      <div className="match-card-meta">
        <div className="match-card-cell match-card-cell--schedule">
          {match.matchNumber != null && (
            <span className="match-card-number">#{match.matchNumber}</span>
          )}
          <time className="match-card-time" dateTime={match.startTime}>
            {time}
          </time>
        </div>

        {courtAbbrev && (
          <div
            className="match-card-cell match-card-cell--court"
            title={courtTitle}
            aria-label={`Hall: ${court ?? courtAbbrev}`}
          >
            <span className="match-card-court-abbr">{courtAbbrev}</span>
          </div>
        )}

        {showPhaseCell && (
          <div
            className={`match-card-cell match-card-cell--phase ${
              isPlayoff ? 'match-card-cell--phase-playoff' : ''
            }`}
          >
            {isGroup ? (
              <>
                <span className="match-card-phase-kind">Gruppespill</span>
                <span className="match-card-phase-detail">Gruppe {match.groupId}</span>
              </>
            ) : (
              <span className="match-card-phase-kind">{phaseKind}</span>
            )}
          </div>
        )}
      </div>

      <div className="match-card-main">
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
