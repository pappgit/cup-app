import type { Group, Match, MatchPhase, ScheduleParams, Team } from '../types';
import { generatePlayoffSlots } from './playoffs';
import type { PlayoffSlot, TeamSlot } from './playoffs';
import { GLOBAL_GROUP_ID, provisionalGlobalOrder, teamAtGlobalRank } from './ranking';
import { groupLabel, rankInGroup } from './standings';

export type { PlayoffSlot, TeamSlot } from './playoffs';

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
  const globalMatch = label.match(
    /Nr\s*(\d+)\s+totalt\s+vs\s+Nr\s*(\d+)\s+totalt/i
  );
  if (globalMatch) {
    return {
      home: { groupId: GLOBAL_GROUP_ID, rank: Number(globalMatch[1]) },
      away: { groupId: GLOBAL_GROUP_ID, rank: Number(globalMatch[2]) },
    };
  }

  const standard = label.match(
    /Nr\s*(\d+)\s+i\s+gruppe\s*([A-C])\s+vs\s+Nr\s*(\d+)\s+i\s+gruppe\s*([A-C])/i
  );
  if (standard) {
    return {
      home: { groupId: standard[2].toUpperCase(), rank: Number(standard[1]) },
      away: { groupId: standard[4].toUpperCase(), rank: Number(standard[3]) },
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

export interface GroupLayout {
  sizes: number[];
  groupCount: number;
  label: string;
}

function distributeGroupSizes(teamCount: number, groupCount: number): number[] {
  const base = Math.floor(teamCount / groupCount);
  const remainder = teamCount % groupCount;
  return Array.from({ length: groupCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

function pickGroupCount(teamCount: number): number {
  if (teamCount < 4) return 1;
  if (teamCount <= 6) return 2;
  if (teamCount <= 15) return 3;
  if (teamCount <= 20) return 4;
  return Math.min(8, Math.ceil(teamCount / 4));
}

/** Gruppeoppsett – jevn fordeling av lag. */
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

  const groupCount = pickGroupCount(teamCount);
  const sizes = distributeGroupSizes(teamCount, groupCount);
  return { sizes, groupCount, label: formatLayoutLabel(sizes) };
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
      `Etter gruppespill: ${n} plasseringskamp(er) — lik plassering møtes ` +
      `(Nr 1 i A vs Nr 1 i B, osv.). Alle lag får én ekstra kamp. ` +
      `Sluttspill kun i ${PLAYOFF_COURT}.`
    );
  }

  if (groupCount === 3) {
    return (
      'Etter gruppespill: global rangering (poeng per kamp). Topp 4: semifinale (1–4, 2–3). ' +
      'Deretter plasseringskamper for 5.–8., 9.–siste. Sluttspill kun i ' +
      PLAYOFF_COURT +
      '.'
    );
  }

  if (groupCount === 4) {
    return (
      'Etter gruppespill: kvartfinaler (1A–2B, 1C–2D, osv.). ' +
      `Sluttspill kun i ${PLAYOFF_COURT}.`
    );
  }

  return (
    'Etter gruppespill: global rangering, topp 8 til kvartfinale. ' +
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
  provisionalOrder: Map<string, string[]>,
  globalOrder: string[]
): string | null {
  if (slot.groupId === GLOBAL_GROUP_ID) {
    return globalOrder[slot.rank - 1] ?? null;
  }
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
  globalOrder: string[],
  excludeId?: string
): string {
  const resolved = resolveSlot(slot, groups, order, globalOrder);
  if (resolved && resolved !== excludeId) return resolved;

  if (slot.groupId === GLOBAL_GROUP_ID) {
    const id = globalOrder[slot.rank - 1];
    if (id && id !== excludeId) return id;
    const alt = globalOrder.find((tid) => tid !== excludeId);
    return alt ?? globalOrder[0] ?? '';
  }

  const group = groups.find((g) => g.id === slot.groupId);
  if (!group || group.teamIds.length === 0) return '';

  const byRank = group.teamIds[slot.rank - 1];
  if (byRank && byRank !== excludeId) return byRank;

  const alt = group.teamIds.find((id) => id !== excludeId);
  return alt ?? group.teamIds[0];
}

/** Sluttspillkamper inkluderes alltid (med etikett); lag settes etter gruppespill. */
function slotsToPairings(
  slots: PlayoffSlot[],
  groups: Group[],
  order: Map<string, string[]>,
  globalOrder: string[],
  placeholderTeamId: string
): ScheduledPairing[] {
  return slots
    .map((s) => ({
      home: placeholderTeamId,
      away: placeholderTeamId,
      phase: s.phase,
      label: s.label,
    }))
    .filter((p): p is ScheduledPairing => Boolean(p.home && p.away));
}

/** Sluttspillkamper ut fra gruppeoppsett (delegerer til playoffs-modulen). */
export function buildPlayoffSlots(
  groups: Group[],
  layout: GroupLayout,
  teamCount: number
): PlayoffSlot[] {
  return generatePlayoffSlots(groups, layout.groupCount, teamCount);
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

  if (layout.groupCount > 1 && teams.length > 0) {
    const placeholderTeamId = teams[0].id;
    pairings.push(
      ...slotsToPairings(
        buildPlayoffSlots(groups, layout, teams.length),
        groups,
        provisionalStandings(groups),
        provisionalGlobalOrder(groups),
        placeholderTeamId
      )
    );
  }

  return { groups, pairings, layout };
}

export function countPlayoffPairings(teams: Team[]): number {
  if (teams.length < 2) return 0;
  const layout = computeGroupLayout(teams.length);
  if (layout.groupCount <= 1) return 0;
  const groups = assignTeamsToGroups(teams, layout);
  return buildPlayoffSlots(groups, layout, teams.length).length;
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
  if (!isGroupStageComplete(groups, matches)) return matches;
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

    if (parsed.home.groupId === GLOBAL_GROUP_ID) {
      const home = teamAtGlobalRank(groups, matches, teams, parsed.home.rank);
      const away = teamAtGlobalRank(groups, matches, teams, parsed.away.rank);
      if (!home || !away) return m;
      return { ...m, homeTeamId: home, awayTeamId: away, court: PLAYOFF_COURT };
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
