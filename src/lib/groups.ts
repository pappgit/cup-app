import type { Group, Match, MatchPhase, Team } from '../types';
import { bestThirdPlaces, groupLabel, rankInGroup } from './standings';

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

export interface GroupLayout {
  sizes: number[];
  groupCount: number;
  label: string;
}

export interface PlayoffSlot {
  home: TeamSlot;
  away: TeamSlot;
  phase: MatchPhase;
  label: string;
  /** Spesiell oppløsning for 3. plass på tvers av grupper */
  resolveThirdPlaces?: [number, number];
}

/** Eksplisitt gruppeoppsett per antall lag. */
export function computeGroupLayout(teamCount: number): GroupLayout {
  const known: Record<number, number[]> = {
    4: [4],
    5: [3, 2],
    6: [3, 3],
    7: [4, 3],
    8: [4, 4],
    9: [3, 3, 3],
    10: [5, 5],
    11: [4, 4, 3],
    12: [4, 4, 4],
  };

  if (known[teamCount]) {
    const sizes = known[teamCount];
    return {
      sizes,
      groupCount: sizes.length,
      label: formatLayoutLabel(sizes),
    };
  }

  if (teamCount < 4) {
    return { sizes: [teamCount], groupCount: 1, label: `1 gruppe (${teamCount} lag)` };
  }

  if (teamCount % 3 === 0) {
    const s = teamCount / 3;
    const sizes = [s, s, s];
    return { sizes, groupCount: 3, label: formatLayoutLabel(sizes) };
  }

  if (teamCount % 2 === 0) {
    const s = teamCount / 2;
    const sizes = [s, s];
    return { sizes, groupCount: 2, label: formatLayoutLabel(sizes) };
  }

  const base = Math.floor(teamCount / 3);
  const rem = teamCount % 3;
  const sizes = Array.from({ length: 3 }, (_, i) => base + (i < rem ? 1 : 0));
  return { sizes, groupCount: 3, label: formatLayoutLabel(sizes) };
}

function formatLayoutLabel(sizes: number[]): string {
  if (sizes.length === 1) return `1 gruppe (${sizes[0]} lag)`;
  return `${sizes.length} grupper (${sizes.join(' + ')})`;
}

/** @deprecated Bruk computeGroupLayout */
export function computeGroupCount(teamCount: number): number {
  return computeGroupLayout(teamCount).groupCount;
}

/** Forklaring av sluttspill for admin og hjelpetekst. */
export function describePlayoffRules(layout: GroupLayout): string {
  const { sizes, groupCount } = layout;

  if (groupCount === 1) {
    return 'Kun gruppespill — ingen sluttspill.';
  }

  if (groupCount === 2) {
    const n = Math.min(...sizes);
    return (
      `Etter gruppespill: ${n} krysskamper — ` +
      `1. plass A vs 1. plass B, 2. vs 2., osv. (lik plassering møtes).`
    );
  }

  if (sizes.every((s) => s >= 4)) {
    return (
      'Etter gruppespill: topp 2 fra hver gruppe + 2 beste 3. plass → 8 lag. ' +
      'Kvartfinaler: 1A–2B, 1C–2A, 1B–2C, og beste 3. plass mot beste 3. plass.'
    );
  }

  return (
    'Etter gruppespill: topp 2 fra hver gruppe (6 lag). ' +
    'Sluttspill: 1A–2B, 1B–2C, 1C–2A (vinnergruppe mot andreplass i neste gruppe).'
  );
}

export function describeGroupPlan(teamCount: number): string {
  const layout = computeGroupLayout(teamCount);
  const parts = [
    layout.label,
    'Alle møter alle i egen gruppe (3 poeng seier, 1 uavgjort).',
    describePlayoffRules(layout),
  ];
  return parts.join(' ');
}

/** Fordel lag i grupper (slange-draft, respekterer gruppestørrelser). */
export function assignTeamsToGroups(teams: Team[], layout: GroupLayout): Group[] {
  const { sizes } = layout;
  const groups: Group[] = sizes.map((size, i) => ({
    id: groupLabel(i),
    name: `Gruppe ${groupLabel(i)}`,
    teamIds: [],
  }));

  const ids = teams.map((t) => t.id);
  const groupCount = sizes.length;

  for (let i = 0; i < ids.length; i++) {
    const round = Math.floor(i / groupCount);
    let pos = i % groupCount;
    if (round % 2 === 1) pos = groupCount - 1 - pos;

    let attempts = 0;
    while (groups[pos].teamIds.length >= sizes[pos] && attempts < groupCount) {
      pos = (pos + 1) % groupCount;
      attempts++;
    }
    groups[pos].teamIds.push(ids[i]);
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

function resolveSlot(
  slot: TeamSlot,
  groups: Group[],
  provisionalOrder: Map<string, string[]>
): string | null {
  const group = groups.find((g) => g.id === slot.groupId);
  if (!group) return null;
  const order = provisionalOrder.get(group.id) ?? group.teamIds;
  return order[slot.rank - 1] ?? null;
}

function provisionalStandings(groups: Group[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const g of groups) {
    map.set(g.id, [...g.teamIds]);
  }
  return map;
}

function slotsToPairings(
  slots: PlayoffSlot[],
  groups: Group[],
  order: Map<string, string[]>
): ScheduledPairing[] {
  return slots
    .map((s) => {
      const home = resolveSlot(s.home, groups, order);
      const away = resolveSlot(s.away, groups, order);
      if (!home || !away || home === away) return null;
      return {
        home,
        away,
        phase: s.phase,
        label: s.label,
      };
    })
    .filter((p): p is ScheduledPairing => p !== null);
}

/** Sluttspillkamper ut fra gruppeoppsett. */
export function buildPlayoffSlots(groups: Group[], layout: GroupLayout): PlayoffSlot[] {
  const sizes = groups.map((g) => g.teamIds.length);
  const [ga, gb, gc] = groups;

  if (layout.groupCount === 2 && ga && gb) {
    const rounds = Math.min(sizes[0], sizes[1]);
    return Array.from({ length: rounds }, (_, i) => ({
      home: { groupId: ga.id, rank: i + 1 },
      away: { groupId: gb.id, rank: i + 1 },
      phase: 'crossover' as MatchPhase,
      label: `Krysskamp ${i + 1}. plass (${ga.id} vs ${gb.id})`,
    }));
  }

  if (layout.groupCount === 3 && ga && gb && gc) {
    const allFourPlus = sizes.every((s) => s >= 4);

    if (allFourPlus) {
      return [
        {
          home: { groupId: 'A', rank: 1 },
          away: { groupId: 'B', rank: 2 },
          phase: 'quarterfinal',
          label: 'Kvartfinale 1: 1A – 2B',
        },
        {
          home: { groupId: 'C', rank: 1 },
          away: { groupId: 'A', rank: 2 },
          phase: 'quarterfinal',
          label: 'Kvartfinale 2: 1C – 2A',
        },
        {
          home: { groupId: 'B', rank: 1 },
          away: { groupId: 'C', rank: 2 },
          phase: 'quarterfinal',
          label: 'Kvartfinale 3: 1B – 2C',
        },
        {
          home: { groupId: 'A', rank: 3 },
          away: { groupId: 'B', rank: 3 },
          phase: 'quarterfinal',
          label: 'Kvartfinale 4: beste 3. plass',
          resolveThirdPlaces: [0, 1],
        },
      ];
    }

    return [
      {
        home: { groupId: 'A', rank: 1 },
        away: { groupId: 'B', rank: 2 },
        phase: 'crossover',
        label: 'Sluttspill 1: 1A – 2B',
      },
      {
        home: { groupId: 'B', rank: 1 },
        away: { groupId: 'C', rank: 2 },
        phase: 'crossover',
        label: 'Sluttspill 2: 1B – 2C',
      },
      {
        home: { groupId: 'C', rank: 1 },
        away: { groupId: 'A', rank: 2 },
        phase: 'crossover',
        label: 'Sluttspill 3: 1C – 2A',
      },
    ];
  }

  return [];
}

export function generateSeriesPairings(teams: Team[]): {
  groups: Group[];
  pairings: ScheduledPairing[];
  layout: GroupLayout;
} {
  if (teams.length < 2) {
    return { groups: [], pairings: [], layout: computeGroupLayout(0) };
  }

  const layout = computeGroupLayout(teams.length);
  const groups = assignTeamsToGroups(teams, layout);
  const pairings: ScheduledPairing[] = [];

  for (const group of groups) {
    pairings.push(...roundRobinPairings(group.id, group.teamIds));
  }

  if (layout.groupCount > 1) {
    const order = provisionalStandings(groups);
    pairings.push(...slotsToPairings(buildPlayoffSlots(groups, layout), groups, order));
  }

  return { groups, pairings, layout };
}

const PLAYOFF_LABEL_SPECS: Record<
  string,
  | { home: [string, number]; away: [string, number] }
  | { thirdPlaces: [number, number] }
> = {
  'Kvartfinale 1: 1A – 2B': { home: ['A', 1], away: ['B', 2] },
  'Kvartfinale 2: 1C – 2A': { home: ['C', 1], away: ['A', 2] },
  'Kvartfinale 3: 1B – 2C': { home: ['B', 1], away: ['C', 2] },
  'Sluttspill 1: 1A – 2B': { home: ['A', 1], away: ['B', 2] },
  'Sluttspill 2: 1B – 2C': { home: ['B', 1], away: ['C', 2] },
  'Sluttspill 3: 1C – 2A': { home: ['C', 1], away: ['A', 2] },
  'Krysskamp 1A–2B': { home: ['A', 1], away: ['B', 2] },
  'Krysskamp 1B–2C': { home: ['B', 1], away: ['C', 2] },
  'Krysskamp 1C–2A': { home: ['C', 1], away: ['A', 2] },
};

function resolveRankSlot(
  groups: Group[],
  matches: Match[],
  teams: Team[],
  groupId: string,
  rank: number
): string | null {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;
  return rankInGroup(group, matches, teams, rank);
}

/** Oppdater sluttspillkamper ut fra faktisk tabell. */
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
      const home = resolveRankSlot(groups, matches, teams, groups[0].id, r);
      const away = resolveRankSlot(groups, matches, teams, groups[1].id, r);
      if (!home || !away) return m;
      return { ...m, homeTeamId: home, awayTeamId: away };
    }

    if (m.label === 'Kvartfinale 4: beste 3. plass') {
      const thirds = bestThirdPlaces(groups, matches, teams, 2);
      if (thirds.length < 2) return m;
      return { ...m, homeTeamId: thirds[0], awayTeamId: thirds[1] };
    }

    const spec = PLAYOFF_LABEL_SPECS[m.label];
    if (spec && 'home' in spec) {
      const home = resolveRankSlot(groups, matches, teams, spec.home[0], spec.home[1]);
      const away = resolveRankSlot(groups, matches, teams, spec.away[0], spec.away[1]);
      if (!home || !away) return m;
      return { ...m, homeTeamId: home, awayTeamId: away };
    }

    return m;
  });
}
