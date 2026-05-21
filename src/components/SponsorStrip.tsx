import { sponsorsForPlacement } from '../lib/sponsors';
import type { Sponsor } from '../types';
import { SponsorLogo } from './SponsorLogo';

export function SponsorStrip({ sponsors }: { sponsors: Sponsor[] }) {
  const kiosk = sponsorsForPlacement(sponsors, 'kiosk');
  if (kiosk.length === 0) return null;

  return (
    <section className="sponsor-strip" aria-label="Sponsorer">
      {kiosk.map((s) => (
        <div key={s.id} className="sponsor-logo-slot sponsor-logo-slot--strip">
          <SponsorLogo src={s.logoUrl} alt={s.name} variant="strip" title={s.name} />
        </div>
      ))}
    </section>
  );
}
