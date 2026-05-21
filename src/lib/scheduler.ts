import type { Group, Match, MatchPhase, ScheduleParams, Team } from '../types';
import {
  PLAYOFF_COURT,
  generateSeriesPairings,
  isPlayoffPhase,
} from './groups';
import { AVAILABLE_COURTS } from '../types';
import {
  getCourtHallTime,
  isCourtEnabledOnDay,
  normalizeScheduleParams,
} from './scheduleParams';

function matchDurationMinutes(params: ScheduleParams): number {
  const [periods, periodMin] = params.matchFormat.split('x').map(Number);
  const playTime = periods * periodMin;
  const pauses = (periods - 1) * params.periodBreak;
  return playTime + pauses;
}

export function slotDurationMinutes(params: ScheduleParams): number {
  return matchDurationMinutes(params) + params.matchBreak;
}

function parseTime(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, m] = timeStr.split(':').map(Number);
  return new Date(y, mo - 1, d, h, m, 0, 0);
}

function formatTime(d: Date): string {
  return d.toISOString();
}

interface ScheduleSlot {
  start: Date;
  court: string;
  waveIndex: number;
}

function buildScheduleSlots(params: ScheduleParams): ScheduleSlot[] {
  const p = normalizeScheduleParams(params);
  const slotMin = slotDurationMinutes(p);
  const matchDur = matchDurationMinutes(p);
  const raw: { start: Date; court: string }[] = [];

  for (const day of p.days) {
    for (const court of AVAILABLE_COURTS) {
      if (!isCourtEnabledOnDay(day, court)) continue;
      const hall = getCourtHallTime(day, court);
      let current = parseTime(day.date, hall.timeFrom);
      const dayEnd = parseTime(day.date, hall.timeTo);

      if (dayEnd.getTime() <= current.getTime()) continue;

      while (current.getTime() + matchDur * 60_000 <= dayEnd.getTime()) {
        raw.push({ start: new Date(current), court });
        current = new Date(current.getTime() + slotMin * 60_000);
      }
    }
  }

  raw.sort((a, b) => a.start.getTime() - b.start.getTime() || a.court.localeCompare(b.court));

  const slots: ScheduleSlot[] = [];
  let waveIndex = 0;
  let lastStart = -1;

  for (const r of raw) {
    const t = r.start.getTime();
    if (lastStart >= 0 && t !== lastStart) waveIndex++;
    lastStart = t;
    slots.push({ start: r.start, court: r.court, waveIndex });
  }

  return slots;
}

function countTimeWaves(slots: ScheduleSlot[]): number {
  if (slots.length === 0) return 0;
  return slots[slots.length - 1].waveIndex + 1;
}

export function countScheduleSlots(params: ScheduleParams): number {
  return buildScheduleSlots(normalizeScheduleParams(params)).length;
}

function playoffSlotsFrom(
  slots: ScheduleSlot[],
  notBefore?: Date
): ScheduleSlot[] {
  const cutoff = notBefore?.getTime() ?? 0;
  return slots.filter(
    (s) => s.court === PLAYOFF_COURT && s.start.getTime() >= cutoff
  );
}

function countPlayoffScheduleSlots(params: ScheduleParams): number {
  return playoffSlotsFrom(buildScheduleSlots(normalizeScheduleParams(params))).length;
}

type Pairing = {
  home: string;
  away: string;
  groupId?: string;
  phase?: MatchPhase;
  label?: string;
};

function pairingKey(a: string, b: string): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function addPairing(
  home: string,
  away: string,
  gamesPlayed: Map<string, number>,
  opponentCount: Map<string, number>,
  pairings: Pairing[]
): void {
  pairings.push({ home, away });
  gamesPlayed.set(home, (gamesPlayed.get(home) ?? 0) + 1);
  gamesPlayed.set(away, (gamesPlayed.get(away) ?? 0) + 1);
  const k = pairingKey(home, away);
  opponentCount.set(k, (opponentCount.get(k) ?? 0) + 1);
}

function countNewOpponents(
  teamId: string,
  active: string[],
  opponentCount: Map<string, number>
): number {
  return active.filter(
    (o) => o !== teamId && (opponentCount.get(pairingKey(teamId, o)) ?? 0) === 0
  ).length;
}

/** Størst mulig matching blant lag som ikke har møttes — backtracking (små laggrupper). */
function maxNewOpponentMatching(
  teamIds: string[],
  opponentCount: Map<string, number>
): { home: string; away: string }[] {
  let best: { home: string; away: string }[] = [];

  const canPair = (a: string, b: string) =>
    (opponentCount.get(pairingKey(a, b)) ?? 0) === 0;

  function search(used: Set<string>, current: { home: string; away: string }[]) {
    if (current.length > best.length) {
      best = [...current];
    }

    const free = teamIds.filter((id) => !used.has(id));
    const maxPossible = current.length + Math.floor(free.length / 2);
    if (maxPossible <= best.length) return;

    if (free.length < 2) return;

    const a = free[0];
    used.add(a);
    for (let i = 1; i < free.length; i++) {
      const b = free[i];
      if (!canPair(a, b)) continue;
      used.add(b);
      current.push({ home: a, away: b });
      search(used, current);
      current.pop();
      used.delete(b);
    }
    used.delete(a);
    search(used, current);
  }

  search(new Set(), []);
  return best;
}

/**
 * Vennskapsmodus: rundevis maksimal matching uten rematch.
 * Hvert lag spiller maks én kamp per runde mot en de ikke har møtt.
 */
function fillFriendlyPairings(
  teams: Team[],
  gamesPerTeam: number,
  gamesPlayed: Map<string, number>,
  opponentCount: Map<string, number>,
  pairings: Pairing[]
): boolean {
  const totalNeeded = (teams.length * gamesPerTeam) / 2;
  const maxRounds = totalNeeded * 2;

  for (let r = 0; r < maxRounds && pairings.length < totalNeeded; r++) {
    const active = teams
      .filter((t) => (gamesPlayed.get(t.id) ?? 0) < gamesPerTeam)
      .map((t) => t.id);

    if (active.length < 2) return false;

    const sorted = [...active].sort(
      (a, b) =>
        countNewOpponents(a, active, opponentCount) -
        countNewOpponents(b, active, opponentCount)
    );

    const round = maxNewOpponentMatching(sorted, opponentCount);
    if (round.length === 0) return false;

    for (const { home, away } of round) {
      if (pairings.length >= totalNeeded) break;
      if ((gamesPlayed.get(home) ?? 0) >= gamesPerTeam) continue;
      if ((gamesPlayed.get(away) ?? 0) >= gamesPerTeam) continue;
      if ((opponentCount.get(pairingKey(home, away)) ?? 0) > 0) continue;
      addPairing(home, away, gamesPlayed, opponentCount, pairings);
    }
  }

  return pairings.length === totalNeeded;
}

/** Vennskapsmodus: hver lag får `gamesPerTeam` kamper, maks én gang mot samme motstander. */
function generateFriendlyPairings(teams: Team[], gamesPerTeam: number): Pairing[] {
  const n = teams.length;
  if (n < 2) return [];

  if (n === 2) {
    const [a, b] = teams;
    return Array.from({ length: gamesPerTeam }, (_, i) =>
      i % 2 === 0
        ? { home: a.id, away: b.id, phase: 'friendly' as MatchPhase }
        : { home: b.id, away: a.id, phase: 'friendly' as MatchPhase }
    );
  }

  const pairings: Pairing[] = [];
  const gamesPlayed = new Map<string, number>();
  const opponentCount = new Map<string, number>();
  teams.forEach((t) => gamesPlayed.set(t.id, 0));

  const ok = fillFriendlyPairings(teams, gamesPerTeam, gamesPlayed, opponentCount, pairings);

  if (!ok) return [];

  return pairings.map((p) => ({ ...p, phase: p.phase ?? 'friendly' }));
}

/** Kan alle få `gamesPerTeam` kamper mot unike motstandere? */
export function isFriendlySchedulePossible(teamCount: number, gamesPerTeam: number): boolean {
  if (teamCount < 2) return false;
  if ((teamCount * gamesPerTeam) % 2 !== 0) return false;
  if (teamCount === 2) return true;
  return gamesPerTeam <= teamCount - 1;
}

export interface PairingsResult {
  pairings: Pairing[];
  groups: Group[];
}

/** Lag kampoppsett ut fra modus (serie eller vennskaps-cup). */
export function generatePairings(
  teams: Team[],
  gamesPerTeam: number,
  seriesPlay: boolean
): Pairing[] {
  return generatePairingsWithGroups(teams, gamesPerTeam, seriesPlay).pairings;
}

export function generatePairingsWithGroups(
  teams: Team[],
  gamesPerTeam: number,
  seriesPlay: boolean
): PairingsResult {
  if (teams.length < 2) return { pairings: [], groups: [] };

  if (seriesPlay) {
    const { groups, pairings } = generateSeriesPairings(teams);
    return { pairings, groups };
  }

  return {
    pairings: generateFriendlyPairings(teams, gamesPerTeam),
    groups: [],
  };
}

export function isGamesPerTeamPossible(teamCount: number, gamesPerTeam: number): boolean {
  if (teamCount < 2) return false;
  return (teamCount * gamesPerTeam) % 2 === 0;
}

function countGamesPerTeam(
  pairings: Pairing[],
  teams: Team[]
): Map<string, number> {
  const counts = new Map<string, number>();
  teams.forEach((t) => counts.set(t.id, 0));
  for (const p of pairings) {
    counts.set(p.home, (counts.get(p.home) ?? 0) + 1);
    counts.set(p.away, (counts.get(p.away) ?? 0) + 1);
  }
  return counts;
}

/** Minimum tidslufter når lag må ha minst én pause mellom kamper. */
export function minTimeSlicesNeeded(teamCount: number, matchCount: number): number {
  if (teamCount <= 2) return matchCount * 2 - 1;
  return Math.ceil(matchCount / Math.max(1, Math.floor(teamCount / 2)));
}

function canPlayInSlice(teamId: string, sliceIndex: number, lastSlice: Map<string, number>): boolean {
  const last = lastSlice.get(teamId);
  if (last === undefined) return true;
  return sliceIndex - last >= 2;
}

function findPairingForSlice(
  remaining: Pairing[],
  sliceIndex: number,
  busyTeams: Set<string>,
  lastSlice: Map<string, number>,
  gamesScheduled: Map<string, number>
): number {
  let bestIdx = -1;
  let bestScore = Infinity;

  for (let i = 0; i < remaining.length; i++) {
    const p = remaining[i];
    if (busyTeams.has(p.home) || busyTeams.has(p.away)) continue;
    if (!canPlayInSlice(p.home, sliceIndex, lastSlice)) continue;
    if (!canPlayInSlice(p.away, sliceIndex, lastSlice)) continue;

    const score =
      (gamesScheduled.get(p.home) ?? 0) + (gamesScheduled.get(p.away) ?? 0);
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

function detectBackToBack(matches: Match[], params: ScheduleParams): string[] {
  const slotMs = slotDurationMinutes(params) * 60_000;
  const byTeam = new Map<string, number[]>();

  for (const m of matches) {
    const t = new Date(m.startTime).getTime();
    for (const id of [m.homeTeamId, m.awayTeamId]) {
      if (!byTeam.has(id)) byTeam.set(id, []);
      byTeam.get(id)!.push(t);
    }
  }

  const problems: string[] = [];
  for (const [teamId, times] of byTeam) {
    times.sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) {
      if (times[i] - times[i - 1] < slotMs * 1.8) {
        problems.push(teamId);
        break;
      }
    }
  }
  return problems;
}

export interface ScheduleValidation {
  ok: boolean;
  errors: string[];
  pairingsCount: number;
  timeSlicesCount: number;
  slotsCount: number;
  gamesPerTeam: number;
}

export interface ScheduleEstimate {
  validation: ScheduleValidation;
  matchesNeeded: number;
  slotsAvailable: number;
  timeWaves: number;
  slotMinutes: number;
  fits: boolean;
  summaryLines: string[];
}

function splitPairingsByPhase(pairings: Pairing[]): {
  group: Pairing[];
  playoff: Pairing[];
} {
  const group: Pairing[] = [];
  const playoff: Pairing[] = [];
  for (const p of pairings) {
    if (isPlayoffPhase(p.phase)) playoff.push(p);
    else group.push(p);
  }
  return { group, playoff };
}

/** Forhåndsberegning (Admin «Beregn») – uten å generere kamper. */
export function calculateScheduleEstimate(
  teams: Team[],
  rawParams: ScheduleParams
): ScheduleEstimate {
  const params = normalizeScheduleParams(rawParams);
  const validation = validateSchedule(teams, params);
  const slots = buildScheduleSlots(params);
  const timeWaves = countTimeWaves(slots);
  const matchesNeeded = validation.pairingsCount;
  const slotsAvailable = slots.length;
  const slotMinutes = slotDurationMinutes(params);

  let pairings: Pairing[] = [];
  try {
    pairings = generatePairingsWithGroups(teams, params.gamesPerTeam, params.seriesPlay).pairings;
  } catch {
    /* validateSchedule har allerede fanget feil */
  }
  const { group: groupPairings, playoff: playoffPairings } = splitPairingsByPhase(pairings);
  const playoffSlotsAvailable = countPlayoffScheduleSlots(params);

  const summaryLines: string[] = [];

  if (teams.length < 2) {
    summaryLines.push('Legg inn minst 2 lag før beregning.');
  } else {
    if (params.seriesPlay && playoffPairings.length > 0) {
      summaryLines.push(
        `${groupPairings.length} gruppespillkamper + ${playoffPairings.length} sluttspillkamper ` +
          `(${matchesNeeded} totalt, ${teams.length} lag).`
      );
      summaryLines.push(
        `Sluttspill (${playoffPairings.length} kamper) legges kun på ${PLAYOFF_COURT} – ` +
          `${playoffSlotsAvailable} plasser der etter gruppespill.`
      );
    } else {
      summaryLines.push(
        `${matchesNeeded} kamper trengs med valgt oppsett (${teams.length} lag).`
      );
    }
    summaryLines.push(
      `${slotsAvailable} kampplasser totalt (${timeWaves} tidsrunder, ca. ${slotMinutes} min per kamp inkl. pause).`
    );
    if (slotsAvailable >= matchesNeeded && validation.ok) {
      summaryLines.push('Oppsettet ser ut til å ha nok tid og plasser til alle kamper.');
    } else if (slotsAvailable >= matchesNeeded) {
      summaryLines.push('Nok plasser totalt, men sjekk advarsler under.');
    } else {
      summaryLines.push(
        `Mangler ${matchesNeeded - slotsAvailable} kampplasser – leng halltid, flere baner eller flere dager.`
      );
    }
    if (
      params.seriesPlay &&
      playoffPairings.length > 0 &&
      playoffSlotsAvailable < playoffPairings.length
    ) {
      summaryLines.push(
        `Mangler ${playoffPairings.length - playoffSlotsAvailable} plasser på ${PLAYOFF_COURT} til sluttspill – ` +
          `leng halltid på ${PLAYOFF_COURT} eller flere dager.`
      );
    }
  }

  return {
    validation,
    matchesNeeded,
    slotsAvailable,
    timeWaves,
    slotMinutes,
    fits: slotsAvailable >= matchesNeeded && validation.ok,
    summaryLines,
  };
}

export function validateSchedule(teams: Team[], rawParams: ScheduleParams): ScheduleValidation {
  const params = normalizeScheduleParams(rawParams);
  const errors: string[] = [];
  const gamesPerTeam = params.gamesPerTeam;
  const seriesPlay = params.seriesPlay;

  if (teams.length < 2) {
    return {
      ok: false,
      errors: ['Legg inn minst 2 lag under Admin → Lag.'],
      pairingsCount: 0,
      timeSlicesCount: 0,
      slotsCount: 0,
      gamesPerTeam,
    };
  }

  const activeCourts = params.courts.filter((c) =>
    params.days.some((d) => isCourtEnabledOnDay(d, c))
  );

  if (activeCourts.length === 0) {
    errors.push('Aktiver minst én bane med halltid i oversikten over spilleflater.');
  } else if (activeCourts.length < params.courtCount) {
    errors.push(
      `Du har ${activeCourts.length} aktive bane(r), men ${params.courtCount} baner skal kunne brukes samtidig. Aktiver flere baner eller senk antall baner.`
    );
  }

  if (!seriesPlay && !isGamesPerTeamPossible(teams.length, gamesPerTeam)) {
    errors.push(
      `Med ${teams.length} lag og ${gamesPerTeam} kamper per lag blir totalt antall kamper et oddetall — det går ikke. ` +
        `Velg et partall antall kamper per lag, eller endre antall lag.`
    );
  }

  if (!seriesPlay && !isFriendlySchedulePossible(teams.length, gamesPerTeam)) {
    errors.push(
      `Med ${teams.length} lag kan hvert lag maks møte ${teams.length - 1} ulike motstandere. ` +
        `Velg ${teams.length - 1} eller færre kamper per lag.`
    );
  }

  const slots = buildScheduleSlots(params);
  const slotsCount = slots.length;
  const timeSlicesCount = countTimeWaves(slots);

  if (slotsCount === 0) {
    errors.push(
      'Ingen halltid funnet. Sjekk tid fra–til for hver valgt bane på cup-dagene.'
    );
  }

  let pairings: Pairing[] = [];
  try {
    pairings = generatePairingsWithGroups(teams, gamesPerTeam, seriesPlay).pairings;
  } catch {
    errors.push('Kunne ikke lage kampoppsett. Sjekk antall lag og innstillinger.');
  }

  if (!seriesPlay) {
    const gamesCounts = countGamesPerTeam(pairings, teams);
    const shortTeams = teams.filter((t) => (gamesCounts.get(t.id) ?? 0) < gamesPerTeam);
    if (shortTeams.length > 0) {
      const g = gamesCounts.get(shortTeams[0].id) ?? 0;
      errors.push(
        `Kunne ikke gi alle lag ${gamesPerTeam} kamper mot unike motstandere (noen fikk ${g}). ` +
          `Prøv færre kamper per lag eller flere lag.`
      );
    }

    const seen = new Set<string>();
    for (const p of pairings) {
      const key = pairingKey(p.home, p.away);
      if (seen.has(key)) {
        errors.push(
          'Kunne ikke lage kampoppsett uten rematch. Prøv færre kamper per lag eller flere lag.'
        );
        break;
      }
      seen.add(key);
    }
  }

  if (pairings.length === 0) {
    errors.push('Kunne ikke lage kamper med valgte innstillinger.');
  }

  const { group: groupPairings, playoff: playoffPairings } = splitPairingsByPhase(pairings);

  if (seriesPlay && playoffPairings.length > 0) {
    const hoyenActive = params.days.some((d) => isCourtEnabledOnDay(d, PLAYOFF_COURT));
    if (!hoyenActive) {
      errors.push(
        `Sluttspill krever ${PLAYOFF_COURT} – aktiver den i spilleflate-matrisen med halltid.`
      );
    }
    const playoffSlots = playoffSlotsFrom(slots);
    if (playoffSlots.length < playoffPairings.length) {
      errors.push(
        `Ikke nok plasser på ${PLAYOFF_COURT} til sluttspill: ${playoffPairings.length} kamper, ` +
          `${playoffSlots.length} plasser. Leng halltid på ${PLAYOFF_COURT} eller legg til dager.`
      );
    }
  }

  if (slotsCount > 0 && slotsCount < pairings.length) {
    errors.push(
      `Ikke nok kampplasser: ${pairings.length} kamper trengs` +
        (seriesPlay && playoffPairings.length > 0
          ? ` (${groupPairings.length} gruppespill + ${playoffPairings.length} sluttspill)`
          : '') +
        `, men oppsettet gir ${slotsCount} plasser. ` +
        `Legg til flere dager, lengre halltid per bane eller flere baner.`
    );
  }

  const wavesNeeded = minTimeSlicesNeeded(teams.length, pairings.length);
  if (timeSlicesCount > 0 && timeSlicesCount < wavesNeeded) {
    errors.push(
      `Ikke nok tidslufter for pauser: minst ca. ${wavesNeeded} runder trengs (${pairings.length} kamper, ` +
        `${teams.length} lag). Dere har ${timeSlicesCount} runder med kamper.`
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    pairingsCount: pairings.length,
    timeSlicesCount,
    slotsCount,
    gamesPerTeam,
  };
}

export interface ScheduleResult {
  matches: Match[];
  unscheduled: number;
  pairingsCount: number;
  backToBackTeams: number;
}

export function generateSchedule(teams: Team[], rawParams: ScheduleParams): Match[] {
  return generateScheduleWithMeta(teams, rawParams).matches;
}

function safeMatchId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function pairingToMatch(p: Pairing, startTime: string, court: string, round: number): Match {
  const playoff = isPlayoffPhase(p.phase);
  return {
    id: safeMatchId(),
    homeTeamId: p.home,
    awayTeamId: p.away,
    startTime,
    court: playoff ? PLAYOFF_COURT : court,
    round,
    groupId: p.groupId,
    phase: p.phase,
    label: p.label,
    homeScore: null,
    awayScore: null,
  };
}

function schedulePairingsOnSlots(
  pairings: Pairing[],
  slots: ScheduleSlot[],
  teams: Team[],
  params: ScheduleParams,
  matches: Match[],
  startRound: number
): { scheduled: number; remaining: Pairing[] } {
  if (pairings.length === 0 || slots.length === 0) {
    return { scheduled: 0, remaining: [...pairings] };
  }

  if (teams.length === 2) {
    let slotIdx = 0;
    let count = 0;
    const remaining = [...pairings];
    for (const p of remaining) {
      while (slotIdx < slots.length && count < pairings.length) {
        const slot = slots[slotIdx];
        matches.push(
          pairingToMatch(p, formatTime(slot.start), slot.court, startRound + count)
        );
        slotIdx += 2;
        count++;
        break;
      }
    }
    return { scheduled: count, remaining: pairings.slice(count) };
  }

  const remaining = [...pairings];
  let wave = -1;
  const busyTeams = new Set<string>();
  const lastSlice = new Map<string, number>();
  const gamesScheduled = new Map<string, number>();
  teams.forEach((t) => gamesScheduled.set(t.id, 0));

  let scheduled = 0;
  const baseCount = matches.length;

  for (const slot of slots) {
    if (remaining.length === 0) break;

    if (slot.waveIndex !== wave) {
      wave = slot.waveIndex;
      busyTeams.clear();
    }

    const idx = findPairingForSlice(
      remaining,
      slot.waveIndex,
      busyTeams,
      lastSlice,
      gamesScheduled
    );
    if (idx === -1) continue;

    const p = remaining.splice(idx, 1)[0];
    busyTeams.add(p.home);
    busyTeams.add(p.away);

    lastSlice.set(p.home, slot.waveIndex);
    lastSlice.set(p.away, slot.waveIndex);
    gamesScheduled.set(p.home, (gamesScheduled.get(p.home) ?? 0) + 1);
    gamesScheduled.set(p.away, (gamesScheduled.get(p.away) ?? 0) + 1);

    matches.push(
      pairingToMatch(
        p,
        formatTime(slot.start),
        slot.court,
        startRound +
          Math.floor((baseCount + scheduled) / Math.max(1, Math.floor(teams.length / 2)))
      )
    );
    scheduled++;
  }

  return { scheduled, remaining };
}

export function generateScheduleWithMeta(
  teams: Team[],
  rawParams: ScheduleParams
): ScheduleResult & { groups: Group[] } {
  const params = normalizeScheduleParams(rawParams);
  const { pairings: rawPairings, groups } = generatePairingsWithGroups(
    teams,
    params.gamesPerTeam,
    params.seriesPlay
  );
  const phaseOrder: Record<string, number> = {
    group: 0,
    friendly: 0,
    crossover: 1,
    quarterfinal: 2,
  };
  const pairings = [...rawPairings].sort(
    (a, b) =>
      (phaseOrder[a.phase ?? 'friendly'] ?? 0) - (phaseOrder[b.phase ?? 'friendly'] ?? 0)
  );
  const allSlots = buildScheduleSlots(params);

  if (pairings.length === 0 || allSlots.length === 0) {
    return {
      matches: [],
      unscheduled: pairings.length,
      pairingsCount: pairings.length,
      backToBackTeams: 0,
      groups,
    };
  }

  const { group: groupPairings, playoff: playoffPairings } = splitPairingsByPhase(pairings);
  const matches: Match[] = [];

  const groupResult = schedulePairingsOnSlots(
    groupPairings,
    allSlots,
    teams,
    params,
    matches,
    1
  );

  let notBefore: Date | undefined;
  const matchDurMs = matchDurationMinutes(params) * 60_000;
  for (const m of matches) {
    if (m.phase !== 'group') continue;
    const end = new Date(m.startTime).getTime() + matchDurMs;
    if (!notBefore || end > notBefore.getTime()) {
      notBefore = new Date(end);
    }
  }

  const playoffSlotList = playoffSlotsFrom(allSlots, notBefore);
  const playoffResult = schedulePairingsOnSlots(
    playoffPairings,
    playoffSlotList,
    teams,
    params,
    matches,
    matches.length + 1
  );

  const unscheduled =
    groupResult.remaining.length + playoffResult.remaining.length;

  const backToBack = detectBackToBack(matches, params);

  return {
    matches,
    unscheduled,
    pairingsCount: pairings.length,
    backToBackTeams: backToBack.length,
    groups,
  };
}

export function getMatchDurationLabel(format: ScheduleParams['matchFormat']): string {
  const labels: Record<ScheduleParams['matchFormat'], string> = {
    '2x15': '2 × 15 min',
    '2x20': '2 × 20 min',
    '3x15': '3 × 15 min',
    '3x20': '3 × 20 min',
  };
  return labels[format];
}

export function formatMatchTime(iso: string, court?: string): string {
  const d = new Date(iso);
  const when = d.toLocaleString('nb-NO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return court ? `${when} · ${court}` : when;
}
