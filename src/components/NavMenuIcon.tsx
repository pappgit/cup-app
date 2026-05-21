import { resolveAssetUrl } from '../lib/pageContent';
import type { NavItemConfig } from '../types';

interface NavMenuIconProps {
  item: NavItemConfig;
  className?: string;
}

export function NavMenuIcon({ item, className }: NavMenuIconProps) {
  if (item.iconUrl) {
    return (
      <img
        src={resolveAssetUrl(item.iconUrl)}
        alt=""
        className={className}
      />
    );
  }
  return (
    <span className={className} aria-hidden>
      {item.icon}
    </span>
  );
}
