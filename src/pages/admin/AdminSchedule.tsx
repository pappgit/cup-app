import { useMemo, useState } from 'react';
import { useCup } from '../../hooks/useCup';
import type { CupDaySchedule, CourtCount, CupDays, ScheduleParams } from '../../types';
import { AVAILABLE_COURTS, DEFAULT_SCHEDULE_PARAMS } from '../../types';
import { computeGroupLayout, describeGroupPlan } from '../../lib/groups';
import { MatchList } from '../../components/MatchList';
import {
  getMatchDurationLabel,
  countScheduleSlots,
  slotDurationMinutes,
  validateSchedule,
  generateScheduleWithMeta,
  minTimeSlicesNeeded,
} from '../../lib/scheduler';
import {
  normalizeScheduleParams,
  buildDays,
  defaultCourts,
  addDays,
} from '../../lib/scheduleParams';

export function AdminSchedule() {
  const { cup, update } = useCup();
  const params = useMemo(
    () => normalizeScheduleParams(cup.scheduleParams ?? DEFAULT_SCHEDULE_PARAMS),
    [cup.scheduleParams]
  );
  const [msg, setMsg] = useState('');

  const setParams = (patch: Partial<ScheduleParams>) => {
    update({ scheduleParams: normalizeScheduleParams({ ...params, ...patch }) });
  };

  const setCupDays = (cupDays: CupDays) => {
    setParams({
      cupDays,
      days: buildDays(cupDays, params.days[0]),
    });
  };

  const setCourtCount = (courtCount: CourtCount) => {
    setParams({
      courtCount,
      courts: defaultCourts(courtCount),
    });
  };

  const toggleCourt = (name: string) => {
    const selected = params.courts.includes(name)
      ? params.courts.filter((c) => c !== name)
      : [...params.courts, name];
    if (selected.length > params.courtCount) return;
    if (selected.length === 0) return;
    setParams({ courts: selected });
  };

  const updateDay = (index: number, patch: Partial<CupDaySchedule>) => {
    const days = params.days.map((d, i) => (i === index ? { ...d, ...patch } : d));
    if (index === 0 && patch.date && params.cupDays > 1) {
      for (let i = 1; i < days.length; i++) {
        days[i] = { ...days[i], date: addDays(patch.date!, i) };
      }
    }
    setParams({ days });
  };

  const slots = countScheduleSlots(params);
  const validation = useMemo(
    () => validateSchedule(cup.teams, params),
    [cup.teams, params]
  );
  const slicesNeeded = useMemo(
    () => minTimeSlicesNeeded(cup.teams.length, validation.pairingsCount),
    [cup.teams.length, validation.pairingsCount]
  );

  const generate = async () => {
    const normalized = normalizeScheduleParams(params);
    const check = validateSchedule(cup.teams, normalized);

    if (!check.ok) {
      setMsg(check.errors.join(' '));
      return;
    }

    const result = generateScheduleWithMeta(cup.teams, normalized);

    if (result.matches.length === 0) {
      setMsg(
        'Ingen kamper ble plassert. Sjekk halltid (tid fra–til) og at det er nok tid i forhold til antall kamper per lag.'
      );
      return;
    }

    if (result.unscheduled > 0) {
      setMsg(
        `Ikke nok tid: ${result.unscheduled} av ${result.pairingsCount} kamper kunne ikke plasseres ` +
          `(ingen lag spiller to kamper på rad). Legg til flere dager, lengre halltid eller flere baner.`
      );
      return;
    }

    if (result.backToBackTeams > 0) {
      setMsg('Noen lag ble likevel satt opp med kamper for tett — prøv mer halltid.');
      return;
    }

    await update({
      matches: result.matches,
      scheduleParams: {
        ...normalized,
        groups: result.groups.length > 0 ? result.groups : undefined,
      },
    });
    setMsg(`Generert ${result.matches.length} kamper!`);
    setTimeout(() => setMsg(''), 5000);
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
        <div
          className={`alert ${
            msg.startsWith('Generert ') ? 'alert-success' : 'alert-error'
          }`}
        >
          {msg}
        </div>
      )}

      {cup.teams.length >= 2 && !validation.ok && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <strong>Før du genererer:</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
            {validation.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {cup.teams.length >= 2 && validation.ok && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          Klar til å generere: {validation.pairingsCount} kamper, {validation.timeSlicesCount}{' '}
          tidslufter, {validation.slotsCount} kampplasser.
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Parametere for kamprogram</h2>

        <div className="form-row cols-2">
          <div className="form-group">
            <label>Antall cup-dager</label>
            <select
              value={params.cupDays}
              onChange={(e) => setCupDays(Number(e.target.value) as CupDays)}
            >
              <option value={1}>1 dag</option>
              <option value={2}>2 dager</option>
              <option value={3}>3 dager</option>
            </select>
          </div>
          <div className="form-group">
            <label>Antall baner</label>
            <select
              value={params.courtCount}
              onChange={(e) => setCourtCount(Number(e.target.value) as CourtCount)}
            >
              <option value={1}>1 bane</option>
              <option value={2}>2 baner</option>
              <option value={3}>3 baner</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Velg baner ({params.courts.length}/{params.courtCount})</label>
          <div className="team-chip-list">
            {AVAILABLE_COURTS.map((court) => {
              const on = params.courts.includes(court);
              return (
                <button
                  key={court}
                  type="button"
                  className="team-chip"
                  style={{
                    cursor: 'pointer',
                    border: on ? '2px solid var(--purple)' : undefined,
                    opacity: on ? 1 : 0.55,
                  }}
                  onClick={() => toggleCourt(court)}
                >
                  {court}
                </button>
              );
            })}
          </div>
        </div>

        <h3 style={{ color: 'var(--purple)', fontSize: '1rem', margin: '1.25rem 0 0.75rem' }}>
          Dager og halltider
        </h3>
        {params.days.map((day, i) => (
          <div
            key={i}
            className="form-row cols-2"
            style={{
              marginBottom: '1rem',
              paddingBottom: '1rem',
              borderBottom: i < params.days.length - 1 ? '1px solid var(--grey-200)' : undefined,
            }}
          >
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Dag {i + 1} — dato</label>
              <input
                type="date"
                value={day.date}
                onChange={(e) => updateDay(i, { date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Tid fra</label>
              <input
                type="time"
                value={day.timeFrom}
                onChange={(e) => updateDay(i, { timeFrom: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Tid til</label>
              <input
                type="time"
                value={day.timeTo}
                onChange={(e) => updateDay(i, { timeTo: e.target.value })}
              />
            </div>
          </div>
        ))}

        <div className="form-row cols-2" style={{ marginTop: '0.5rem' }}>
          <div className="form-group">
            <label>Kamplengde</label>
            <select
              value={params.matchFormat}
              onChange={(e) =>
                setParams({ matchFormat: e.target.value as ScheduleParams['matchFormat'] })
              }
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
              onChange={(e) =>
                setParams({ matchBreak: Number(e.target.value) as ScheduleParams['matchBreak'] })
              }
            >
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
            </select>
          </div>
          {!params.seriesPlay && (
            <div className="form-group">
              <label>Alle skal spille (unike motstandere)</label>
              <select
                value={params.gamesPerTeam}
                onChange={(e) =>
                  setParams({
                    gamesPerTeam: Number(e.target.value) as ScheduleParams['gamesPerTeam'],
                  })
                }
              >
                <option value={2}>2 kamper</option>
                <option value={3}>3 kamper</option>
                <option value={4}>4 kamper</option>
                <option value={5}>5 kamper</option>
                <option value={6}>6 kamper</option>
                <option value={7}>7 kamper</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Seriekamper</label>
            <select
              value={params.seriesPlay ? 'ja' : 'nei'}
              onChange={(e) => setParams({ seriesPlay: e.target.value === 'ja' })}
            >
              <option value="nei">Nei — flest unike motstandere, ingen rematch</option>
              <option value="ja">Ja — grupper, tabell og sluttspill</option>
            </select>
          </div>
        </div>

        {params.seriesPlay && cup.teams.length >= 2 && (
          <div
            className="alert"
            style={{
              marginTop: '0.75rem',
              background: 'var(--yellow-soft)',
              color: 'var(--purple-dark)',
              fontSize: '0.85rem',
            }}
          >
            <strong>Gruppespill ({cup.teams.length} lag):</strong>{' '}
            {describeGroupPlan(cup.teams.length)}
            <br />
            <span style={{ opacity: 0.9 }}>
              Oppsett: {computeGroupLayout(cup.teams.length).label}
            </span>
          </div>
        )}

        {!params.seriesPlay && (
          <p style={{ fontSize: '0.85rem', color: 'var(--grey-600)', marginTop: '0.5rem' }}>
            Uten seriespill: hvert lag spiller valgt antall kamper mot{' '}
            <strong>forskjellige</strong> motstandere (samme lag møtes ikke to ganger).
          </p>
        )}

        <p style={{ fontSize: '0.85rem', color: 'var(--grey-600)' }}>
          {getMatchDurationLabel(params.matchFormat)} + {params.periodBreak} min pause mellom
          perioder. Ca. {slotDurationMinutes(params)} min per kamp inkl. pause.{' '}
          <strong>{slots}</strong> kampplasser totalt. Ingen lag spiller to kamper på rad
          (minst én tidsluft mellom hver kamp).
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
          <h2>
            Kamprogram
            <span className="match-count-badge">{cup.matches.length}</span>
          </h2>
          <MatchList
            matches={[...cup.matches].sort(
              (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            )}
            teamName={teamName}
            showDayHeaders
          />
        </div>
      )}
    </>
  );
}
