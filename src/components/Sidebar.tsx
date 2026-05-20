import { NavLink } from 'react-router-dom';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  cupName: string;
  isAdmin?: boolean;
}

export function Sidebar({ open, onClose, cupName, isAdmin }: SidebarProps) {
  const base = import.meta.env.BASE_URL;

  return (
    <>
      <div
        className={`sidebar-overlay ${open ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Hovedmeny">
        <div className="sidebar-header">
          <img src={`${base}tunet-logo.png`} alt="Tunet" className="sidebar-logo" />
          <div>
            <div className="sidebar-title">{cupName}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Innebandy cup</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end onClick={onClose}>
            Forside
          </NavLink>
          <NavLink to="/kamper" onClick={onClose}>
            Kamper
          </NavLink>
          <NavLink to="/tabell" onClick={onClose}>
            Tabell
          </NavLink>
          <NavLink to="/kiosk" onClick={onClose}>
            Kiosk
          </NavLink>
          <NavLink to={isAdmin ? '/admin' : '/admin/login'} onClick={onClose}>
            Admin
          </NavLink>
        </nav>
        <div className="sidebar-footer">Tunet Innebandyklubb</div>
      </aside>
    </>
  );
}
