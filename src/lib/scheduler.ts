import type { Match, ScheduleParams, Team } from '../types';

function matchDurationMinutes(params: ScheduleParams): number {
  const [periods, periodMin] = params.matchFormat.split('x').map(Number);
  const playTime = periods * periodMin;
  const pauses = (periods - 1) * params.periodBreak;
  return playTime + pauses;
}

function slotDurationMinutes(params: ScheduleParams): number {
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

/** Generate pairings so each team plays exactly `gamesPerTeam` matches. */
function generatePairings(teams: Team[], gamesPerTeam: number, seriesPlay: boolean): Omit<Match, 'startTime'>[] {
  const n = teams.length;
  if (n < 2) return [];

  const pairings: { home: string; away: string }[] = [];
  const gamesPlayed = new Map<string, number>();
  teams.forEach((t) => gamesPlayed.set(t.id, 0));

  if (seriesPlay && n >= 2) {
    // Round-robin style: each team plays others in rotating order
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

      // Rotate teams (keep first fixed for odd count)
      if (n > 2) {
        const last = ids.pop()!;
        ids.splice(1, 0, last);
      }
      round++;
    }
  }

  // Fill remaining games with greedy pairing (avoid duplicate opponents when possible)
  const opponentCount = new Map<string, number>();
  const key = (a: string, b: string) => (a < b ? `${a}-${b}` : `${b}-${a}`);

  for (const p of pairings) {
    const k = key(p.home, p.away);
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

  return pairings.map((p, i) => ({
    id: `match-${i}-${Date.now()}`,
    homeTeamId: p.home,
    awayTeamId: p.away,
    round: Math.floor(i / Math.floor(n / 2)) + 1,
  }));
}

export function generateSchedule(teams: Team[], params: ScheduleParams): Match[] {
  const pairings = generatePairings(teams, params.gamesPerTeam, params.seriesPlay);
  const slotMin = slotDurationMinutes(params);
  const start = parseTime(params.startDate, params.timeFrom);
  let dayEnd = parseTime(params.startDate, params.timeTo);

  const matches: Match[] = [];
  let current = new Date(start);

  for (const p of pairings) {
    const matchEnd = new Date(current.getTime() + matchDurationMinutes(params) * 60_000);
    if (matchEnd > dayEnd) {
      const nextDay = new Date(current);
      nextDay.setDate(nextDay.getDate() + 1);
      const dateStr = nextDay.toISOString().slice(0, 10);
      current = parseTime(dateStr, params.timeFrom);
      dayEnd = parseTime(dateStr, params.timeTo);
    }

    matches.push({
      ...p,
      startTime: formatTime(current),
    });

    current = new Date(current.getTime() + slotMin * 60_000);
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

export function formatMatchTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('nb-NO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
