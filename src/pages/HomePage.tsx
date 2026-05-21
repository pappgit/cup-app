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
    <>
      <section className="hero" aria-label="Velkommen">
        <h1>Velkommen til {cup.name}!</h1>
        {content.heroSubtitle && <p className="hero-lead">{content.heroSubtitle}</p>}
        <HomeTeamPicker />
      </section>

      <FeaturedSponsorFrame sponsor={forsideSponsor} />

      <div className="card">
        <h2>Info til deltakere</h2>
        {content.participantInfo.trim() ? (
          <div className="participant-info">{content.participantInfo}</div>
        ) : (
          <p className="empty-state" style={{ padding: '1rem 0' }}>
            Informasjon kommer snart.
          </p>
        )}
      </div>
    </>
  );
}
