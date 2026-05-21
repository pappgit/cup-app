import { normalizeNavItems } from './navConfig';
import { normalizeTheme } from './theme';
import type { PageContent } from '../types';
import { DEFAULT_PAGE_CONTENT } from '../types';

export function resolveAssetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const clean = path.replace(/^\//, '');
  return `${base}${clean}`;
}

export function normalizePageContent(raw: PageContent | null | undefined): PageContent {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PAGE_CONTENT, navItems: [...DEFAULT_PAGE_CONTENT.navItems] };
  }

  return {
    heroSubtitle:
      typeof raw.heroSubtitle === 'string'
        ? raw.heroSubtitle
        : DEFAULT_PAGE_CONTENT.heroSubtitle,
    participantInfo:
      typeof raw.participantInfo === 'string'
        ? raw.participantInfo
        : DEFAULT_PAGE_CONTENT.participantInfo,
    navItems: normalizeNavItems(raw.navItems),
    theme: normalizeTheme(raw.theme),
  };
}
