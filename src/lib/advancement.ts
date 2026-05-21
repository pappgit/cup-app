import type { Group, Match, Team } from '../types';
import type { AdvancementRule } from './tournamentFormats';
import { computeStandings, type StandingRow } from './standings';

export interface QualifiedTeam {
  teamId: string;
  seed: number;
  groupId: string;
  groupRank: number;
}

function compareStandingRows(a: StandingRow, b: StandingRow): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.teamName.localeCompare(b.teamName, 'nb');
}

function rowsAtRank(groups: Group[], matches: Match[], teams: Team[], rank: number): StandingRow[] {
  const rows: StandingRow[] = [];
  for (const group of groups) {
    const table = computeStandings(group, matches, teams);
    if (table[rank - 1]) rows.push(table[rank - 1]);
  }
  rows.sort(compareStandingRows);
  return rows;
}

function assignSeeds(entries: { teamId: string; groupId: string; groupRank: number }[]): QualifiedTeam[] {
  return entries.map((e, i) => ({
    ...e,
    seed: i + 1,
  }));
}

/**
 * Ranger kvalifiserte lag til seed 1…n (sterkeste seed 1).
 * Brukes til å fylle kvartfinale / play-in etter gruppespill.
 */
export function computeQualifiedSeeds(
  groups: Group[],
  matches: Match[],
  teams: Team[],
  rule: AdvancementRule
): QualifiedTeam[] {
  const entries: { teamId: string; groupId: string; groupRank: number }[] = [];

  switch (rule.kind) {
    case 'single_group_top': {
      const group = groups[0];
      if (!group) return [];
      const table = computeStandings(group, matches, teams);
      const n = rule.total ?? 4;
      for (let i = 0; i < Math.min(n, table.length); i++) {
        entries.push({ teamId: table[i].teamId, groupId: group.id, groupRank: i + 1 });
      }
      break;
    }

    case 'top_per_group': {
      const n = rule.perGroup ?? 2;
      for (const group of groups) {
        const table = computeStandings(group, matches, teams);
        for (let i = 0; i < Math.min(n, table.length); i++) {
          entries.push({ teamId: table[i].teamId, groupId: group.id, groupRank: i + 1 });
        }
      }
      break;
    }

    case 'winners_plus_best_seconds': {
      for (const group of groups) {
        const table = computeStandings(group, matches, teams);
        if (table[0]) {
          entries.push({ teamId: table[0].teamId, groupId: group.id, groupRank: 1 });
        }
      }
      const seconds = rowsAtRank(groups, matches, teams, 2);
      const need = rule.bestSeconds ?? 0;
      for (let i = 0; i < Math.min(need, seconds.length); i++) {
        const row = seconds[i];
        const group = groups.find((g) => g.teamIds.includes(row.teamId));
        entries.push({
          teamId: row.teamId,
          groupId: group?.id ?? '?',
          groupRank: 2,
        });
      }
      break;
    }

    case 'winners_plus_best_thirds':
    case 'top2_plus_best_thirds': {
      const perGroup = rule.perGroup ?? 2;
      for (const group of groups) {
        const table = computeStandings(group, matches, teams);
        for (let i = 0; i < Math.min(perGroup, table.length); i++) {
          entries.push({ teamId: table[i].teamId, groupId: group.id, groupRank: i + 1 });
        }
      }
      const thirds = rowsAtRank(groups, matches, teams, 3);
      const need = rule.bestThirds ?? 0;
      for (let i = 0; i < Math.min(need, thirds.length); i++) {
        const row = thirds[i];
        const group = groups.find((g) => g.teamIds.includes(row.teamId));
        entries.push({
          teamId: row.teamId,
          groupId: group?.id ?? '?',
          groupRank: 3,
        });
      }
      break;
    }
  }

  const byStrength = [...entries].sort((a, b) => {
    const groupA = groups.find((g) => g.id === a.groupId);
    const groupB = groups.find((g) => g.id === b.groupId);
    if (!groupA || !groupB) return 0;
    const tableA = computeStandings(groupA, matches, teams);
    const tableB = computeStandings(groupB, matches, teams);
    const rowA = tableA.find((r) => r.teamId === a.teamId);
    const rowB = tableB.find((r) => r.teamId === b.teamId);
    if (!rowA || !rowB) return 0;
    return compareStandingRows(rowB, rowA);
  });

  return assignSeeds(byStrength);
}

export function teamIdForSeed(
  seeds: QualifiedTeam[],
  seed: number
): string | null {
  return seeds.find((s) => s.seed === seed)?.teamId ?? null;
}
