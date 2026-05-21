import type { Group, MatchPhase } from '../types';
import { GLOBAL_GROUP_ID } from './ranking';

export interface TeamSlot {
  groupId: string;
  rank: number;
}

export interface PlayoffSlot {
  home: TeamSlot;
  away: TeamSlot;
  phase: MatchPhase;
  label: string;
  resolveThirdPlaces?: [number, number];
}

function globalSlot(rank: number): TeamSlot {
  return { groupId: GLOBAL_GROUP_ID, rank };
}

function globalMatch(
  homeRank: number,
  awayRank: number,
  label: string,
  phase: MatchPhase = 'crossover'
): PlayoffSlot {
  return {
    home: globalSlot(homeRank),
    away: globalSlot(awayRank),
    phase,
    label,
  };
}

function groupMatch(
  homeRank: number,
  homeGroup: string,
  awayRank: number,
  awayGroup: string,
  label: string,
  phase: MatchPhase = 'crossover'
): PlayoffSlot {
  return {
    home: { groupId: homeGroup, rank: homeRank },
    away: { groupId: awayGroup, rank: awayRank },
    phase,
    label,
  };
}

/** Plasseringskamper innenfor et intervall (f.eks. 5–8, 9–12). */
function tierPlacementSlots(startRank: number, endRank: number, tierLabel: string): PlayoffSlot[] {
  const n = endRank - startRank + 1;
  if (n <= 1) return [];

  if (n === 2) {
    return [
      globalMatch(
        startRank,
        endRank,
        `${tierLabel}: Nr ${startRank} totalt vs Nr ${endRank} totalt`
      ),
    ];
  }

  if (n === 3) {
    return [
      globalMatch(
        startRank,
        startRank + 1,
        `${tierLabel}: Nr ${startRank} totalt vs Nr ${startRank + 1} totalt (Nr ${endRank} totalt bye)`
      ),
    ];
  }

  const slots: PlayoffSlot[] = [];
  let lo = startRank;
  let hi = endRank;
  while (lo < hi) {
    slots.push(
      globalMatch(lo, hi, `${tierLabel}: Nr ${lo} totalt vs Nr ${hi} totalt`)
    );
    lo++;
    hi--;
  }
  return slots;
}

/** CASE B — 2 grupper: lik plassering møtes (alle får ekstra kamp). */
function twoGroupPlayoffs(groups: Group[]): PlayoffSlot[] {
  const [ga, gb] = groups;
  if (!ga || !gb) return [];
  const rounds = Math.min(ga.teamIds.length, gb.teamIds.length);
  return Array.from({ length: rounds }, (_, i) => {
    const rank = i + 1;
    return groupMatch(
      rank,
      ga.id,
      rank,
      gb.id,
      `Nr ${rank} i gruppe ${ga.id} vs Nr ${rank} i gruppe ${gb.id}`
    );
  });
}

/** CASE C — 3 grupper: global ranking + topp 4 + plassering 5–8, 9–… */
function threeGroupPlayoffs(teamCount: number): PlayoffSlot[] {
  const slots: PlayoffSlot[] = [
    globalMatch(1, 4, 'Semifinale: Nr 1 totalt vs Nr 4 totalt'),
    globalMatch(2, 3, 'Semifinale: Nr 2 totalt vs Nr 3 totalt'),
  ];

  if (teamCount >= 8) {
    slots.push(...tierPlacementSlots(5, Math.min(8, teamCount), 'Plassering 5.–8.'));
  }
  if (teamCount >= 9) {
    slots.push(...tierPlacementSlots(9, teamCount, `Plassering 9.–${teamCount}.`));
  }

  return slots;
}

/** CASE D — 4 grupper: kvartfinaler. */
function fourGroupPlayoffs(): PlayoffSlot[] {
  return [
    groupMatch(1, 'A', 2, 'B', 'Kvartfinale: Nr 1 i gruppe A vs Nr 2 i gruppe B', 'quarterfinal'),
    groupMatch(1, 'C', 2, 'D', 'Kvartfinale: Nr 1 i gruppe C vs Nr 2 i gruppe D', 'quarterfinal'),
    groupMatch(1, 'B', 2, 'C', 'Kvartfinale: Nr 1 i gruppe B vs Nr 2 i gruppe C', 'quarterfinal'),
    groupMatch(1, 'D', 2, 'A', 'Kvartfinale: Nr 1 i gruppe D vs Nr 2 i gruppe A', 'quarterfinal'),
  ];
}

/** CASE 5+ — topp 8 fra global ranking. */
function multiGroupTop8Playoffs(): PlayoffSlot[] {
  return [
    globalMatch(1, 8, 'Kvartfinale: Nr 1 totalt vs Nr 8 totalt', 'quarterfinal'),
    globalMatch(2, 7, 'Kvartfinale: Nr 2 totalt vs Nr 7 totalt', 'quarterfinal'),
    globalMatch(3, 6, 'Kvartfinale: Nr 3 totalt vs Nr 6 totalt', 'quarterfinal'),
    globalMatch(4, 5, 'Kvartfinale: Nr 4 totalt vs Nr 5 totalt', 'quarterfinal'),
  ];
}

/** Velg sluttspillmodell ut fra antall grupper og lag. */
export function generatePlayoffSlots(
  groups: Group[],
  groupCount: number,
  teamCount: number
): PlayoffSlot[] {

  if (groupCount <= 1) return [];

  if (groupCount === 2) return twoGroupPlayoffs(groups);

  if (groupCount === 3) return threeGroupPlayoffs(teamCount);

  if (groupCount === 4) return fourGroupPlayoffs();

  if (teamCount >= 8) return multiGroupTop8Playoffs();

  return threeGroupPlayoffs(teamCount);
}
