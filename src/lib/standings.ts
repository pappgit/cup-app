import type { Group, Match, StandingRow, Team } from '../types';

const GROUP_LETTERS = ['A', 'B', 'C', 'D'] as const;

export function computeStandings(
  group: Group,
  matches: Match[],
  teams: Team[]
): StandingRow[] {
  const teamMap = new Map(teams.map((t) => [t.id, t.name]));
  const rows = new Map<string, StandingRow>();

  for (const teamId of group.teamIds) {
    rows.set(teamId, {
      teamId,
      teamName: teamMap.get(teamId) ?? '?',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  const groupMatches = matches.filter(
    (m) =>
      m.phase === 'group' &&
      m.groupId === group.id &&
      m.homeScore != null &&
      m.awayScore != null
  );

  for (const m of groupMatches) {
    const home = rows.get(m.homeTeamId);
    const away = rows.get(m.awayTeamId);
    if (!home || !away) continue;

    const hs = m.homeScore!;
    const as = m.awayScore!;

    home.played++;
    away.played++;
    home.goalsFor += hs;
    home.goalsAgainst += as;
    away.goalsFor += as;
    away.goalsAgainst += hs;

    if (hs > as) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (hs < as) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  const list = [...rows.values()].map((r) => ({
    ...r,
    goalDifference: r.goalsFor - r.goalsAgainst,
  }));

  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName, 'nb');
  });

  return list;
}

export function rankInGroup(
  group: Group,
  matches: Match[],
  teams: Team[],
  rank: number
): string | null {
  const table = computeStandings(group, matches, teams);
  return table[rank - 1]?.teamId ?? null;
}

export function groupLabel(index: number): string {
  return GROUP_LETTERS[index] ?? `G${index + 1}`;
}
