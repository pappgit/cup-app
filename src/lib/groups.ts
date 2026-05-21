import type { Group, Match, MatchPhase, ScheduleParams, Team } from '../types';
import { bestThirdPlaces, groupLabel, rankInGroup } from './standings';

/** Sluttspill spilles alltid på denne hallen. */
export const PLAYOFF_COURT = 'Høyenhallen';

export function isPlayoffPhase(phase?: MatchPhase): boolean {
  return phase === 'crossover' || phase === 'quarterfinal';
}

/** Etikett: Nr 3 i gruppe A vs Nr 3 i gruppe B */
export function playoffMatchLabel(
  homeRank: number,
  homeGroupId: string,
  awayRank: number,
  awayGroupId: string
): string {
  return `Nr ${homeRank} i gruppe ${homeGroupId} vs Nr ${awayRank} i gruppe ${awayGroupId}`;
}

export function parsePlayoffLabel(
  label: string
): { home: TeamSlot; away: TeamSlot; thirdPlaces?: [number, number] } | null {
  const standard = label.match(
    /Nr\s*(\d+)\s+i\s+gruppe\s*([A-C])\s+vs\s+Nr\s*(\d+)\s+i\s+gruppe\s*([A-C])/i
  );
  if (standard) {
    return {
      home: { groupId: standard[2].toUpperCase(), rank: Number(standard[1]) },
      away: { groupId: standard[4].toUpperCase(), rank: Number(standard[3]) },
    };
  }

  if (/beste\s+3/i.test(label)) {
    return {
      home: { groupId: 'A', rank: 3 },
      away: { groupId: 'B', rank: 3 },
      thirdPlaces: [0, 1],
    };
  }

  return null;
}

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
      `Etter gruppespill: ${n} finale(r) — lik plassering møtes ` +
      `(Nr 1 i gruppe A vs Nr 1 i B, Nr 2 vs Nr 2, osv.). Alle lag får én ekstra kamp. ` +
      `Sluttspill kun i ${PLAYOFF_COURT}.`
    );
  }

  if (sizes.every((s) => s >= 4)) {
    return (
      'Etter gruppespill: kvartfinaler (topp 2 per gruppe + 2 beste 3. plass). ' +
      `Sluttspill kun i ${PLAYOFF_COURT}.`
    );
  }

  return (
    'Etter gruppespill: krysskamper mellom gruppene (topp 2). ' +
    `Sluttspill kun i ${PLAYOFF_COURT}.`
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
    if (groups[pos].teamIds.length < sizes[pos]) {
      groups[pos].teamIds.push(ids[i]);
    }
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

function resolveSlotWithFallback(
  slot: TeamSlot,
  groups: Group[],
  order: Map<string, string[]>,
  excludeId?: string
): string {
  const resolved = resolveSlot(slot, groups, order);
  if (resolved && resolved !== excludeId) return resolved;

  const group = groups.find((g) => g.id === slot.groupId);
  if (!group || group.teamIds.length === 0) return '';

  const byRank = group.teamIds[slot.rank - 1];
  if (byRank && byRank !== excludeId) return byRank;

  const alt = group.teamIds.find((id) => id !== excludeId);
  return alt ?? group.teamIds[0];
}

/** Sluttspillkamper inkluderes alltid (med etikett), også før tabell er ferdig. */
function slotsToPairings(
  slots: PlayoffSlot[],
  groups: Group[],
  order: Map<string, string[]>
): ScheduledPairing[] {
  return slots
    .map((s) => {
      const home = resolveSlotWithFallback(s.home, groups, order);
      let away = resolveSlotWithFallback(s.away, groups, order, home);
      if (!home || !away) return null;
      if (home === away) {
        const awayGroup = groups.find((g) => g.id === s.away.groupId);
        away =
          awayGroup?.teamIds.find((id) => id !== home) ??
          awayGroup?.teamIds[0] ??
          away;
      }
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
    return Array.from({ length: rounds }, (_, i) => {
      const rank = i + 1;
      return {
        home: { groupId: ga.id, rank },
        away: { groupId: gb.id, rank },
        phase: 'crossover' as MatchPhase,
        label: playoffMatchLabel(rank, ga.id, rank, gb.id),
      };
    });
  }

  if (layout.groupCount === 3 && ga && gb && gc) {
    const allFourPlus = sizes.every((s) => s >= 4);

    if (allFourPlus) {
      return [
        {
          home: { groupId: 'A', rank: 1 },
          away: { groupId: 'B', rank: 2 },
          phase: 'quarterfinal',
          label: playoffMatchLabel(1, 'A', 2, 'B'),
        },
        {
          home: { groupId: 'C', rank: 1 },
          away: { groupId: 'A', rank: 2 },
          phase: 'quarterfinal',
          label: playoffMatchLabel(1, 'C', 2, 'A'),
        },
        {
          home: { groupId: 'B', rank: 1 },
          away: { groupId: 'C', rank: 2 },
          phase: 'quarterfinal',
          label: playoffMatchLabel(1, 'B', 2, 'C'),
        },
        {
          home: { groupId: 'A', rank: 3 },
          away: { groupId: 'B', rank: 3 },
          phase: 'quarterfinal',
          label: 'Nr 3 i gruppe A vs Nr 3 i gruppe B (beste 3. plass)',
          resolveThirdPlaces: [0, 1],
        },
      ];
    }

    return [
      {
        home: { groupId: 'A', rank: 1 },
        away: { groupId: 'B', rank: 2 },
        phase: 'crossover',
        label: playoffMatchLabel(1, 'A', 2, 'B'),
      },
      {
        home: { groupId: 'B', rank: 1 },
        away: { groupId: 'C', rank: 2 },
        phase: 'crossover',
        label: playoffMatchLabel(1, 'B', 2, 'C'),
      },
      {
        home: { groupId: 'C', rank: 1 },
        away: { groupId: 'A', rank: 2 },
        phase: 'crossover',
        label: playoffMatchLabel(1, 'C', 2, 'A'),
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

export function countPlayoffPairings(teams: Team[]): number {
  if (teams.length < 2) return 0;
  const layout = computeGroupLayout(teams.length);
  if (layout.groupCount <= 1) return 0;
  const groups = assignTeamsToGroups(teams, layout);
  return buildPlayoffSlots(groups, layout).length;
}

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

/** Grupper fra lagrede parametere, eller rekonstruert fra lagliste. */
export function resolveGroupsForCup(teams: Team[], params: ScheduleParams): Group[] {
  if (params.groups && params.groups.length > 0) {
    return params.groups;
  }
  if (teams.length < 2) return [];
  const layout = computeGroupLayout(teams.length);
  return assignTeamsToGroups(teams, layout);
}

/** Oppdater hjemme/borte-lag på sluttspill ut fra gjeldende tabell. */
export function applyPlayoffTeamUpdates(
  matches: Match[],
  teams: Team[],
  groups: Group[],
  seriesPlay: boolean
): Match[] {
  if (!seriesPlay || groups.length === 0) return matches;
  return refreshPlayoffTeams(groups, matches, teams);
}

/** Oppdater sluttspillkamper ut fra faktisk tabell (etter gruppespill er ferdig). */
export function refreshPlayoffTeams(
  groups: Group[],
  matches: Match[],
  teams: Team[]
): Match[] {
  return matches.map((m) => {
    if (!isPlayoffPhase(m.phase) || !m.label) return m;

    const parsed = parsePlayoffLabel(m.label);
    if (!parsed) return m;

    if (parsed.thirdPlaces) {
      const thirds = bestThirdPlaces(groups, matches, teams, 2);
      if (thirds.length < 2) return m;
      return { ...m, homeTeamId: thirds[0], awayTeamId: thirds[1], court: PLAYOFF_COURT };
    }

    const home = resolveRankSlot(groups, matches, teams, parsed.home.groupId, parsed.home.rank);
    const away = resolveRankSlot(groups, matches, teams, parsed.away.groupId, parsed.away.rank);
    if (!home || !away) return m;
    return { ...m, homeTeamId: home, awayTeamId: away, court: PLAYOFF_COURT };
  });
}

/** Er alle gruppespillkamper ferdige (alle har resultat)? */
export function isGroupStageComplete(groups: Group[], matches: Match[]): boolean {
  const groupMatches = matches.filter((m) => m.phase === 'group');
  if (groupMatches.length === 0) return false;
  return groupMatches.every((m) => m.homeScore != null && m.awayScore != null);
}
