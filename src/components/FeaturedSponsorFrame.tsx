import type { Sponsor } from '../types';
import { SponsorLogo } from './SponsorLogo';

interface FeaturedSponsorFrameProps {
  sponsor: Sponsor | undefined;
}

export function FeaturedSponsorFrame({ sponsor }: FeaturedSponsorFrameProps) {
  if (!sponsor?.logoUrl) return null;

  return (
    <section className="featured-sponsor" aria-label={`Sponsor: ${sponsor.name}`}>
      <div className="featured-sponsor-frame">
        <div className="sponsor-logo-slot sponsor-logo-slot--forside">
          <SponsorLogo src={sponsor.logoUrl} alt={sponsor.name} variant="frame" />
        </div>
        {sponsor.slogan && <p className="featured-sponsor-slogan">{sponsor.slogan}</p>}
      </div>
    </section>
  );
}
