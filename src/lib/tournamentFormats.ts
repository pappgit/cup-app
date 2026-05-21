/**
 * Turneringsoppsett for seriespill + sluttspill (4–25 lag).
 * Gruppedeling er jevn (maks ±1 lag mellom grupper).
 */

export type AdvancementKind =
  | 'single_group_top' /** Én gruppe – topp N til sluttspill */
  | 'top_per_group' /** Topp N fra hver gruppe */
  | 'winners_plus_best_seconds' /** Gruppevinnere + beste 2.-plasser på tvers */
  | 'winners_plus_best_thirds' /** Gruppevinnere + beste 3.-plasser på tvers */
  | 'top2_plus_best_thirds'; /** Topp 2 per gruppe + beste 3.-plasser (7, 11, 12) */

export interface AdvancementRule {
  kind: AdvancementKind;
  /** Topp N per gruppe (top_per_group, top2_plus_best_thirds) */
  perGroup?: number;
  /** Topp N i én gruppe (single_group_top) */
  total?: number;
  /** Antall beste 2.-plasser på tvers (winners_plus_best_seconds) */
  bestSeconds?: number;
  /** Antall beste 3.-plasser på tvers */
  bestThirds?: number;
}

export interface TournamentFormat {
  teamCount: number;
  groupSizes: number[];
  advancement: AdvancementRule;
  /** Mål for sluttspill (4 = SF+finale, 8 = QF+SF+finale) */
  knockoutSize: 4 | 8;
  /** 10 lag → play-in ned til 8 (f.eks. 25 lag) */
  playIn?: boolean;
  summary: string;
}

function formatSizes(sizes: number[]): string {
  if (sizes.length === 1) return `1×${sizes[0]}`;
  return `${sizes.length} grupper (${sizes.join('+')})`;
}

const FORMATS: Record<number, TournamentFormat> = {
  4: {
    teamCount: 4,
    groupSizes: [4],
    advancement: { kind: 'single_group_top', total: 4 },
    knockoutSize: 4,
    summary: '1×4 · topp 4 → semifinale + finale',
  },
  5: {
    teamCount: 5,
    groupSizes: [5],
    advancement: { kind: 'single_group_top', total: 4 },
    knockoutSize: 4,
    summary: '1×5 · topp 4 → semifinale + finale',
  },
  6: {
    teamCount: 6,
    groupSizes: [3, 3],
    advancement: { kind: 'top_per_group', perGroup: 2 },
    knockoutSize: 4,
    summary: '2×3 · topp 2 per gruppe → semifinale + finale',
  },
  7: {
    teamCount: 7,
    groupSizes: [4, 3],
    advancement: { kind: 'top2_plus_best_thirds', perGroup: 2, bestThirds: 1 },
    knockoutSize: 4,
    summary: '4+3 · topp 2 per gruppe + beste 3.-plass → semifinale + finale',
  },
  8: {
    teamCount: 8,
    groupSizes: [4, 4],
    advancement: { kind: 'top_per_group', perGroup: 2 },
    knockoutSize: 8,
    summary: '2×4 · topp 2 per gruppe → kvartfinale + semifinale + finale',
  },
  9: {
    teamCount: 9,
    groupSizes: [3, 3, 3],
    advancement: { kind: 'winners_plus_best_seconds', bestSeconds: 5 },
    knockoutSize: 8,
    summary: '3×3 · gruppevinnere + 5 beste 2.-plasser → 8 til sluttspill',
  },
  10: {
    teamCount: 10,
    groupSizes: [5, 5],
    advancement: { kind: 'top_per_group', perGroup: 2 },
    knockoutSize: 4,
    summary: '2×5 · topp 2 per gruppe → semifinale + finale',
  },
  11: {
    teamCount: 11,
    groupSizes: [4, 4, 3],
    advancement: { kind: 'top2_plus_best_thirds', perGroup: 2, bestThirds: 2 },
    knockoutSize: 8,
    summary: '4+4+3 · topp 2 per gruppe + 2 beste 3.-plasser → 8 til sluttspill',
  },
  12: {
    teamCount: 12,
    groupSizes: [4, 4, 4],
    advancement: { kind: 'top2_plus_best_thirds', perGroup: 2, bestThirds: 2 },
    knockoutSize: 8,
    summary: '3×4 · topp 2 per gruppe + 2 beste 3.-plasser → 8 til sluttspill',
  },
  13: {
    teamCount: 13,
    groupSizes: [4, 3, 3, 3],
    advancement: { kind: 'winners_plus_best_seconds', bestSeconds: 4 },
    knockoutSize: 8,
    summary: '4+3+3+3 · gruppevinnere + 4 beste 2.-plasser → 8 til sluttspill',
  },
  14: {
    teamCount: 14,
    groupSizes: [4, 4, 3, 3],
    advancement: { kind: 'winners_plus_best_seconds', bestSeconds: 4 },
    knockoutSize: 8,
    summary: '4+4+3+3 · gruppevinnere + 4 beste 2.-plasser → 8 til sluttspill',
  },
  15: {
    teamCount: 15,
    groupSizes: [4, 4, 4, 3],
    advancement: { kind: 'winners_plus_best_seconds', bestSeconds: 4 },
    knockoutSize: 8,
    summary: '4+4+4+3 · gruppevinnere + 4 beste 2.-plasser → 8 til sluttspill',
  },
  16: {
    teamCount: 16,
    groupSizes: [4, 4, 4, 4],
    advancement: { kind: 'top_per_group', perGroup: 2 },
    knockoutSize: 8,
    summary: '4×4 · topp 2 per gruppe → kvartfinale + semifinale + finale',
  },
  17: {
    teamCount: 17,
    groupSizes: [5, 4, 4, 4],
    advancement: { kind: 'top_per_group', perGroup: 2 },
    knockoutSize: 8,
    summary: '5+4+4+4 · topp 2 per gruppe → 8 til sluttspill',
  },
  18: {
    teamCount: 18,
    groupSizes: [5, 5, 4, 4],
    advancement: { kind: 'top_per_group', perGroup: 2 },
    knockoutSize: 8,
    summary: '5+5+4+4 · topp 2 per gruppe → 8 til sluttspill',
  },
  19: {
    teamCount: 19,
    groupSizes: [5, 5, 5, 4],
    advancement: { kind: 'top_per_group', perGroup: 2 },
    knockoutSize: 8,
    summary: '5+5+5+4 · topp 2 per gruppe → 8 til sluttspill',
  },
  20: {
    teamCount: 20,
    groupSizes: [5, 5, 5, 5],
    advancement: { kind: 'top_per_group', perGroup: 2 },
    knockoutSize: 8,
    summary: '4×5 · topp 2 per gruppe → 8 til sluttspill',
  },
  21: {
    teamCount: 21,
    groupSizes: [5, 4, 4, 4, 4],
    advancement: { kind: 'winners_plus_best_seconds', bestSeconds: 3 },
    knockoutSize: 8,
    summary: '5 grupper · gruppevinnere + 3 beste 2.-plasser → 8 til sluttspill',
  },
  22: {
    teamCount: 22,
    groupSizes: [5, 5, 4, 4, 4],
    advancement: { kind: 'winners_plus_best_seconds', bestSeconds: 3 },
    knockoutSize: 8,
    summary: '5 grupper · gruppevinnere + 3 beste 2.-plasser → 8 til sluttspill',
  },
  23: {
    teamCount: 23,
    groupSizes: [5, 5, 5, 4, 4],
    advancement: { kind: 'winners_plus_best_seconds', bestSeconds: 3 },
    knockoutSize: 8,
    summary: '5 grupper · gruppevinnere + 3 beste 2.-plasser → 8 til sluttspill',
  },
  24: {
    teamCount: 24,
    groupSizes: [4, 4, 4, 4, 4, 4],
    advancement: { kind: 'winners_plus_best_seconds', bestSeconds: 2 },
    knockoutSize: 8,
    summary: '6×4 · gruppevinnere + 2 beste 2.-plasser → 8 til sluttspill',
  },
  25: {
    teamCount: 25,
    groupSizes: [5, 5, 5, 5, 5],
    advancement: { kind: 'top_per_group', perGroup: 2 },
    knockoutSize: 8,
    playIn: true,
    summary: '5×5 · topp 2 per gruppe (10) → play-in → 8 til sluttspill',
  },
};

/** Dynamisk fordeling når lagantall ikke er i tabellen (4–25). */
function distributeEvenly(teamCount: number, groupCount: number): number[] {
  const base = Math.floor(teamCount / groupCount);
  const remainder = teamCount % groupCount;
  return Array.from({ length: groupCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

function pickGroupCount(teamCount: number): number {
  if (teamCount <= 5) return 1;
  if (teamCount <= 8) return 2;
  if (teamCount <= 12) return 3;
  if (teamCount <= 20) return 4;
  if (teamCount <= 24) return Math.ceil(teamCount / 4);
  return 5;
}

function buildFallbackFormat(teamCount: number): TournamentFormat {
  if (teamCount < 4) {
    return {
      teamCount,
      groupSizes: [Math.max(2, teamCount)],
      advancement: { kind: 'single_group_top', total: Math.min(4, teamCount) },
      knockoutSize: 4,
      summary: `${teamCount} lag · én gruppe`,
    };
  }

  const groupCount = pickGroupCount(teamCount);
  const groupSizes = distributeEvenly(teamCount, groupCount);

  if (groupCount === 1) {
    return {
      teamCount,
      groupSizes,
      advancement: { kind: 'single_group_top', total: Math.min(4, teamCount) },
      knockoutSize: 4,
      summary: formatSizes(groupSizes) + ' · topp 4',
    };
  }

  if (groupCount === 2) {
    return {
      teamCount,
      groupSizes,
      advancement: { kind: 'top_per_group', perGroup: 2 },
      knockoutSize: teamCount >= 8 ? 8 : 4,
      summary: formatSizes(groupSizes) + ' · topp 2 per gruppe',
    };
  }

  return {
    teamCount,
    groupSizes,
    advancement: { kind: 'top_per_group', perGroup: 2 },
    knockoutSize: 8,
    summary: formatSizes(groupSizes) + ' · topp 2 per gruppe',
  };
}

export function getTournamentFormat(teamCount: number): TournamentFormat {
  if (FORMATS[teamCount]) return { ...FORMATS[teamCount] };
  if (teamCount >= 4 && teamCount <= 25) return buildFallbackFormat(teamCount);
  return buildFallbackFormat(Math.max(2, teamCount));
}

export function isSupportedTeamCount(teamCount: number): boolean {
  return teamCount >= 4 && teamCount <= 25;
}

export const SUPPORTED_TEAM_COUNTS = Object.keys(FORMATS)
  .map(Number)
  .sort((a, b) => a - b);
