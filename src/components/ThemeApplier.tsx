import { useEffect } from 'react';
import { useCup } from '../hooks/useCup';
import { normalizePageContent } from '../lib/pageContent';
import { applyTheme } from '../lib/theme';
import { DEFAULT_PAGE_CONTENT } from '../types';

export function ThemeApplier() {
  const { cup } = useCup();
  const theme = normalizePageContent(cup.pageContent ?? DEFAULT_PAGE_CONTENT).theme;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return null;
}
