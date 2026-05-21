import { FeaturedSponsorFrame } from '../components/FeaturedSponsorFrame';
import { HomeTeamPicker } from '../components/HomeTeamPicker';
import { useCup } from '../hooks/useCup';
import { normalizePageContent } from '../lib/pageContent';
import { sponsorForPlacement } from '../lib/sponsors';
import { DEFAULT_PAGE_CONTENT } from '../types';

export function HomePage() {
  const { cup } = useCup();
  const content = normalizePageContent(cup.pageContent ?? DEFAULT_PAGE_CONTENT);
  const forsideSponsor = sponsorForPlacement(cup.sponsors, 'forside');

  return (
    <div className="page-stack">
      <section className="hero" aria-label="Velkommen">
        <h1>Velkommen til {cup.name}!</h1>
        {content.heroSubtitle && <p className="hero-lead">{content.heroSubtitle}</p>}
        <HomeTeamPicker />
      </section>

      <FeaturedSponsorFrame sponsor={forsideSponsor} />

      <div className="card">
        <h2>Info til deltakere</h2>
        <p className="card-lead">Praktisk informasjon for spillere og foreldre.</p>
        {content.participantInfo.trim() ? (
          <div className="participant-info">{content.participantInfo}</div>
        ) : (
          <p className="empty-state" style={{ margin: 0 }}>
            Informasjon kommer snart.
          </p>
        )}
      </div>
    </div>
  );
}
