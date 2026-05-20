import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function AdminLayout() {
  const { isAdmin, loading, signOut } = useAuth();

  if (loading) {
    return <div className="empty-state">Sjekker innlogging …</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  const logout = async () => {
    await signOut();
    window.location.href = import.meta.env.BASE_URL;
  };

  return (
    <>
      <h1 className="page-title">Admin</h1>
      <nav className="admin-nav-tabs">
        <NavLink to="/admin" end>
          Oversikt
        </NavLink>
        <NavLink to="/admin/lag">Lag</NavLink>
        <NavLink to="/admin/kamper">Kamprogram</NavLink>
        <NavLink to="/admin/kiosk">Kiosk</NavLink>
        <NavLink to="/admin/sponsorer">Sponsorer</NavLink>
        <NavLink to="/admin/innstillinger">Innstillinger</NavLink>
      </nav>
      <Outlet />
      <div style={{ marginTop: '2rem' }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={logout}>
          Logg ut
        </button>
      </div>
    </>
  );
}
