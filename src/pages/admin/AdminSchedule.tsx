import { useMemo, useState } from 'react';
import { GroupSetupEditor } from '../../components/GroupSetupEditor';
import { StandingsTables } from '../../components/StandingsTables';
import { CourtAvailabilityMatrix } from '../../components/CourtAvailabilityMatrix';
import { MatchList } from '../../components/MatchList';
import { useCup } from '../../hooks/useCup';
import {
  PLAYOFF_COURT,
  assignTeamsToGroups,
  computeGroupLayout,
  describeGroupPlan,
  moveTeamInGroups,
  resolveGroupsForCup,
} from '../../lib/groups';
import { hasUnpublishedDraft, getDraftMatches } from '../../lib/scheduleDraft';
import {
  getMatchDurationLabel,
  calculateScheduleEstimate,
  validateSchedule,
  generateScheduleWithMeta,
  slotDurationMinutes,
} from '../../lib/scheduler';
import {
  normalizeScheduleParams,
  syncAllDaysCourtTimes,
  getActiveCourtNames,
} from '../../lib/scheduleParams';
import type { CupDaySchedule, Group, ScheduleParams } from '../../types';
import { DEFAULT_SCHEDULE_PARAMS } from '../../types';
import type { ScheduleEstimate } from '../../lib/scheduler';

export function AdminSchedule() {
  const { cup, update, saving } = useCup();
  const params = useMemo(
    () => normalizeScheduleParams(cup.scheduleParams ?? DEFAULT_SCHEDULE_PARAMS),
    [cup.scheduleParams]
  );
  const [msg, setMsg] = useState('');
  const [estimate, setEstimate] = useState<ScheduleEstimate | null>(null);

  const groups = useMemo(
    () => resolveGroupsForCup(cup.teams, params),
    [cup.teams, params]
  );

  const draftMatches = useMemo(
    () => getDraftMatches(params, cup.matches),
    [params, cup.matches]
  );

  const pendingPublish = hasUnpublishedDraft(params, cup.matches);

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

  const saveDraft = async (nextGroups: Group[], draft: typeof draftMatches) => {
    const normalized = normalizeScheduleParams({
      ...params,
      groups: nextGroups,
      draftMatches: draft,
    });
    await update({ scheduleParams: normalized });
  };

  const regenerateDraft = async (nextGroups: Group[]) => {
    const normalized = normalizeScheduleParams({ ...params, groups: nextGroups });
    const check = validateSchedule(cup.teams, normalized);
    if (!check.ok) {
      setMsg(check.errors.join(' '));
      return false;
    }

    const result = generateScheduleWithMeta(cup.teams, normalized);
    if (result.matches.length === 0) {
      setMsg('Ingen kamper ble plassert. Sjekk halltid i matrisen.');
      return false;
    }
    if (result.unscheduled > 0) {
      setMsg(
        `Ikke nok tid: ${result.unscheduled} av ${result.pairingsCount} kamper kunne ikke plasseres.`
      );
      return false;
    }

    await saveDraft(result.groups, result.matches);
    return true;
  };

  const handleDaysChange = (days: CupDaySchedule[]) => {
    setParams({ days });
  };

  const handleDayDateChange = (dayIndex: number, date: string) => {
    const days = params.days.map((d, i) => (i === dayIndex ? { ...d, date } : d));
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

  const initGroups = async () => {
    const layout = computeGroupLayout(cup.teams.length);
    const nextGroups = assignTeamsToGroups(cup.teams, layout);
    await update({
      scheduleParams: normalizeScheduleParams({ ...params, groups: nextGroups }),
    });
    setMsg('Lag fordelt i grupper. Juster under Kampoppsett og generer kamprogram.');
    setTimeout(() => setMsg(''), 5000);
  };

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

    await update({
      scheduleParams: {
        ...normalized,
        groups: result.groups.length > 0 ? result.groups : undefined,
        draftMatches: result.matches,
      },
    });

    const tightNames = result.backToBackTeamIds
      .map((id) => cup.teams.find((t) => t.id === id)?.name ?? id)
      .join(', ');

    if (result.backToBackTeams > 0) {
      setMsg(
        `Utkast med ${result.matches.length} kamper er klart. Advarsel: ${result.backToBackTeams} lag har kamper med liten pause` +
          (tightNames ? ` (${tightNames})` : '') +
          '. Bekreft kampoppsett nederst for å publisere.'
      );
    } else {
      setMsg(
        `Utkast med ${result.matches.length} kamper er klart. Bekreft kampoppsett nederst for å publisere til forsiden.`
      );
    }
    setTimeout(() => setMsg(''), 8000);
  };

  const handleMoveTeam = async (teamId: string, toGroupId: string) => {
    const nextGroups = moveTeamInGroups(groups, teamId, toGroupId);
    const ok = await regenerateDraft(nextGroups);
    if (ok) {
      setMsg('Kampoppsett oppdatert i utkast. Bekreft nederst for å publisere.');
      setTimeout(() => setMsg(''), 5000);
    }
  };

  const confirmPublish = async () => {
    const draft = params.draftMatches;
    if (!draft || draft.length === 0) {
      setMsg('Generer kamprogram først.');
      return;
    }
    const normalized = normalizeScheduleParams({
      ...params,
      draftMatches: draft,
    });
    await update({
      matches: draft,
      scheduleParams: normalized,
    });
    setMsg('Kampoppsett er publisert til forsiden og Kamper.');
    setTimeout(() => setMsg(''), 5000);
  };

  const clearMatches = async () => {
    if (confirm('Slette hele kamprogrammet (utkast og publisert)?')) {
      await update({
        matches: [],
        scheduleParams: normalizeScheduleParams({
          ...params,
          draftMatches: undefined,
          groups: undefined,
        }),
      });
    }
  };

  const teamName = (id: string) => cup.teams.find((t) => t.id === id)?.name ?? '?';
  const slotMin = slotDurationMinutes(params);

  return (
    <>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Parametere for kamprogram</h2>

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
            Generer kamprogram (utkast)
          </button>
          {(draftMatches.length > 0 || cup.matches.length > 0) && (
            <button type="button" className="btn btn-outline" onClick={clearMatches}>
              Slett program
            </button>
          )}
        </div>

        <div className="schedule-feedback">
          {msg && (
            <div
              className={`alert ${
                msg.includes('publisert') || msg.includes('klart') || msg.includes('oppdatert')
                  ? 'alert-success'
                  : 'alert-error'
              }`}
            >
              {msg}
            </div>
          )}

          {pendingPublish && (
            <div className="alert alert-info-soft">
              <strong>Utkast venter på bekreftelse.</strong> Forsiden viser fortsatt det
              publiserte programmet til du trykker «Bekreft kampoppsett» nederst på siden.
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

      {params.seriesPlay && cup.teams.length >= 2 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2>Kampoppsett</h2>
          <p className="schedule-hint" style={{ marginTop: 0 }}>
            Fordeling av lag i grupper og hvem som møter hvem i gruppespill. Flytt lag mellom
            grupper – kamprogrammet (utkast) oppdateres automatisk.
          </p>

          {groups.length === 0 && (
            <button type="button" className="btn btn-outline" onClick={initGroups}>
              Fordel lag i grupper
            </button>
          )}

          {groups.length > 0 && (
            <>
              <GroupSetupEditor
                groups={groups}
                teams={cup.teams}
                onMoveTeam={handleMoveTeam}
              />
              <div style={{ marginTop: '1.5rem' }}>
                <StandingsTables
                  groups={groups}
                  matches={draftMatches}
                  teams={cup.teams}
                  title="Tabell (utkast / publisert)"
                  compact
                />
              </div>
            </>
          )}
        </div>
      )}

      {draftMatches.length > 0 && (
        <div className="card" style={{ marginBottom: '5rem' }}>
          <h2>
            Kamprogram (utkast)
            <span className="match-count-badge">{draftMatches.length}</span>
          </h2>
          <p className="schedule-hint" style={{ marginTop: 0 }}>
            Vises kun her til du bekrefter. Inkluderer sluttspill med tid og bane.
          </p>
          <MatchList
            matches={[...draftMatches].sort(
              (a, b) =>
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            )}
            resolveMatches={draftMatches}
            teamName={teamName}
            showDayHeaders
          />
        </div>
      )}

      {cup.matches.length > 0 && !pendingPublish && draftMatches.length === 0 && (
        <div className="card" style={{ marginBottom: '5rem' }}>
          <h2>
            Kamprogram (publisert)
            <span className="match-count-badge">{cup.matches.length}</span>
          </h2>
          <MatchList
            matches={[...cup.matches].sort(
              (a, b) =>
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            )}
            teamName={teamName}
            showDayHeaders
          />
        </div>
      )}

      {(params.draftMatches?.length ?? 0) > 0 && (
        <div className="schedule-confirm-bar">
          <p className="schedule-confirm-text">
            {pendingPublish
              ? 'Utkastet er ikke synlig på forsiden ennå.'
              : 'Kamprogrammet er publisert. Generer på nytt for å lage nytt utkast.'}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={saving || !pendingPublish}
            onClick={confirmPublish}
          >
            Bekreft kampoppsett
          </button>
        </div>
      )}
    </>
  );
}
