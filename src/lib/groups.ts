import type { Group, Match, MatchPhase, Team } from '../types';
import { groupLabel, rankInGroup } from './standings';

export interface ScheduledPairing {
  home: string;
  away: string;
  groupId?: string;
  phase: MatchPhase;
  label?: string;
}

export interface TeamSlot {
  groupId: string;
  rank: number;
}

/** Antall grupper ut fra påmeldte lag. */
export function computeGroupCount(teamCount: number): number {
  if (teamCount < 4) return 1;
  if (teamCount <= 7) return 2;
  if (teamCount <= 11) return 3;
  if (teamCount % 3 === 0) return 3;
  if (teamCount % 2 === 0) return 2;
  return 3;
}

/** Fordel lag i grupper (slange-draft for jevn styrke). */
export function assignTeamsToGroups(teams: Team[], groupCount: number): Group[] {
  const ids = teams.map((t) => t.id);
  const groups: Group[] = Array.from({ length: groupCount }, (_, i) => ({
    id: groupLabel(i),
    name: `Gruppe ${groupLabel(i)}`,
    teamIds: [],
  }));

  for (let i = 0; i < ids.length; i++) {
    const round = Math.floor(i / groupCount);
    const pos = i % groupCount;
    const g = round % 2 === 0 ? pos : groupCount - 1 - pos;
    groups[g].teamIds.push(ids[i]);
  }

  return groups;
}

/** Round-robin: alle møter alle én gang i gruppen. */
export function roundRobinPairings(groupId: string, teamIds: string[]): ScheduledPairing[] {
  const n = teamIds.length;
  if (n < 2) return [];

  const pairings: ScheduledPairing[] = [];
  let roster = [...teamIds];

  if (n % 2 === 1) {
    roster.push('__bye__');
  }

  const rounds = roster.length - 1;
  const m = roster.length;

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < Math.floor(m / 2); i++) {
      const a = roster[i];
      const b = roster[m - 1 - i];
      if (a === '__bye__' || b === '__bye__' || a === b) continue;

      const home = round % 2 === 0 ? a : b;
      const away = home === a ? b : a;
      pairings.push({
        home,
        away,
        groupId,
        phase: 'group',
        label: `Gruppespill ${groupId}`,
      });
    }

    const fixed = roster[0];
    const tail = roster.slice(1);
    tail.unshift(tail.pop()!);
    roster = [fixed, ...tail];
  }

  return pairings;
}

function resolveSlot(slot: TeamSlot, groups: Group[], provisionalOrder: Map<string, string[]>): string | null {
  const group = groups.find((g) => g.id === slot.groupId);
  if (!group) return null;
  const order = provisionalOrder.get(group.id) ?? group.teamIds;
  return order[slot.rank - 1] ?? null;
}

/** Provisorisk rekkefølge = påmeldingsrekkefølge i gruppen (erstattes når resultater legges inn). */
function provisionalStandings(groups: Group[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const g of groups) {
    map.set(g.id, [...g.teamIds]);
  }
  return map;
}

/** 2 grupper: 1. vs 1., 2. vs 2. osv. */
function crossoverPairings2(groups: Group[]): ScheduledPairing[] {
  const order = provisionalStandings(groups);
  const [a, b] = groups;
  const count = Math.min(a.teamIds.length, b.teamIds.length);
  const pairings: ScheduledPairing[] = [];

  for (let r = 1; r <= count; r++) {
    const home = resolveSlot({ groupId: a.id, rank: r }, groups, order);
    const away = resolveSlot({ groupId: b.id, rank: r }, groups, order);
    if (!home || !away) continue;
    pairings.push({
      home,
      away,
      phase: 'crossover',
      label: `Krysskamp ${r}. plass (${a.id} vs ${b.id})`,
    });
  }

  return pairings;
}

/** 3 grupper: kvartfinaler (8 lag videre) eller 3 krysskamper (6 lag). */
function playoffPairings3(groups: Group[]): ScheduledPairing[] {
  const order = provisionalStandings(groups);
  const [ga, gb, gc] = groups;
  const topTwoEach = ga.teamIds.length >= 4 && gb.teamIds.length >= 4 && gc.teamIds.length >= 4;

  if (topTwoEach) {
    const slots: { home: TeamSlot; away: TeamSlot; label: string }[] = [
      { home: { groupId: 'A', rank: 1 }, away: { groupId: 'C', rank: 2 }, label: 'Kvartfinale 1' },
      { home: { groupId: 'B', rank: 1 }, away: { groupId: 'A', rank: 2 }, label: 'Kvartfinale 2' },
      { home: { groupId: 'C', rank: 1 }, away: { groupId: 'B', rank: 2 }, label: 'Kvartfinale 3' },
      { home: { groupId: 'A', rank: 2 }, away: { groupId: 'B', rank: 2 }, label: 'Kvartfinale 4' },
    ];

    return slots
      .map((s) => {
        const home = resolveSlot(s.home, groups, order);
        const away = resolveSlot(s.away, groups, order);
        if (!home || !away || home === away) return null;
        return {
          home,
          away,
          phase: 'quarterfinal' as MatchPhase,
          label: s.label,
        };
      })
      .filter((p): p is ScheduledPairing => p !== null);
  }

  const rotations: { home: string; away: string; label: string }[] = [
    { home: 'A', away: 'B', label: 'Krysskamp 1A–2B' },
    { home: 'B', away: 'C', label: 'Krysskamp 1B–2C' },
    { home: 'C', away: 'A', label: 'Krysskamp 1C–2A' },
  ];

  return rotations
    .map((rot) => {
      const homeG = groups.find((g) => g.id === rot.home)!;
      const awayG = groups.find((g) => g.id === rot.away)!;
      const home = resolveSlot({ groupId: homeG.id, rank: 1 }, groups, order);
      const away = resolveSlot({ groupId: awayG.id, rank: 2 }, groups, order);
      if (!home || !away) return null;
      return {
        home,
        away,
        phase: 'crossover' as MatchPhase,
        label: rot.label,
      };
    })
    .filter((p): p is ScheduledPairing => p !== null);
}

export function generateSeriesPairings(teams: Team[]): {
  groups: Group[];
  pairings: ScheduledPairing[];
} {
  if (teams.length < 2) {
    return { groups: [], pairings: [] };
  }

  const groupCount = computeGroupCount(teams.length);
  const groups = assignTeamsToGroups(teams, groupCount);
  const pairings: ScheduledPairing[] = [];

  for (const group of groups) {
    pairings.push(...roundRobinPairings(group.id, group.teamIds));
  }

  if (groupCount === 2 && groups.length === 2) {
    pairings.push(...crossoverPairings2(groups));
  } else if (groupCount === 3 && groups.length === 3) {
    pairings.push(...playoffPairings3(groups));
  }

  return { groups, pairings };
}

/** Oppdater sluttspillkamper ut fra faktisk tabell (etter registrerte resultater). */
export function refreshPlayoffTeams(
  groups: Group[],
  matches: Match[],
  teams: Team[]
): Match[] {
  return matches.map((m) => {
    if (m.phase !== 'crossover' && m.phase !== 'quarterfinal') return m;
    if (!m.label) return m;

    const crossover2 = m.label.match(/Krysskamp (\d+)\. plass/);
    if (crossover2 && groups.length === 2) {
      const r = Number(crossover2[1]);
      const home = rankInGroup(groups[0], matches, teams, r);
      const away = rankInGroup(groups[1], matches, teams, r);
      if (!home || !away) return m;
      return { ...m, homeTeamId: home, awayTeamId: away };
    }

    const qfMap: Record<string, { home: [string, number]; away: [string, number] }> = {
      'Kvartfinale 1': { home: ['A', 1], away: ['C', 2] },
      'Kvartfinale 2': { home: ['B', 1], away: ['A', 2] },
      'Kvartfinale 3': { home: ['C', 1], away: ['B', 2] },
      'Kvartfinale 4': { home: ['A', 2], away: ['B', 2] },
    };

    const spec = qfMap[m.label];
    if (spec) {
      const homeG = groups.find((g) => g.id === spec.home[0]);
      const awayG = groups.find((g) => g.id === spec.away[0]);
      if (!homeG || !awayG) return m;
      const home = rankInGroup(homeG, matches, teams, spec.home[1]);
      const away = rankInGroup(awayG, matches, teams, spec.away[1]);
      if (!home || !away) return m;
      return { ...m, homeTeamId: home, awayTeamId: away };
    }

    const cross3: Record<string, { home: [string, number]; away: [string, number] }> = {
      'Krysskamp 1A–2B': { home: ['A', 1], away: ['B', 2] },
      'Krysskamp 1B–2C': { home: ['B', 1], away: ['C', 2] },
      'Krysskamp 1C–2A': { home: ['C', 1], away: ['A', 2] },
    };
    const c3 = cross3[m.label];
    if (c3) {
      const homeG = groups.find((g) => g.id === c3.home[0]);
      const awayG = groups.find((g) => g.id === c3.away[0]);
      if (!homeG || !awayG) return m;
      const home = rankInGroup(homeG, matches, teams, c3.home[1]);
      const away = rankInGroup(awayG, matches, teams, c3.away[1]);
      if (!home || !away) return m;
      return { ...m, homeTeamId: home, awayTeamId: away };
    }

    return m;
  });
}
