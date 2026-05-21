import type { Sponsor, SponsorPlacement } from '../types';

export const SPONSOR_PLACEMENTS: { value: SponsorPlacement; label: string }[] = [
  { value: 'forside', label: 'Forside' },
  { value: 'meny', label: 'Meny' },
  { value: 'kiosk', label: 'Kiosk' },
];

export function normalizePlacement(raw: string | null | undefined): SponsorPlacement {
  if (raw === 'forside' || raw === 'meny' || raw === 'kiosk') return raw;
  return 'kiosk';
}

export function normalizeSponsor(raw: Partial<Sponsor> & { logoUrl?: string }): Sponsor {
  return {
    id: raw.id ?? crypto.randomUUID(),
    name: raw.name ?? 'Sponsor',
    logoUrl: raw.logoUrl ?? '',
    placement: normalizePlacement(raw.placement),
    slogan: raw.slogan ?? undefined,
  };
}

export function sponsorsForPlacement(
  sponsors: Sponsor[],
  placement: SponsorPlacement
): Sponsor[] {
  return sponsors.filter((s) => s.placement === placement);
}

export function sponsorForPlacement(
  sponsors: Sponsor[],
  placement: SponsorPlacement
): Sponsor | undefined {
  return sponsorsForPlacement(sponsors, placement)[0];
}
