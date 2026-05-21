import { useEffect, useState, type ReactNode } from 'react';
import { ThemeApplier } from './ThemeApplier';
import { useCup } from '../hooks/useCup';
import { getSupabaseConfigStatus } from '../lib/supabase';

export function CupLoader({ children }: { children: ReactNode }) {
  const { loading, error, refresh } = useCup();
  const config = getSupabaseConfigStatus();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 8_000);
    return () => clearTimeout(t);
  }, [loading]);

  if (!config.ok) {
    return (
      <div className="card" style={{ margin: '2rem 0' }}>
        <h2>Supabase ikke konfigurert</h2>
        <p>{config.message}</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--grey-600)', marginTop: '0.75rem' }}>
          GitHub Pages: sjekk at <code>VITE_SUPABASE_URL</code> og publishable/anon key ligger i
          repo Secrets, deretter kjør deploy på nytt.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="empty-state" style={{ padding: '3rem' }}>
        Laster cup-data …
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" style={{ margin: '1rem 0' }}>
        {error}
      </div>
    );
  }

  return (
    <>
      <ThemeApplier />
      {children}
    </>
  );
}
