import { useRef, useState } from 'react';
import { useCup } from '../../hooks/useCup';
import { persistCup } from '../../lib/cupApi';
import type { CupData } from '../../types';

export function AdminSettings() {
  const { cup, cupId, refresh } = useCup();
  const [msg, setMsg] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(cup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tunet-cup-data.json';
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Data eksportert!');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result as string) as CupData;
        await persistCup(data, cupId || undefined);
        await refresh();
        setMsg('Data importert til Supabase!');
        window.location.reload();
      } catch {
        setMsg('Kunne ikke importere — ugyldig fil eller mangler tilgang');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Backup</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--grey-600)' }}>
          Cup-data lagres i Supabase og synkroniseres live til alle besøkende. Eksporter JSON
          som sikkerhetskopi.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={handleExport}>
            Eksporter data
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => importRef.current?.click()}
          >
            Importer data
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Supabase admin-bruker</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--grey-600)', lineHeight: 1.6 }}>
          Opprett admin-bruker under Supabase Dashboard → Authentication → Users → Add user.
          Bruk e-post og passord ved innlogging. Kun innloggede brukere kan endre cup-data (RLS).
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--grey-600)', marginTop: '1rem' }}>
          Kjør SQL fra <code>supabase/migrations/001_initial.sql</code> i SQL Editor før første
          bruk. Aktiver Realtime på tabellene om live-oppdatering ikke fungerer.
        </p>
      </div>
    </>
  );
}
