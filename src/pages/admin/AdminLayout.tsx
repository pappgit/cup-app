import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCup } from '../../hooks/useCup';

const ADMIN_NAV = [
  { to: '/admin', end: true, label: 'Oversikt' },
  { to: '/admin/forside', label: 'Forside' },
  { to: '/admin/lag', label: 'Lag' },
  { to: '/admin/kamper', label: 'Kamprogram' },
  { to: '/admin/resultater', label: 'Resultater' },
  { to: '/admin/kiosk', label: 'Kiosk' },
  { to: '/admin/sponsorer', label: 'Sponsorer' },
  { to: '/admin/utseende', label: 'Utseende' },
  { to: '/admin/innstillinger', label: 'Innstillinger' },
] as const;

export function AdminLayout() {
  const { isAdmin, loading, signOut } = useAuth();
  const { cup } = useCup();

  if (loading) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon" aria-hidden>
          …
        </span>
        Sjekker innlogging …
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  const logout = async () => {
    await signOut();
    window.location.href = import.meta.env.BASE_URL;
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="admin-header-title">Admin</h1>
        <p className="admin-header-meta">{cup.name}</p>
      </header>

      <div className="admin-nav-wrap">
        <nav className="admin-nav" aria-label="Admin-meny">
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className="admin-nav-item"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="admin-content">
        <Outlet />
      </div>

      <footer className="admin-footer">
        <button type="button" className="btn btn-outline btn-sm" onClick={logout}>
          Logg ut
        </button>
      </footer>
    </div>
  );
}
