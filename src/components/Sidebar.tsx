import { NavLink } from 'react-router-dom';
import { normalizePageContent } from '../lib/pageContent';
import { normalizeNavItems } from '../lib/navConfig';
import { DEFAULT_PAGE_CONTENT } from '../types';
import { SidebarSponsor } from './SidebarSponsor';
import type { Sponsor } from '../types';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  cupName: string;
  isAdmin?: boolean;
  sponsors: Sponsor[];
  pageContent?: typeof DEFAULT_PAGE_CONTENT;
  /** Tabell kun ved sluttspill (seriesPlay ja) */
  showStandings?: boolean;
}

export function Sidebar({
  open,
  onClose,
  cupName,
  isAdmin,
  sponsors,
  pageContent,
  showStandings = false,
}: SidebarProps) {
  const base = import.meta.env.BASE_URL;
  const content = normalizePageContent(pageContent ?? DEFAULT_PAGE_CONTENT);
  const navItems = normalizeNavItems(content.navItems).filter(
    (item) => item.path !== '/tabell' || showStandings
  );

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
          {navItems.map((item) => {
            const to =
              item.path === '/admin' ? (isAdmin ? '/admin' : '/admin/login') : item.path;
            return (
              <NavLink
                key={item.path}
                to={to}
                end={item.path === '/'}
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
        <SidebarSponsor sponsors={sponsors} />
        <div className="sidebar-footer">Tunet Innebandyklubb</div>
      </aside>
    </>
  );
}
