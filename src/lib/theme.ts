import type { AppTheme } from '../types';
import { DEFAULT_THEME } from '../types';

const VARS: (keyof AppTheme)[] = [
  'purple',
  'purpleDark',
  'purpleLight',
  'yellow',
  'yellowDark',
];

const CSS_MAP: Record<keyof AppTheme, string> = {
  purple: '--purple',
  purpleDark: '--purple-dark',
  purpleLight: '--purple-light',
  yellow: '--yellow',
  yellowDark: '--yellow-dark',
};

export function normalizeTheme(raw: Partial<AppTheme> | null | undefined): AppTheme {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_THEME };
  return {
    purple: raw.purple ?? DEFAULT_THEME.purple,
    purpleDark: raw.purpleDark ?? DEFAULT_THEME.purpleDark,
    purpleLight: raw.purpleLight ?? DEFAULT_THEME.purpleLight,
    yellow: raw.yellow ?? DEFAULT_THEME.yellow,
    yellowDark: raw.yellowDark ?? DEFAULT_THEME.yellowDark,
  };
}

export function applyTheme(theme: AppTheme): void {
  const root = document.documentElement;
  for (const key of VARS) {
    root.style.setProperty(CSS_MAP[key], theme[key]);
  }
  root.style.setProperty('--purple-muted', theme.purpleLight);
  root.style.setProperty('--yellow-soft', hexWithAlpha(theme.yellow, 0.15));
}

function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(249, 220, 0, ${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
