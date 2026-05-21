/** Korte hallkoder for kampkort og lister. */
const COURT_ABBREV: Record<string, string> = {
  Høyenhallen: 'HH',
  Brynseng: 'BRYN',
  Bekkelaget: 'EKE',
};

export function formatCourtAbbrev(court?: string | null): string | null {
  if (!court) return null;
  return COURT_ABBREV[court] ?? court.slice(0, 4).toUpperCase();
}

export function formatCourtTitle(court?: string | null): string | undefined {
  if (!court) return undefined;
  const abbrev = formatCourtAbbrev(court);
  if (abbrev && abbrev !== court) return `${abbrev} – ${court}`;
  return court;
}
