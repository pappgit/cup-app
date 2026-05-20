import type { ReactNode } from 'react';
import { useCup } from '../hooks/useCup';
import { isSupabaseConfigured } from '../lib/supabase';

export function CupLoader({ children }: { children: ReactNode }) {
  const { loading, error } = useCup();

  if (!isSupabaseConfigured) {
    return (
      <div className="card" style={{ margin: '2rem 0' }}>
        <h2>Supabase ikke konfigurert</h2>
        <p>
          Opprett <code>.env</code> med <code>VITE_SUPABASE_URL</code> og{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>. Se <code>.env.example</code> og README.
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

  return <>{children}</>;
}
