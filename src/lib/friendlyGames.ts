import type { MatchPhase, Team } from '../types';

export const FRIENDLY_BYE_ID = '__bye__';

export interface FriendlyPairing {
  home: string;
  away: string;
  phase: MatchPhase;
  round: number;
}

/** Maks unike motstandere (ingen rematch). */
export function maxFriendlyGamesPerTeam(teamCount: number): number {
  if (teamCount < 2) return 0;
  return teamCount - 1;
}

/** Matematisk gyldig vennskapsoppsett (2–16 lag, 1–8 kamper per lag). */
export function validateFriendlyTournament(
  teamCount: number,
  gamesPerTeam: number
): boolean {
  if (teamCount < 2 || teamCount > 16) return false;
  if (gamesPerTeam < 1 || gamesPerTeam > 8) return false;
  if (gamesPerTeam >= teamCount) return false;
  if ((teamCount * gamesPerTeam) % 2 !== 0) return false;
  return true;
}

/** Alle gyldige antall kamper per lag for gitt lagtall. */
export function listValidFriendlyGamesPerTeam(teamCount: number): number[] {
  const max = Math.min(8, maxFriendlyGamesPerTeam(teamCount));
  const out: number[] = [];
  for (let g = 1; g <= max; g++) {
    if (validateFriendlyTournament(teamCount, g)) out.push(g);
  }
  return out;
}

/** Foreslå nærmeste gyldige alternativ(er). */
export function suggestNearestValidGamesPerTeam(
  teamCount: number,
  desired: number
): number[] {
  const valid = listValidFriendlyGamesPerTeam(teamCount);
  if (valid.length === 0) return [];

  const dist = (g: number) => Math.abs(g - desired);
  const minDist = Math.min(...valid.map(dist));
  return valid.filter((g) => dist(g) === minDist).sort((a, b) => a - b);
}

export function friendlyValidationMessage(
  teamCount: number,
  gamesPerTeam: number
): string | null {
  if (validateFriendlyTournament(teamCount, gamesPerTeam)) return null;

  if (teamCount < 2) {
    return 'Legg inn minst 2 lag.';
  }
  if (teamCount > 16) {
    return 'Vennskapsmodus støtter maks 16 lag.';
  }
  if (gamesPerTeam >= teamCount) {
    const max = maxFriendlyGamesPerTeam(teamCount);
    return `Med ${teamCount} lag kan hvert lag maks få ${max} kamper mot unike motstandere (alle møter alle).`;
  }
  if ((teamCount * gamesPerTeam) % 2 !== 0) {
    const hints = suggestNearestValidGamesPerTeam(teamCount, gamesPerTeam);
    const hint =
      hints.length > 0
        ? ` Prøv ${hints.join(' eller ')} kamper per lag.`
        : '';
    return (
      `Med ${teamCount} lag og ${gamesPerTeam} kamper per lag blir totalen et oddetall — det går ikke.${hint}`
    );
  }
  return 'Ugyldig oppsett for vennskapskamper.';
}

/**
 * Vennskapskamper via circle method (round robin).
 * Første N runder gir N kamper per lag, ingen duplikatmotstandere.
 */
export function generateFriendlySchedule(
  teams: Team[],
  gamesPerTeam: number
): FriendlyPairing[] {
  const teamCount = teams.length;
  const invalid = friendlyValidationMessage(teamCount, gamesPerTeam);
  if (invalid) {
    throw new Error(invalid);
  }

  if (teamCount === 2) {
    const [a, b] = teams;
    return [{ home: a.id, away: b.id, phase: 'friendly', round: 1 }];
  }

  const slots: { id: string }[] = teams.map((t) => ({ id: t.id }));
  if (slots.length % 2 === 1) {
    slots.push({ id: FRIENDLY_BYE_ID });
  }

  const matches: FriendlyPairing[] = [];

  for (let round = 0; round < gamesPerTeam; round++) {
    for (let i = 0; i < slots.length / 2; i++) {
      const left = slots[i];
      const right = slots[slots.length - 1 - i];
      if (left.id === FRIENDLY_BYE_ID || right.id === FRIENDLY_BYE_ID) continue;

      const swapSides = round % 2 === 1;
      matches.push({
        home: swapSides ? right.id : left.id,
        away: swapSides ? left.id : right.id,
        phase: 'friendly',
        round: round + 1,
      });
    }

    const fixed = slots[0];
    const rotating = slots.slice(1);
    const last = rotating.pop()!;
    rotating.unshift(last);
    slots.length = 0;
    slots.push(fixed, ...rotating);
  }

  return matches;
}
