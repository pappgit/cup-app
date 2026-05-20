import type { CupDaySchedule, CourtCount, CupDays, ScheduleParams } from '../types';
import { AVAILABLE_COURTS, DEFAULT_SCHEDULE_PARAMS } from '../types';

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
  if (!params) return { ...DEFAULT_SCHEDULE_PARAMS };

  const legacy = params as ScheduleParams & {
    startDate?: string;
    timeFrom?: string;
    timeTo?: string;
  };

  let days = params.days;
  if (!days?.length) {
    const start = legacy.startDate ?? DEFAULT_SCHEDULE_PARAMS.days[0].date;
    const cupDays = params.cupDays ?? 1;
    days = Array.from({ length: cupDays }, (_, i) => ({
      date: addDays(start, i),
      timeFrom: legacy.timeFrom ?? '09:00',
      timeTo: legacy.timeTo ?? '17:00',
    }));
  }

  const cupDays = (params.cupDays ?? days.length) as CupDays;
  const trimmedDays = days.slice(0, cupDays);
  while (trimmedDays.length < cupDays) {
    const last = trimmedDays[trimmedDays.length - 1] ?? days[0];
    trimmedDays.push({
      date: addDays(last.date, 1),
      timeFrom: last.timeFrom,
      timeTo: last.timeTo,
    });
  }

  const courtCount = params.courtCount ?? 1;
  let courts = params.courts?.length ? params.courts : defaultCourts(courtCount);
  if (courts.length !== courtCount) {
    courts = defaultCourts(courtCount);
  }

  return {
    matchFormat: params.matchFormat ?? DEFAULT_SCHEDULE_PARAMS.matchFormat,
    periodBreak: params.periodBreak ?? DEFAULT_SCHEDULE_PARAMS.periodBreak,
    matchBreak: params.matchBreak ?? DEFAULT_SCHEDULE_PARAMS.matchBreak,
    gamesPerTeam: params.gamesPerTeam ?? DEFAULT_SCHEDULE_PARAMS.gamesPerTeam,
    seriesPlay: params.seriesPlay ?? DEFAULT_SCHEDULE_PARAMS.seriesPlay,
    cupDays,
    days: trimmedDays,
    courtCount,
    courts,
  };
}
