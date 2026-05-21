import { sponsorForPlacement } from '../lib/sponsors';
import type { Sponsor } from '../types';
import { SponsorLogo } from './SponsorLogo';

export function SidebarSponsor({ sponsors }: { sponsors: Sponsor[] }) {
  const sponsor = sponsorForPlacement(sponsors, 'meny');
  if (!sponsor?.logoUrl) return null;

  return (
    <div className="sidebar-sponsor" aria-label={`Sponsor: ${sponsor.name}`}>
      <div className="sponsor-logo-slot sponsor-logo-slot--sidebar">
        <SponsorLogo src={sponsor.logoUrl} alt={sponsor.name} variant="sidebar" />
      </div>
    </div>
  );
}
