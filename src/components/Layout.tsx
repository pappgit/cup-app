import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ClubLogo } from './ClubLogo';
import { useCup } from '../hooks/useCup';
import { useAuth } from '../hooks/useAuth';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Forside',
  '/kamper': 'Kamper',
  '/tabell': 'Tabell',
  '/kiosk': 'Kiosk',
};

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { cup, error: cupError } = useCup();
  const { isAdmin } = useAuth();
  const { pathname } = useLocation();
  const pageTitle =
    pathname.startsWith('/admin') ? 'Admin' : PAGE_TITLES[pathname] ?? cup.name;

  return (
    <div className="app-shell">
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        cupName={cup.name}
        isAdmin={isAdmin}
        sponsors={cup.sponsors}
        pageContent={cup.pageContent}
        showStandings={Boolean(cup.scheduleParams?.seriesPlay)}
      />
      <main className={`main-content ${menuOpen ? 'menu-open' : ''}`}>
        <header className="top-bar">
          <button
            type="button"
            className="menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Åpne meny"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <div className="top-bar-brand">
            <ClubLogo pageContent={cup.pageContent} className="top-bar-logo" alt="" />
            <div className="top-bar-text">
              <span className="top-bar-cup">{cup.name}</span>
              <span className="top-bar-page">{pageTitle}</span>
            </div>
          </div>
        </header>

        {cupError && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {cupError}
          </div>
        )}

        <div className="page-container">
          <Outlet context={{ menuOpen, setMenuOpen }} />
        </div>
      </main>
    </div>
  );
}
