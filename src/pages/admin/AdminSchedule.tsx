import { useMemo, useState } from 'react';
import { useCup } from '../../hooks/useCup';
import type { CupDaySchedule, CourtCount, CupDays, ScheduleParams } from '../../types';
import { DEFAULT_SCHEDULE_PARAMS } from '../../types';
import {
  PLAYOFF_COURT,
  computeGroupLayout,
  describeGroupPlan,
} from '../../lib/groups';
import { CourtAvailabilityMatrix } from '../../components/CourtAvailabilityMatrix';
import { MatchList } from '../../components/MatchList';
import {
  getMatchDurationLabel,
  calculateScheduleEstimate,
  validateSchedule,
  generateScheduleWithMeta,
  slotDurationMinutes,
} from '../../lib/scheduler';
import {
  normalizeScheduleParams,
  buildDays,
  addDays,
  syncAllDaysCourtTimes,
  getActiveCourtNames,
} from '../../lib/scheduleParams';
import type { ScheduleEstimate } from '../../lib/scheduler';

export function AdminSchedule() {
  const { cup, update } = useCup();
  const params = useMemo(
    () => normalizeScheduleParams(cup.scheduleParams ?? DEFAULT_SCHEDULE_PARAMS),
    [cup.scheduleParams]
  );
  const [msg, setMsg] = useState('');
  const [estimate, setEstimate] = useState<ScheduleEstimate | null>(null);

  const setParams = (patch: Partial<ScheduleParams>) => {
    let merged = { ...params, ...patch };
    if (patch.days) {
      merged.days = syncAllDaysCourtTimes(patch.days);
      merged.courts = getActiveCourtNames(merged.days);
    }
    const next = normalizeScheduleParams(merged);
    update({ scheduleParams: next });
    setEstimate(null);
  };

  const setCupDays = (cupDays: CupDays) => {
    const days = buildDays(cupDays, params.days[0]);
    setParams({ cupDays, days });
  };

  const setCourtCount = (courtCount: CourtCount) => {
    setParams({ courtCount });
  };

  const handleDaysChange = (days: CupDaySchedule[]) => {
    setParams({ days });
  };

  const handleDayDateChange = (dayIndex: number, date: string) => {
    let days = params.days.map((d, i) => (i === dayIndex ? { ...d, date } : d));
    if (dayIndex === 0 && params.cupDays > 1) {
      for (let i = 1; i < days.length; i++) {
        days[i] = { ...days[i], date: addDays(date, i) };
      }
    }
    setParams({ days });
  };

  const runCalculate = () => {
    setEstimate(calculateScheduleEstimate(cup.teams, params));
    setMsg('');
  };

  const validation = useMemo(() => {
    try {
      return validateSchedule(cup.teams, params);
    } catch (err) {
      console.error('validateSchedule failed', err);
      return {
        ok: false,
        errors: ['Kunne ikke sjekke kamprogrammet.'],
        pairingsCount: 0,
        timeSlicesCount: 0,
        slotsCount: 0,
        gamesPerTeam: params.gamesPerTeam,
      };
    }
  }, [cup.teams, params]);

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
        'Ingen kamper ble plassert. Trykk Beregn først, og sjekk halltid per bane.'
      );
      return;
    }

    if (result.unscheduled > 0) {
      setMsg(
        `Ikke nok tid: ${result.unscheduled} av ${result.pairingsCount} kamper kunne ikke plasseres.`
      );
      return;
    }

    if (result.backToBackTeams > 0) {
      setMsg('Noen lag ble satt opp med kamper for tett — prøv mer halltid.');
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
  const slotMin = slotDurationMinutes(params);

  return (
    <>
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
            <label>Antall baner samtidig</label>
            <select
              value={params.courtCount}
              onChange={(e) => setCourtCount(Number(e.target.value) as CourtCount)}
            >
              <option value={1}>1 bane om gangen</option>
              <option value={2}>2 baner om gangen</option>
              <option value={3}>3 baner om gangen</option>
            </select>
            <p className="label-hint" style={{ marginTop: '0.35rem' }}>
              Maks antall kamper som kan spilles parallelt i samme tidsluft.
            </p>
          </div>
        </div>

        <div className="card court-matrix-card">
          <h2>Spilleflater – tilgjengelighet</h2>
          <CourtAvailabilityMatrix
            params={params}
            slotMinutes={slotMin}
            onChange={handleDaysChange}
            onDayDateChange={handleDayDateChange}
          />
        </div>

        <div className="form-row cols-2" style={{ marginTop: '1rem' }}>
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
            <label>Sluttspill</label>
            <select
              value={params.seriesPlay ? 'ja' : 'nei'}
              onChange={(e) => setParams({ seriesPlay: e.target.value === 'ja' })}
            >
              <option value="nei">Nei — flest unike motstandere, ingen rematch</option>
              <option value="ja">Ja — grupper, tabell og sluttspill</option>
            </select>
          </div>
        </div>

        <div className="schedule-actions">
          <button type="button" className="btn btn-secondary" onClick={runCalculate}>
            Beregn
          </button>
          <button type="button" className="btn btn-primary" onClick={generate}>
            Generer kamprogram
          </button>
          {cup.matches.length > 0 && (
            <button type="button" className="btn btn-outline" onClick={clearMatches}>
              Slett program
            </button>
          )}
        </div>

        <div className="schedule-feedback">
          {msg && (
            <div
              className={`alert ${
                msg.startsWith('Generert ') ? 'alert-success' : 'alert-error'
              }`}
            >
              {msg}
            </div>
          )}

          {estimate && (
            <div
              className={`alert ${estimate.fits ? 'alert-success' : 'alert-error'}`}
            >
              <strong>Beregning</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                {estimate.summaryLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {cup.teams.length >= 2 && !estimate && !validation.ok && (
            <div className="alert alert-error">
              <strong>Før generering:</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                {validation.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {params.seriesPlay && cup.teams.length >= 2 && (
            <div className="alert alert-info-soft">
              <strong>Gruppespill ({cup.teams.length} lag):</strong>{' '}
              {describeGroupPlan(cup.teams.length)} · {computeGroupLayout(cup.teams.length).label}
              <br />
              <strong>Sluttspill:</strong> kun på {PLAYOFF_COURT} (aktiver i matrisen over). Etter
              gruppespill fylles lag inn automatisk ut fra tabell.
            </div>
          )}

          {!params.seriesPlay && (
            <p className="schedule-hint">
              Uten sluttspill: hvert lag møter <strong>forskjellige</strong> motstandere (ingen
              rematch).
            </p>
          )}

          <p className="schedule-hint">
            {getMatchDurationLabel(params.matchFormat)} + {params.periodBreak} min pause mellom
            perioder · ca. {slotMin} min per kamp inkl. kamppause · ingen lag spiller to kamper på
            rad.
          </p>
        </div>
      </div>

      {cup.matches.length > 0 && (
        <div className="card">
          <h2>
            Kamprogram
            <span className="match-count-badge">{cup.matches.length}</span>
          </h2>
          <MatchList
            matches={[...cup.matches]
              .filter((m) => m.startTime)
              .sort(
                (a, b) =>
                  new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
              )}
            teamName={teamName}
            showDayHeaders
          />
        </div>
      )}
    </>
  );
}
