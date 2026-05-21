import type { Group, Match, Team } from '../types';
import { getResolvedPlayoffTeamIds, isPlayoffMatch } from './groups';

export interface MatchDisplayParts {
  dateKey: string;
  dateLabel: string;
  time: string;
  court: string | null;
}

export function getMatchDisplayParts(iso: string, court?: string): MatchDisplayParts {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return {
      dateKey: 'ukjent',
      dateLabel: 'Ukjent dato',
      time: '–',
      court: court ?? null,
    };
  }
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return {
    dateKey: `${y}-${mo}-${day}`,
    dateLabel: d.toLocaleDateString('nb-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
    time: d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }),
    court: court ?? null,
  };
}

/** Visningsnavn for sluttspill før gruppespill er ferdig. */
export function playoffLabelBeforeGroupEnd(label: string): string {
  if (label.startsWith('Finale')) return 'Finale';
  if (label.startsWith('Semifinale')) return 'Semifinale';
  if (label.startsWith('Play-in')) return 'Play-in';
  if (label.startsWith('Plassering')) {
    const tier = label.split(':')[0]?.trim();
    return tier || 'Plassering';
  }
  if (label.startsWith('Kvartfinale')) return 'Kvartfinale';
  if (/Seed\s+\d+/i.test(label)) return 'Sluttspill';
  if (label.includes('gruppe')) return 'Sluttspill';
  return 'Sluttspill';
}

export function getMatchLabelForDisplay(
  match: Match,
  groupStageComplete: boolean
): string | undefined {
  if (isPlayoffMatch(match)) {
    if (match.label) {
      return groupStageComplete
        ? match.label
        : playoffLabelBeforeGroupEnd(match.label);
    }
    return 'Sluttspill';
  }
  return match.label;
}

export const PLAYOFF_TBD = 'Avklares etter gruppespill';

export function getMatchTeamNamesForDisplay(
  match: Match,
  teamName: (id: string) => string,
  groups: Group[],
  matches: Match[],
  teams: Team[]
): { homeName: string; awayName: string } {
  if (!isPlayoffMatch(match)) {
    return {
      homeName: teamName(match.homeTeamId),
      awayName: teamName(match.awayTeamId),
    };
  }

  const resolved = getResolvedPlayoffTeamIds(match, groups, matches, teams);
  if (!resolved) {
    return { homeName: PLAYOFF_TBD, awayName: '' };
  }

  return {
    homeName: teamName(resolved.home),
    awayName: teamName(resolved.away),
  };
}

export function groupMatchesByDay<T extends { startTime: string }>(
  matches: T[]
): { dateKey: string; dateLabel: string; items: T[] }[] {
  const groups = new Map<string, { dateLabel: string; items: T[] }>();

  for (const m of matches) {
    const { dateKey, dateLabel } = getMatchDisplayParts(m.startTime);
    if (!groups.has(dateKey)) {
      groups.set(dateKey, { dateLabel, items: [] });
    }
    groups.get(dateKey)!.items.push(m);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, { dateLabel, items }]) => ({
      dateKey,
      dateLabel,
      items: items.sort(
        (x, y) => new Date(x.startTime).getTime() - new Date(y.startTime).getTime()
      ),
    }));
}
