import type { CupDaySchedule, ScheduleParams } from '../types';
import { AVAILABLE_COURTS } from '../types';
import {
  getActiveCourtNames,
  getCourtHallTime,
  isCourtEnabledOnDay,
  normalizeScheduleParams,
} from './scheduleParams';
import { countScheduleSlots, slotDurationMinutes } from './scheduler';

export function formatCupDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('nb-NO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatTimeRange(timeFrom: string, timeTo: string): string {
  return `${timeFrom}–${timeTo}`;
}

export interface CourtWindowSummary {
  court: string;
  date: string;
  dateLabel: string;
  timeFrom: string;
  timeTo: string;
  slotCount: number;
}

export function buildCourtWindowSummaries(
  params: ScheduleParams,
  slotMinutes: number
): CourtWindowSummary[] {
  const p = normalizeScheduleParams(params);
  const summaries: CourtWindowSummary[] = [];

  for (const day of p.days) {
    for (const court of AVAILABLE_COURTS) {
      if (!isCourtEnabledOnDay(day, court)) continue;
      const hall = getCourtHallTime(day, court);
      if (hall.timeTo <= hall.timeFrom) continue;

      const slotCount = countSlotsInRange(
        day.date,
        hall.timeFrom,
        hall.timeTo,
        slotMinutes,
        p.matchFormat,
        p.periodBreak,
        p.matchBreak
      );

      summaries.push({
        court,
        date: day.date,
        dateLabel: formatCupDate(day.date),
        timeFrom: hall.timeFrom,
        timeTo: hall.timeTo,
        slotCount,
      });
    }
  }

  return summaries;
}

function countSlotsInRange(
  date: string,
  timeFrom: string,
  timeTo: string,
  slotMin: number,
  matchFormat: ScheduleParams['matchFormat'],
  periodBreak: number,
  matchBreak: number
): number {
  const [periods, periodMin] = matchFormat.split('x').map(Number);
  const matchDur = periods * periodMin + (periods - 1) * periodBreak;
  const slotMs = (matchDur + matchBreak) * 60_000;

  const parse = (t: string) => {
    const [y, mo, d] = date.split('-').map(Number);
    const [h, m] = t.split(':').map(Number);
    return new Date(y, mo - 1, d, h, m).getTime();
  };

  let current = parse(timeFrom);
  const end = parse(timeTo);
  let count = 0;
  while (current + matchDur * 60_000 <= end) {
    count++;
    current += slotMs;
  }
  return count;
}

export function buildAvailabilityOverview(params: ScheduleParams) {
  const p = normalizeScheduleParams(params);
  const slotMin = slotDurationMinutes(p);
  const windows = buildCourtWindowSummaries(p, slotMin);
  const totalSlots = countScheduleSlots(p);
  const activeCourts = getActiveCourtNames(p.days);

  const byDate = new Map<string, CourtWindowSummary[]>();
  for (const w of windows) {
    const list = byDate.get(w.date) ?? [];
    list.push(w);
    byDate.set(w.date, list);
  }

  return {
    windows,
    totalSlots,
    activeCourts,
    byDate,
    slotMinutes: slotMin,
  };
}
