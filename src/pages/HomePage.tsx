import { Link } from 'react-router-dom';
import { FeaturedSponsorFrame } from '../components/FeaturedSponsorFrame';
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
      <section className="hero">
        <h1>Velkommen til {cup.name}!</h1>
        {content.heroSubtitle && <p>{content.heroSubtitle}</p>}
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

      <nav className="home-quick-links" aria-label="Snarveier">
        <Link to="/kamper" className="home-quick-link">
          <span className="home-quick-link-title">Kamper</span>
          <span className="home-quick-link-desc">Kamprogram og resultater</span>
        </Link>
        <Link to="/tabell" className="home-quick-link">
          <span className="home-quick-link-title">Tabell</span>
          <span className="home-quick-link-desc">Gruppespill og poeng</span>
        </Link>
        <Link to="/kiosk" className="home-quick-link">
          <span className="home-quick-link-title">Kiosk</span>
          <span className="home-quick-link-desc">Mat og drikke</span>
        </Link>
      </nav>
    </>
  );
}
