import type { CupDaySchedule, CourtCount, CupDays, GamesPerTeam, ScheduleParams } from '../types';
import { AVAILABLE_COURTS, DEFAULT_SCHEDULE_PARAMS } from '../types';

function asCourtCount(value: unknown): CourtCount {
  const n = Number(value);
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  return 1;
}

function asCupDays(value: unknown): CupDays {
  const n = Number(value);
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  return 1;
}

function asGamesPerTeam(value: unknown): GamesPerTeam {
  const n = Number(value);
  if (n >= 7) return 7;
  if (n >= 6) return 6;
  if (n >= 5) return 5;
  if (n >= 4) return 4;
  if (n >= 3) return 3;
  return 2;
}

function parseParamsInput(
  params: ScheduleParams | null | undefined
): ScheduleParams | null | undefined {
  if (!params) return null;
  if (typeof params === 'string') {
    try {
      return JSON.parse(params) as ScheduleParams;
    } catch {
      return null;
    }
  }
  return params;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function defaultCourts(count: CourtCount): string[] {
  return [...AVAILABLE_COURTS].slice(0, count);
}

export function buildDays(
  cupDays: CupDays,
  anchor?: CupDaySchedule
): CupDaySchedule[] {
  const baseDate = anchor?.date ?? DEFAULT_SCHEDULE_PARAMS.days[0].date;
  const timeFrom = anchor?.timeFrom ?? '09:00';
  const timeTo = anchor?.timeTo ?? '17:00';

  return Array.from({ length: cupDays }, (_, i) => ({
    date: addDays(baseDate, i),
    timeFrom,
    timeTo,
  }));
}

/** Støtt gamle lagrede parametere (enkelt startdato/tid). */
export function normalizeScheduleParams(
  params: ScheduleParams | null | undefined
): ScheduleParams {
  const parsed = parseParamsInput(params);
  if (!parsed) return { ...DEFAULT_SCHEDULE_PARAMS };

  const legacy = parsed as ScheduleParams & {
    startDate?: string;
    timeFrom?: string;
    timeTo?: string;
  };

  let days = parsed.days;
  if (!days?.length) {
    const start = legacy.startDate ?? DEFAULT_SCHEDULE_PARAMS.days[0].date;
    const cupDays = asCupDays(parsed.cupDays ?? 1);
    days = Array.from({ length: cupDays }, (_, i) => ({
      date: addDays(start, i),
      timeFrom: legacy.timeFrom ?? '09:00',
      timeTo: legacy.timeTo ?? '17:00',
    }));
  }

  const cupDays = asCupDays(parsed.cupDays ?? days.length);
  const trimmedDays = days.slice(0, cupDays);
  while (trimmedDays.length < cupDays) {
    const last = trimmedDays[trimmedDays.length - 1] ?? days[0];
    trimmedDays.push({
      date: addDays(last.date, 1),
      timeFrom: last.timeFrom,
      timeTo: last.timeTo,
    });
  }

  const courtCount = asCourtCount(parsed.courtCount);
  let courts = parsed.courts?.length ? parsed.courts : defaultCourts(courtCount);
  if (courts.length !== courtCount) {
    courts = defaultCourts(courtCount);
  }

  return {
    matchFormat: parsed.matchFormat ?? DEFAULT_SCHEDULE_PARAMS.matchFormat,
    periodBreak: Number(parsed.periodBreak) === 10 ? 10 : 5,
    matchBreak: ([5, 10, 15] as const).includes(Number(parsed.matchBreak) as 5 | 10 | 15)
      ? (Number(parsed.matchBreak) as 5 | 10 | 15)
      : DEFAULT_SCHEDULE_PARAMS.matchBreak,
    gamesPerTeam: asGamesPerTeam(parsed.gamesPerTeam),
    seriesPlay: Boolean(parsed.seriesPlay),
    groups: parsed.groups,
    cupDays,
    days: trimmedDays,
    courtCount,
    courts,
  };
}
