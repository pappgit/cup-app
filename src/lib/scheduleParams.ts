import type {
  CourtHallTime,
  CupDaySchedule,
  CourtCount,
  CupDays,
  GamesPerTeam,
  ScheduleParams,
} from '../types';
import { AVAILABLE_COURTS, DEFAULT_SCHEDULE_PARAMS } from '../types';

function asCourtCount(value: unknown): CourtCount {
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

function hasValidHallTimes(hall: CourtHallTime): boolean {
  return Boolean(
    hall.timeFrom &&
      hall.timeTo &&
      hall.timeTo > hall.timeFrom
  );
}

export function isCourtEnabledOnDay(day: CupDaySchedule, court: string): boolean {
  const hall = getCourtHallTime(day, court);
  return hall.enabled === true && hasValidHallTimes(hall);
}

export function getCourtHallTime(day: CupDaySchedule, court: string): CourtHallTime {
  const found = day.courtTimes?.find((c) => c.court === court);
  if (found) {
    return {
      ...found,
      enabled: found.enabled === true,
    };
  }
  const hasMatrix = (day.courtTimes?.length ?? 0) > 0;
  return {
    court,
    timeFrom: day.timeFrom ?? '09:00',
    timeTo: day.timeTo ?? '17:00',
    enabled: hasMatrix ? false : Boolean(day.timeFrom && day.timeTo),
  };
}

/** Én rad per kjent bane – brukes i tilgjengelighetsmatrisen. */
export function syncDayCourtTimes(day: CupDaySchedule): CupDaySchedule {
  const existing = day.courtTimes ?? [];
  const courtTimes = AVAILABLE_COURTS.map((court) => {
    const prev = existing.find((c) => c.court === court);
    if (prev) {
      return {
        ...prev,
        enabled: prev.enabled === true,
      };
    }
    return {
      court,
      timeFrom: day.timeFrom ?? '09:00',
      timeTo: day.timeTo ?? '17:00',
      enabled: false,
    };
  });
  return { ...day, courtTimes };
}

export function syncAllDaysCourtTimes(days: CupDaySchedule[]): CupDaySchedule[] {
  return days.map((d) => syncDayCourtTimes(d));
}

export function getActiveCourtNames(days: CupDaySchedule[]): string[] {
  const names = new Set<string>();
  for (const day of days) {
    for (const court of AVAILABLE_COURTS) {
      if (isCourtEnabledOnDay(day, court)) names.add(court);
    }
  }
  return [...names];
}

export function createDefaultScheduleDay(anchor?: CupDaySchedule): CupDaySchedule {
  const baseDate = anchor?.date ?? DEFAULT_SCHEDULE_PARAMS.days[0].date;
  const timeFrom = anchor?.timeFrom ?? '09:00';
  const timeTo = anchor?.timeTo ?? '17:00';

  return syncDayCourtTimes({
    date: baseDate,
    timeFrom,
    timeTo,
    courtTimes: AVAILABLE_COURTS.map((court, idx) => ({
      court,
      timeFrom,
      timeTo,
      enabled: idx < 1,
    })),
  });
}

/** @deprecated Bruk createDefaultScheduleDay / appendScheduleDay */
export function buildDays(count: number, anchor?: CupDaySchedule): CupDaySchedule[] {
  let days: CupDaySchedule[] = [];
  for (let i = 0; i < Math.max(1, count); i++) {
    days = days.length === 0 ? [createDefaultScheduleDay(anchor)] : appendScheduleDay(days);
  }
  return days;
}

export function appendScheduleDay(days: CupDaySchedule[]): CupDaySchedule[] {
  if (days.length === 0) {
    return [createDefaultScheduleDay()];
  }
  const last = days[days.length - 1];
  const next = syncDayCourtTimes({
    date: addDays(last.date, 1),
    timeFrom: last.timeFrom,
    timeTo: last.timeTo,
    courtTimes: AVAILABLE_COURTS.map((court) => {
      const src = getCourtHallTime(last, court);
      return { court, timeFrom: src.timeFrom, timeTo: src.timeTo, enabled: false };
    }),
  });
  return [...days, next];
}

export function removeScheduleDay(
  days: CupDaySchedule[],
  dayIndex: number
): CupDaySchedule[] {
  if (days.length <= 1) return days;
  return days.filter((_, i) => i !== dayIndex);
}

function normalizeDay(day: CupDaySchedule): CupDaySchedule {
  const timeFrom = day.timeFrom ?? '09:00';
  const timeTo = day.timeTo ?? '17:00';
  const synced = syncDayCourtTimes({ ...day, timeFrom, timeTo });
  const courtTimes = (synced.courtTimes ?? []).map((c) => {
    if (c.enabled !== true) return c;
    return {
      ...c,
      timeFrom: c.timeFrom || timeFrom,
      timeTo: c.timeTo || timeTo,
    };
  });
  return { ...synced, courtTimes };
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
    days = [createDefaultScheduleDay({
      date: start,
      timeFrom: legacy.timeFrom ?? '09:00',
      timeTo: legacy.timeTo ?? '17:00',
    })];
  }

  const legacyCourts = parsed.courts?.length ? parsed.courts : [];
  let normalizedDays = days.map((d) => normalizeDay(d));
  const cupDays = normalizedDays.length;

  const needsLegacyCourts = normalizedDays.every(
    (d) => !d.courtTimes?.length || d.courtTimes.every((c) => c.enabled !== true)
  );
  if (legacyCourts.length > 0 && needsLegacyCourts) {
    normalizedDays = normalizedDays.map((d) => ({
      ...d,
      courtTimes: d.courtTimes?.map((c) => ({
        ...c,
        enabled: legacyCourts.includes(c.court),
      })),
    }));
  }

  let courts = getActiveCourtNames(normalizedDays);
  if (courts.length === 0) {
    courts = defaultCourts(asCourtCount(parsed.courtCount));
  }

  const courtCount = asCourtCount(Math.min(3, Math.max(1, courts.length)));

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
    days: normalizedDays,
    courtCount,
    courts,
  };
}
