import { NavLink } from 'react-router-dom';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  cupName: string;
  isAdmin?: boolean;
}

const NAV = [
  { to: '/', end: true, label: 'Forside', icon: '⌂' },
  { to: '/kamper', label: 'Kamper', icon: '⚽' },
  { to: '/tabell', label: 'Tabell', icon: '📊' },
  { to: '/kiosk', label: 'Kiosk', icon: '🛒' },
  { to: '/admin', label: 'Admin', icon: '⚙', adminOnly: false },
] as const;

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
            <div className="sidebar-tagline">Innebandy cup</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item) => {
            const to = item.to === '/admin' ? (isAdmin ? '/admin' : '/admin/login') : item.to;
            return (
              <NavLink
                key={item.to}
                to={to}
                end={'end' in item ? item.end : false}
                onClick={onClose}
                className="sidebar-link"
              >
                <span className="sidebar-link-icon" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer">Tunet Innebandyklubb</div>
      </aside>
    </>
  );
}
