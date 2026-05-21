import type { Group, Match, Team } from '../types';
import { computeStandings } from './standings';

export const GLOBAL_GROUP_ID = 'GLOBAL';

export interface GlobalRankedTeam {
  teamId: string;
  teamName: string;
  groupId: string;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  pointsPerGame: number;
  goalDiffPerGame: number;
  goalsPerGame: number;
}

function perGame(value: number, played: number): number {
  if (played <= 0) return 0;
  return value / played;
}

/** Ranger alle lag på tvers av grupper (poeng per kamp, ikke rå poeng). */
export function computeGlobalRanking(
  groups: Group[],
  matches: Match[],
  teams: Team[]
): GlobalRankedTeam[] {
  const teamMap = new Map(teams.map((t) => [t.id, t.name]));
  const ranked: GlobalRankedTeam[] = [];

  for (const group of groups) {
    const table = computeStandings(group, matches, teams);
    for (const row of table) {
      ranked.push({
        teamId: row.teamId,
        teamName: teamMap.get(row.teamId) ?? row.teamName,
        groupId: group.id,
        played: row.played,
        points: row.points,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference,
        pointsPerGame: perGame(row.points, row.played),
        goalDiffPerGame: perGame(row.goalDifference, row.played),
        goalsPerGame: perGame(row.goalsFor, row.played),
      });
    }
  }

  ranked.sort((a, b) => {
    if (b.pointsPerGame !== a.pointsPerGame) return b.pointsPerGame - a.pointsPerGame;
    if (b.goalDiffPerGame !== a.goalDiffPerGame) return b.goalDiffPerGame - a.goalDiffPerGame;
    if (b.goalsPerGame !== a.goalsPerGame) return b.goalsPerGame - a.goalsPerGame;
    return a.teamName.localeCompare(b.teamName, 'nb');
  });

  return ranked;
}

export function teamAtGlobalRank(
  groups: Group[],
  matches: Match[],
  teams: Team[],
  rank: number
): string | null {
  const table = computeGlobalRanking(groups, matches, teams);
  return table[rank - 1]?.teamId ?? null;
}

/** Provisional rekkefølge ved generering (før resultater). */
export function provisionalGlobalOrder(groups: Group[]): string[] {
  return groups.flatMap((g) => g.teamIds);
}
