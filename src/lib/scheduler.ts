import type { Match, ScheduleParams, Team } from '../types';
import { normalizeScheduleParams } from './scheduleParams';

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

interface TimeSlice {
  start: Date;
}

function buildTimeSlices(params: ScheduleParams): TimeSlice[] {
  const p = normalizeScheduleParams(params);
  const slotMin = slotDurationMinutes(p);
  const matchDur = matchDurationMinutes(p);
  const slices: TimeSlice[] = [];

  for (const day of p.days) {
    let current = parseTime(day.date, day.timeFrom);
    const dayEnd = parseTime(day.date, day.timeTo);

    if (dayEnd.getTime() <= current.getTime()) continue;

    while (current.getTime() + matchDur * 60_000 <= dayEnd.getTime()) {
      slices.push({ start: new Date(current) });
      current = new Date(current.getTime() + slotMin * 60_000);
    }
  }

  return slices;
}

export function countScheduleSlots(params: ScheduleParams): number {
  const p = normalizeScheduleParams(params);
  return buildTimeSlices(p).length * p.courtCount;
}

type Pairing = { home: string; away: string };

function pairingKey(a: string, b: string): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Maks antall ganger samme to lag kan møtes. */
function maxMeetingsSameOpponent(teamCount: number, gamesPerTeam: number): number {
  if (teamCount <= 2) return gamesPerTeam;
  return Math.max(1, Math.ceil(gamesPerTeam / (teamCount - 1)));
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

/** Standard round-robin-runder (serie) — roterer lag for varierte motstandere. */
function addSeriesRoundPairings(
  teamIds: string[],
  gamesPerTeam: number,
  gamesPlayed: Map<string, number>,
  opponentCount: Map<string, number>,
  pairings: Pairing[]
): void {
  let roster = [...teamIds];

  for (let round = 0; round < gamesPerTeam; round++) {
    const m = roster.length;
    for (let i = 0; i < Math.floor(m / 2); i++) {
      const a = roster[i];
      const b = roster[m - 1 - i];
      if (a === b) continue;
      if ((gamesPlayed.get(a) ?? 0) >= gamesPerTeam || (gamesPlayed.get(b) ?? 0) >= gamesPerTeam) {
        continue;
      }

      const home = round % 2 === 0 ? a : b;
      const away = home === a ? b : a;
      addPairing(home, away, gamesPlayed, opponentCount, pairings);
    }

    if (m > 2) {
      const fixed = roster[0];
      const tail = roster.slice(1);
      tail.unshift(tail.pop()!);
      roster = [fixed, ...tail];
    }
  }
}

function findGreedyPairing(
  teams: Team[],
  gamesPerTeam: number,
  gamesPlayed: Map<string, number>,
  opponentCount: Map<string, number>,
  maxSame: number,
  strictRematch: boolean
): { home: string; away: string } | null {
  let best: { home: string; away: string; score: number; need: number } | null = null;

  for (const t1 of teams) {
    const g1 = gamesPlayed.get(t1.id) ?? 0;
    if (g1 >= gamesPerTeam) continue;

    for (const t2 of teams) {
      if (t1.id === t2.id) continue;
      const g2 = gamesPlayed.get(t2.id) ?? 0;
      if (g2 >= gamesPerTeam) continue;

      const score = opponentCount.get(pairingKey(t1.id, t2.id)) ?? 0;
      if (strictRematch && score >= maxSame) continue;

      const need = g1 + g2;
      if (
        !best ||
        score < best.score ||
        (score === best.score && need > best.need)
      ) {
        const home = g1 <= g2 ? t1.id : t2.id;
        const away = home === t1.id ? t2.id : t1.id;
        best = { home, away, score, need };
      }
    }
  }

  return best ? { home: best.home, away: best.away } : null;
}

/** Fyll opp til alle har gamesPerTeam kamper med begrenset rematch. */
function fillPairingsGreedy(
  teams: Team[],
  gamesPerTeam: number,
  gamesPlayed: Map<string, number>,
  opponentCount: Map<string, number>,
  pairings: Pairing[]
): void {
  const n = teams.length;
  const totalNeeded = (n * gamesPerTeam) / 2;
  const maxSame = maxMeetingsSameOpponent(n, gamesPerTeam);
  const maxIter = totalNeeded * n * 4;
  let iter = 0;

  while (pairings.length < totalNeeded && iter < maxIter) {
    let pick = findGreedyPairing(
      teams,
      gamesPerTeam,
      gamesPlayed,
      opponentCount,
      maxSame,
      true
    );
    if (!pick) {
      pick = findGreedyPairing(
        teams,
        gamesPerTeam,
        gamesPlayed,
        opponentCount,
        maxSame,
        false
      );
    }
    if (!pick) break;

    addPairing(pick.home, pick.away, gamesPlayed, opponentCount, pairings);
    iter++;
  }
}

/** Generate pairings so each team plays exactly `gamesPerTeam` matches. */
export function generatePairings(
  teams: Team[],
  gamesPerTeam: number,
  seriesPlay: boolean
): Pairing[] {
  const n = teams.length;
  if (n < 2) return [];

  if (n === 2) {
    const [a, b] = teams;
    return Array.from({ length: gamesPerTeam }, (_, i) =>
      i % 2 === 0
        ? { home: a.id, away: b.id }
        : { home: b.id, away: a.id }
    );
  }

  const pairings: Pairing[] = [];
  const gamesPlayed = new Map<string, number>();
  const opponentCount = new Map<string, number>();
  teams.forEach((t) => gamesPlayed.set(t.id, 0));

  if (seriesPlay) {
    addSeriesRoundPairings(
      teams.map((t) => t.id),
      gamesPerTeam,
      gamesPlayed,
      opponentCount,
      pairings
    );
  }

  fillPairingsGreedy(teams, gamesPerTeam, gamesPlayed, opponentCount, pairings);

  return pairings;
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

export function validateSchedule(teams: Team[], rawParams: ScheduleParams): ScheduleValidation {
  const params = normalizeScheduleParams(rawParams);
  const errors: string[] = [];
  const gamesPerTeam = params.gamesPerTeam;

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

  if (params.courts.length !== params.courtCount) {
    errors.push(`Velg nøyaktig ${params.courtCount} bane(r).`);
  }

  if (!isGamesPerTeamPossible(teams.length, gamesPerTeam)) {
    errors.push(
      `Med ${teams.length} lag og ${gamesPerTeam} kamper per lag blir totalt antall kamper et oddetall — det går ikke. ` +
        `Velg et partall antall kamper per lag, eller endre antall lag.`
    );
  }

  const slices = buildTimeSlices(params);
  const timeSlicesCount = slices.length;
  const slotsCount = timeSlicesCount * params.courtCount;

  if (timeSlicesCount === 0) {
    errors.push(
      'Ingen halltid funnet. Sjekk at «tid til» er etter «tid fra» på hver cup-dag.'
    );
  }

  const pairings = generatePairings(teams, gamesPerTeam, params.seriesPlay);
  const gamesCounts = countGamesPerTeam(pairings, teams);

  const shortTeams = teams.filter((t) => (gamesCounts.get(t.id) ?? 0) < gamesPerTeam);
  if (shortTeams.length > 0) {
    const g = gamesCounts.get(shortTeams[0].id) ?? 0;
    errors.push(
      `Kunne ikke fullføre kampfordeling (${g} av ${gamesPerTeam} kamper for noen lag).`
    );
  }

  if (pairings.length === 0) {
    errors.push('Kunne ikke lage kamper med valgte innstillinger.');
  }

  const slicesNeeded = minTimeSlicesNeeded(teams.length, pairings.length);
  if (timeSlicesCount > 0 && timeSlicesCount < slicesNeeded) {
    errors.push(
      `Ikke nok tid: minst ca. ${slicesNeeded} tidslufter trengs (${pairings.length} kamper, ` +
        `${teams.length} lag, pause mellom hver kamp for samme lag). ` +
        `Dere har ${timeSlicesCount} tidslufter (${slotsCount} kampplasser). ` +
        `Legg til flere dager, lengre halltid eller flere baner.`
    );
  }

  const preview = generateScheduleWithMeta(teams, params);
  if (preview.unscheduled > 0 && errors.length === 0) {
    errors.push(
      `${preview.unscheduled} kamper får ikke plass med pause-regelen (ingen spiller to kamper på rad). ` +
        `Legg til mer tid eller flere baner.`
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

export function generateScheduleWithMeta(
  teams: Team[],
  rawParams: ScheduleParams
): ScheduleResult {
  const params = normalizeScheduleParams(rawParams);
  const pairings = generatePairings(teams, params.gamesPerTeam, params.seriesPlay);
  const slices = buildTimeSlices(params);
  const courts = params.courts.slice(0, params.courtCount);

  if (pairings.length === 0 || slices.length === 0) {
    return {
      matches: [],
      unscheduled: pairings.length,
      pairingsCount: pairings.length,
      backToBackTeams: 0,
    };
  }

  const remaining = [...pairings];
  const matches: Match[] = [];
  const lastSlice = new Map<string, number>();
  const gamesScheduled = new Map<string, number>();
  teams.forEach((t) => gamesScheduled.set(t.id, 0));

  // To lag: én kamp per annen tidsluft (ingen back-to-back)
  if (teams.length === 2) {
    let sliceIndex = 0;
    for (const p of remaining) {
      while (sliceIndex < slices.length && matches.length < pairings.length) {
        matches.push({
          id: crypto.randomUUID(),
          homeTeamId: p.home,
          awayTeamId: p.away,
          startTime: formatTime(slices[sliceIndex].start),
          court: courts[matches.length % courts.length],
          round: matches.length + 1,
        });
        sliceIndex += 2;
        break;
      }
    }
    return {
      matches,
      unscheduled: Math.max(0, pairings.length - matches.length),
      pairingsCount: pairings.length,
      backToBackTeams: detectBackToBack(matches, params).length,
    };
  }

  for (let sliceIndex = 0; sliceIndex < slices.length && remaining.length > 0; sliceIndex++) {
    const slice = slices[sliceIndex];
    const busyTeams = new Set<string>();

    for (const court of courts) {
      if (remaining.length === 0) break;

      const idx = findPairingForSlice(
        remaining,
        sliceIndex,
        busyTeams,
        lastSlice,
        gamesScheduled
      );
      if (idx === -1) continue;

      const p = remaining.splice(idx, 1)[0];
      busyTeams.add(p.home);
      busyTeams.add(p.away);

      lastSlice.set(p.home, sliceIndex);
      lastSlice.set(p.away, sliceIndex);
      gamesScheduled.set(p.home, (gamesScheduled.get(p.home) ?? 0) + 1);
      gamesScheduled.set(p.away, (gamesScheduled.get(p.away) ?? 0) + 1);

      matches.push({
        id: crypto.randomUUID(),
        homeTeamId: p.home,
        awayTeamId: p.away,
        startTime: formatTime(slice.start),
        court,
        round: Math.floor(matches.length / Math.max(1, Math.floor(teams.length / 2))) + 1,
      });
    }
  }

  const backToBack = detectBackToBack(matches, params);

  return {
    matches,
    unscheduled: remaining.length,
    pairingsCount: pairings.length,
    backToBackTeams: backToBack.length,
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
