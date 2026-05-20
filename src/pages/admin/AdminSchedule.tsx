import { useState } from 'react';
import { useCup } from '../../hooks/useCup';
import type { ScheduleParams } from '../../types';
import { DEFAULT_SCHEDULE_PARAMS } from '../../types';
import { generateSchedule, formatMatchTime, getMatchDurationLabel } from '../../lib/scheduler';

export function AdminSchedule() {
  const { cup, update } = useCup();
  const params: ScheduleParams = cup.scheduleParams ?? DEFAULT_SCHEDULE_PARAMS;
  const [msg, setMsg] = useState('');

  const setParams = (patch: Partial<ScheduleParams>) => {
    update({ scheduleParams: { ...params, ...patch } });
  };

  const generate = async () => {
    if (cup.teams.length < 2) {
      setMsg('Legg inn minst 2 lag først');
      return;
    }
    const matches = generateSchedule(cup.teams, params);
    await update({ matches, scheduleParams: params });
    setMsg(`Generert ${matches.length} kamper!`);
    setTimeout(() => setMsg(''), 3000);
  };

  const clearMatches = async () => {
    if (confirm('Slette hele kamprogrammet?')) {
      await update({ matches: [] });
    }
  };

  const teamName = (id: string) => cup.teams.find((t) => t.id === id)?.name ?? '?';

  return (
    <>
      {msg && (
        <div className={`alert ${msg.includes('Generert') ? 'alert-success' : 'alert-error'}`}>
          {msg}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Parametere for kamprogram</h2>
        <div className="form-row cols-2">
          <div className="form-group">
            <label>Kamplengde</label>
            <select
              value={params.matchFormat}
              onChange={(e) => setParams({ matchFormat: e.target.value as ScheduleParams['matchFormat'] })}
            >
              <option value="2x15">2 × 15 min</option>
              <option value="2x20">2 × 20 min</option>
              <option value="3x15">3 × 15 min</option>
              <option value="3x20">3 × 20 min</option>
            </select>
          </div>
          <div className="form-group">
            <label>Pausetid (mellom perioder)</label>
            <select
              value={params.periodBreak}
              onChange={(e) => setParams({ periodBreak: Number(e.target.value) as 5 | 10 })}
            >
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
            </select>
          </div>
          <div className="form-group">
            <label>Pause mellom kampene</label>
            <select
              value={params.matchBreak}
              onChange={(e) => setParams({ matchBreak: Number(e.target.value) as ScheduleParams['matchBreak'] })}
            >
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
            </select>
          </div>
          <div className="form-group">
            <label>Alle skal spille</label>
            <select
              value={params.gamesPerTeam}
              onChange={(e) => setParams({ gamesPerTeam: Number(e.target.value) as ScheduleParams['gamesPerTeam'] })}
            >
              <option value={5}>5 kamper</option>
              <option value={6}>6 kamper</option>
              <option value={7}>7 kamper</option>
            </select>
          </div>
          <div className="form-group">
            <label>Seriekamper</label>
            <select
              value={params.seriesPlay ? 'ja' : 'nei'}
              onChange={(e) => setParams({ seriesPlay: e.target.value === 'ja' })}
            >
              <option value="nei">Nei</option>
              <option value="ja">Ja</option>
            </select>
          </div>
          <div className="form-group">
            <label>Startdato (hallen)</label>
            <input
              type="date"
              value={params.startDate}
              onChange={(e) => setParams({ startDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Tid fra</label>
            <input
              type="time"
              value={params.timeFrom}
              onChange={(e) => setParams({ timeFrom: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Tid til</label>
            <input
              type="time"
              value={params.timeTo}
              onChange={(e) => setParams({ timeTo: e.target.value })}
            />
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--grey-600)' }}>
          Kampformat: {getMatchDurationLabel(params.matchFormat)} + {params.periodBreak} min pause
          mellom perioder. Slot per kamp inkl. pause mellom kamper: ca.{' '}
          {params.matchBreak} min etter kamp.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={generate}>
            Generer kamprogram
          </button>
          {cup.matches.length > 0 && (
            <button type="button" className="btn btn-outline" onClick={clearMatches}>
              Slett program
            </button>
          )}
        </div>
      </div>

      {cup.matches.length > 0 && (
        <div className="card">
          <h2>Kamprogram ({cup.matches.length} kamper)</h2>
          <ul className="match-list">
            {cup.matches.map((m) => (
              <li key={m.id} className="match-item">
                <span className="match-time">{formatMatchTime(m.startTime)}</span>
                <span className="match-teams">
                  {teamName(m.homeTeamId)}
                  <span className="vs">vs</span>
                  {teamName(m.awayTeamId)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
