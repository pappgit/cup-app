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
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(h, m, 0, 0);
  return d;
}

function formatTime(d: Date): string {
  return d.toISOString();
}

interface TimeSlice {
  start: Date;
}

/** Tidslufter per dag der opptil courtCount kamper kan spilles parallelt. */
function buildTimeSlices(params: ScheduleParams): TimeSlice[] {
  const p = normalizeScheduleParams(params);
  const slotMin = slotDurationMinutes(p);
  const matchDur = matchDurationMinutes(p);
  const slices: TimeSlice[] = [];

  for (const day of p.days) {
    let current = parseTime(day.date, day.timeFrom);
    const dayEnd = parseTime(day.date, day.timeTo);

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

/** Generate pairings so each team plays exactly `gamesPerTeam` matches. */
function generatePairings(
  teams: Team[],
  gamesPerTeam: number,
  seriesPlay: boolean
): { home: string; away: string }[] {
  const n = teams.length;
  if (n < 2) return [];

  const pairings: { home: string; away: string }[] = [];
  const gamesPlayed = new Map<string, number>();
  teams.forEach((t) => gamesPlayed.set(t.id, 0));

  if (seriesPlay && n >= 2) {
    const ids = teams.map((t) => t.id);
    let round = 0;
    const maxRounds = gamesPerTeam;

    while (round < maxRounds) {
      const rotated = [...ids];
      if (round % 2 === 1) rotated.reverse();

      for (let i = 0; i < Math.floor(n / 2); i++) {
        const home = rotated[i];
        const away = rotated[n - 1 - i];
        if (home === away) continue;
        if ((gamesPlayed.get(home) ?? 0) >= gamesPerTeam) continue;
        if ((gamesPlayed.get(away) ?? 0) >= gamesPerTeam) continue;

        pairings.push({
          home: round % 2 === 0 ? home : away,
          away: round % 2 === 0 ? away : home,
        });
        gamesPlayed.set(home, (gamesPlayed.get(home) ?? 0) + 1);
        gamesPlayed.set(away, (gamesPlayed.get(away) ?? 0) + 1);
      }

      if (n > 2) {
        const last = ids.pop()!;
        ids.splice(1, 0, last);
      }
      round++;
    }
  }

  const opponentCount = new Map<string, number>();
  const key = (a: string, b: string) => (a < b ? `${a}-${b}` : `${b}-${a}`);

  for (const pr of pairings) {
    const k = key(pr.home, pr.away);
    opponentCount.set(k, (opponentCount.get(k) ?? 0) + 1);
  }

  let attempts = 0;
  const maxAttempts = n * gamesPerTeam * 10;

  while (attempts < maxAttempts) {
    const needMore = teams.filter((t) => (gamesPlayed.get(t.id) ?? 0) < gamesPerTeam);
    if (needMore.length === 0) break;

    const t1 = needMore[attempts % needMore.length];
    const others = teams
      .filter((t) => t.id !== t1.id && (gamesPlayed.get(t.id) ?? 0) < gamesPerTeam)
      .sort((a, b) => {
        const ka = key(t1.id, a.id);
        const kb = key(t1.id, b.id);
        return (opponentCount.get(ka) ?? 0) - (opponentCount.get(kb) ?? 0);
      });

    if (others.length === 0) break;

    const t2 = others[0];
    const home = (gamesPlayed.get(t1.id) ?? 0) <= (gamesPlayed.get(t2.id) ?? 0) ? t1.id : t2.id;
    const away = home === t1.id ? t2.id : t1.id;

    pairings.push({ home, away });
    gamesPlayed.set(home, (gamesPlayed.get(home) ?? 0) + 1);
    gamesPlayed.set(away, (gamesPlayed.get(away) ?? 0) + 1);
    const k = key(home, away);
    opponentCount.set(k, (opponentCount.get(k) ?? 0) + 1);
    attempts++;
  }

  return pairings;
}

export function generateSchedule(teams: Team[], rawParams: ScheduleParams): Match[] {
  const params = normalizeScheduleParams(rawParams);
  const pairings = generatePairings(teams, params.gamesPerTeam, params.seriesPlay);
  const slices = buildTimeSlices(params);
  const courts = params.courts.slice(0, params.courtCount);

  if (pairings.length === 0) return [];

  const remaining = [...pairings];
  const matches: Match[] = [];
  let sliceIndex = 0;
  let unscheduledStreak = 0;
  const maxStreak = slices.length * 2 + 10;

  while (remaining.length > 0 && sliceIndex < slices.length && unscheduledStreak < maxStreak) {
    const slice = slices[sliceIndex];
    const busyTeams = new Set<string>();
    let scheduledInSlice = 0;

    for (const court of courts) {
      const idx = remaining.findIndex(
        (p) => !busyTeams.has(p.home) && !busyTeams.has(p.away)
      );
      if (idx === -1) break;

      const p = remaining.splice(idx, 1)[0];
      busyTeams.add(p.home);
      busyTeams.add(p.away);
      scheduledInSlice++;

      matches.push({
        id: `match-${matches.length}-${Date.now()}`,
        homeTeamId: p.home,
        awayTeamId: p.away,
        startTime: formatTime(slice.start),
        court,
        round: Math.floor(matches.length / Math.max(1, Math.floor(teams.length / 2))) + 1,
      });
    }

    if (scheduledInSlice > 0) {
      unscheduledStreak = 0;
    } else {
      unscheduledStreak++;
    }
    sliceIndex++;
  }

  return matches;
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
