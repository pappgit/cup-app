import { useCupMatchDisplay } from './useCupMatchDisplay';

/** Kamper med sluttspill-lag oppdatert når gruppespill er ferdig. */
export function useCupMatches() {
  return useCupMatchDisplay().matches;
}
