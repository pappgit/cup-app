import type { Sponsor } from '../types';

export function SponsorStrip({ sponsors }: { sponsors: Sponsor[] }) {
  if (sponsors.length === 0) return null;

  return (
    <section className="sponsor-strip" aria-label="Sponsorer">
      {sponsors.map((s) => (
        <img
          key={s.id}
          src={s.logoUrl}
          alt={s.name}
          className="sponsor-logo"
          title={s.name}
        />
      ))}
    </section>
  );
}
