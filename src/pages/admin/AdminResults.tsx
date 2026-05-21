import { useState } from 'react';
import { MatchCard } from '../../components/MatchCard';
import { StandingsTables } from '../../components/StandingsTables';
import { useCup } from '../../hooks/useCup';
import {
  applyPlayoffTeamUpdates,
  resolveGroupsForCup,
} from '../../lib/groups';
import { useCupMatchDisplay } from '../../hooks/useCupMatchDisplay';
import { normalizeScheduleParams } from '../../lib/scheduleParams';
import { DEFAULT_SCHEDULE_PARAMS, type Match } from '../../types';

function ScoreInputs({
  matchId,
  home,
  away,
  onSave,
}: {
  matchId: string;
  home: number | null | undefined;
  away: number | null | undefined;
  onSave: (id: string, h: string, a: string) => void;
}) {
  const [h, setH] = useState(home != null ? String(home) : '');
  const [a, setA] = useState(away != null ? String(away) : '');

  const sanitize = (v: string) => v.replace(/\D/g, '');

  return (
    <div className="result-row-scores" role="group" aria-label="Resultat">
      <label className="score-field">
        <span className="score-field-label">Hjemmelag</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="score-input"
          value={h}
          placeholder="0"
          onChange={(e) => setH(sanitize(e.target.value))}
          onBlur={() => onSave(matchId, h, a)}
        />
      </label>
      <span className="score-separator">–</span>
      <label className="score-field">
        <span className="score-field-label">Bortelag</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="score-input"
          value={a}
          placeholder="0"
          onChange={(e) => setA(sanitize(e.target.value))}
          onBlur={() => onSave(matchId, h, a)}
        />
      </label>
    </div>
  );
}

function ResultRow({
  match,
  getTeamNames,
  getLabel,
  onSave,
}: {
  match: Match;
  getTeamNames: (m: Match) => { homeName: string; awayName: string };
  getLabel: (m: Match) => string | undefined;
  onSave: (id: string, h: string, a: string) => void;
}) {
  const names = getTeamNames(match);
  const displayMatch =
    match.groupId && !match.label
      ? { ...match, label: `Gruppe ${match.groupId}` }
      : match;

  return (
    <div className="result-row">
      <MatchCard
        match={displayMatch}
        homeName={names.homeName}
        awayName={names.awayName}
        displayLabel={getLabel(match) ?? (match.groupId ? `Gruppe ${match.groupId}` : undefined)}
        compact
      />
      <ScoreInputs
        matchId={match.id}
        home={match.homeScore}
        away={match.awayScore}
        onSave={onSave}
      />
    </div>
  );
}

export function AdminResults() {
  const { cup, update } = useCup();
  const {
    matches: cupMatches,
    getTeamNames,
    getLabel,
    groupStageComplete,
  } = useCupMatchDisplay();
  const params = normalizeScheduleParams(cup.scheduleParams ?? DEFAULT_SCHEDULE_PARAMS);
  const groups = resolveGroupsForCup(cup.teams, params);

  const saveScore = async (matchId: string, homeRaw: string, awayRaw: string) => {
    const homeScore = homeRaw === '' ? null : Math.max(0, Number(homeRaw));
    const awayScore = awayRaw === '' ? null : Math.max(0, Number(awayRaw));
    let matches = cup.matches.map((m) =>
      m.id === matchId ? { ...m, homeScore, awayScore } : m
    );
    matches = applyPlayoffTeamUpdates(matches, cup.teams, groups, params.seriesPlay);
    await update({ matches });
  };

  const sortByTime = (list: Match[]) =>
    [...list].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const groupMatches = sortByTime(cupMatches.filter((m) => m.phase === 'group'));
  const playoffMatches = sortByTime(
    cupMatches.filter((m) => m.phase === 'crossover' || m.phase === 'quarterfinal')
  );
  const friendlyMatches = sortByTime(
    cupMatches.filter((m) => !m.phase || m.phase === 'friendly')
  );

  if (cupMatches.length === 0) {
    return <div className="empty-state">Generer kamprogram først under Kamprogram.</div>;
  }

  return (
    <>
      <header className="page-header">
        <h2 className="page-title" style={{ fontSize: '1.25rem' }}>
          Resultater
        </h2>
        <p className="page-subtitle">
          Legg inn mål for hjemme- og bortelag. Sluttspill-lag vises når alle gruppespillkamper har
          resultat{groupStageComplete ? ' (klar)' : ''}.
        </p>
      </header>

      {params.seriesPlay && groups.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3>Tabell</h3>
          <p className="schedule-hint" style={{ marginTop: 0 }}>
            Oppdateres når du lagrer resultater. Samme tabell som på forsiden under Tabell.
          </p>
          <StandingsTables
            groups={groups}
            matches={cup.matches}
            teams={cup.teams}
            compact
          />
        </div>
      )}

      {groupMatches.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3>Gruppespill</h3>
          {groupMatches.map((m) => (
            <ResultRow key={m.id} match={m} getTeamNames={getTeamNames} getLabel={getLabel} onSave={saveScore} />
          ))}
        </div>
      )}

      {playoffMatches.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3>Sluttspill</h3>
          {playoffMatches.map((m) => (
            <ResultRow key={m.id} match={m} getTeamNames={getTeamNames} getLabel={getLabel} onSave={saveScore} />
          ))}
        </div>
      )}

      {!params.seriesPlay && friendlyMatches.length > 0 && (
        <div className="card">
          <h3>Kamper</h3>
          {friendlyMatches.map((m) => (
            <ResultRow key={m.id} match={m} getTeamNames={getTeamNames} getLabel={getLabel} onSave={saveScore} />
          ))}
        </div>
      )}
    </>
  );
}
