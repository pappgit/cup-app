import type { Group, MatchPhase } from '../types';
import type { TournamentFormat } from './tournamentFormats';

export interface TeamSlot {
  groupId: string;
  rank: number;
}

export interface PlayoffSlot {
  home: TeamSlot;
  away: TeamSlot;
  phase: MatchPhase;
  label: string;
  /** Seed-basert oppløsning (Seed 1 vs Seed 8) */
  homeSeed?: number;
  awaySeed?: number;
}

function seedSlot(seed: number): TeamSlot {
  return { groupId: `SEED_${seed}`, rank: 1 };
}

function seedMatch(
  homeSeed: number,
  awaySeed: number,
  label: string,
  phase: MatchPhase
): PlayoffSlot {
  return {
    home: seedSlot(homeSeed),
    away: seedSlot(awaySeed),
    phase,
    label,
    homeSeed,
    awaySeed,
  };
}

/** Standard 8-lags kvartfinale (1–8 seeding). */
function quarterfinalBracket(): PlayoffSlot[] {
  return [
    seedMatch(1, 8, 'Kvartfinale: Seed 1 vs Seed 8', 'quarterfinal'),
    seedMatch(4, 5, 'Kvartfinale: Seed 4 vs Seed 5', 'quarterfinal'),
    seedMatch(3, 6, 'Kvartfinale: Seed 3 vs Seed 6', 'quarterfinal'),
    seedMatch(2, 7, 'Kvartfinale: Seed 2 vs Seed 7', 'quarterfinal'),
  ];
}

/** Semifinale + finale (4 lag). */
function semifinalAndFinalFour(): PlayoffSlot[] {
  return [
    seedMatch(1, 4, 'Semifinale: Seed 1 vs Seed 4', 'semifinal'),
    seedMatch(2, 3, 'Semifinale: Seed 2 vs Seed 3', 'semifinal'),
    {
      home: seedSlot(1),
      away: seedSlot(2),
      phase: 'final',
      label: 'Finale',
      homeSeed: 1,
      awaySeed: 2,
    },
  ];
}

/** Play-in: 10 lag kvalifisert → 8 (seed 9–10 og 7–8 spiller om to plasser). */
function playInRound(): PlayoffSlot[] {
  return [
    seedMatch(9, 10, 'Play-in: Seed 9 vs Seed 10', 'crossover'),
    seedMatch(7, 8, 'Play-in: Seed 8 vs Seed 7', 'crossover'),
  ];
}

/**
 * Generer sluttspillkamper ut fra turneringsformat.
 * Kvartfinale/play-in bruker seed-oppløsning etter gruppespill.
 * Semifinale og finale vises med seed-etiketter (lag settes når tidligere runder er ferdig).
 */
export function generatePlayoffSlots(
  _groups: Group[],
  format: TournamentFormat
): PlayoffSlot[] {
  if (format.groupSizes.length <= 1 && format.knockoutSize === 4) {
    return semifinalAndFinalFour();
  }

  const slots: PlayoffSlot[] = [];

  if (format.playIn) {
    slots.push(...playInRound());
  }

  if (format.knockoutSize === 8) {
    slots.push(...quarterfinalBracket());
    slots.push(
      seedMatch(1, 4, 'Semifinale: Seed 1 / 8 vs Seed 4 / 5', 'semifinal'),
      seedMatch(2, 3, 'Semifinale: Seed 2 / 7 vs Seed 3 / 6', 'semifinal'),
      {
        home: seedSlot(1),
        away: seedSlot(2),
        phase: 'final',
        label: 'Finale',
      }
    );
  } else if (format.knockoutSize === 4) {
    slots.push(...semifinalAndFinalFour());
  }

  return slots;
}
