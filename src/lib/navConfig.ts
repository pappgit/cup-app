import type { NavItemConfig } from '../types';
import { DEFAULT_NAV_ITEMS } from '../types';

export function normalizeNavItems(raw: NavItemConfig[] | null | undefined): NavItemConfig[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_NAV_ITEMS];

  const byPath = new Map(DEFAULT_NAV_ITEMS.map((n) => [n.path, n]));

  return DEFAULT_NAV_ITEMS.map((def) => {
    const found = raw.find((r) => r.path === def.path);
    if (!found) return { ...def };
    return {
      path: def.path,
      label: found.label?.trim() || def.label,
      icon: found.icon?.trim() || def.icon,
      adminOnly: def.adminOnly,
    };
  });
}
