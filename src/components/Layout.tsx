import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useCup } from '../hooks/useCup';
import { useAuth } from '../hooks/useAuth';

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { cup, error: cupError } = useCup();
  const { isAdmin } = useAuth();

  return (
    <div className="app-shell">
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        cupName={cup.name}
        isAdmin={isAdmin}
      />
      <main className={`main-content ${menuOpen ? 'menu-open' : ''}`}>
        {cupError && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {cupError}
          </div>
        )}
        <div className="top-bar">
          <button
            type="button"
            className="menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Åpne meny"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <Outlet context={{ menuOpen, setMenuOpen }} />
      </main>
    </div>
  );
}
