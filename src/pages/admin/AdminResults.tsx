import { useState } from 'react';
import { MatchCard } from '../../components/MatchCard';
import { useCup } from '../../hooks/useCup';
import { refreshPlayoffTeams } from '../../lib/groups';
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
  teamName,
  onSave,
}: {
  match: Match;
  teamName: (id: string) => string;
  onSave: (id: string, h: string, a: string) => void;
}) {
  const displayMatch =
    match.groupId && !match.label
      ? { ...match, label: `Gruppe ${match.groupId}` }
      : match;

  return (
    <div className="result-row">
      <MatchCard
        match={displayMatch}
        homeName={teamName(match.homeTeamId)}
        awayName={teamName(match.awayTeamId)}
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
  const params = normalizeScheduleParams(cup.scheduleParams ?? DEFAULT_SCHEDULE_PARAMS);
  const groups = params.groups ?? [];
  const teamName = (id: string) => cup.teams.find((t) => t.id === id)?.name ?? '?';

  const saveScore = async (matchId: string, homeRaw: string, awayRaw: string) => {
    const homeScore = homeRaw === '' ? null : Math.max(0, Number(homeRaw));
    const awayScore = awayRaw === '' ? null : Math.max(0, Number(awayRaw));
    const matches = cup.matches.map((m) =>
      m.id === matchId ? { ...m, homeScore, awayScore } : m
    );
    await update({ matches });
  };

  const refreshPlayoffs = async () => {
    if (groups.length === 0) return;
    const matches = refreshPlayoffTeams(groups, cup.matches, cup.teams);
    await update({ matches });
  };

  const sortByTime = (list: Match[]) =>
    [...list].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const groupMatches = sortByTime(cup.matches.filter((m) => m.phase === 'group'));
  const playoffMatches = sortByTime(
    cup.matches.filter((m) => m.phase === 'crossover' || m.phase === 'quarterfinal')
  );
  const friendlyMatches = sortByTime(
    cup.matches.filter((m) => !m.phase || m.phase === 'friendly')
  );

  if (cup.matches.length === 0) {
    return <div className="empty-state">Generer kamprogram først under Kamprogram.</div>;
  }

  return (
    <>
      <header className="page-header">
        <h2 className="page-title" style={{ fontSize: '1.25rem' }}>
          Resultater
        </h2>
        <p className="page-subtitle">
          Legg inn mål for hjemme- og bortelag. Ved sluttspill: oppdater sluttspill når gruppene er ferdige.
        </p>
      </header>

      {params.seriesPlay && playoffMatches.length > 0 && (
        <button
          type="button"
          className="btn btn-outline"
          style={{ marginBottom: '1.25rem', width: '100%' }}
          onClick={refreshPlayoffs}
        >
          Oppdater sluttspill fra tabell
        </button>
      )}

      {groupMatches.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3>Gruppespill</h3>
          {groupMatches.map((m) => (
            <ResultRow key={m.id} match={m} teamName={teamName} onSave={saveScore} />
          ))}
        </div>
      )}

      {playoffMatches.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3>Sluttspill</h3>
          {playoffMatches.map((m) => (
            <ResultRow key={m.id} match={m} teamName={teamName} onSave={saveScore} />
          ))}
        </div>
      )}

      {!params.seriesPlay && friendlyMatches.length > 0 && (
        <div className="card">
          <h3>Kamper</h3>
          {friendlyMatches.map((m) => (
            <ResultRow key={m.id} match={m} teamName={teamName} onSave={saveScore} />
          ))}
        </div>
      )}
    </>
  );
}
