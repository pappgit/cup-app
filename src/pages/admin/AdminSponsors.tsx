import { useRef, useState } from 'react';
import { useCup } from '../../hooks/useCup';
import { uploadSponsorLogo, deleteSponsorLogo, persistCup } from '../../lib/cupApi';

function newId() {
  return crypto.randomUUID();
}

export function AdminSponsors() {
  const { cup, cupId, update } = useCup();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMsg('');
    try {
      const id = newId();
      const name = file.name.replace(/\.[^.]+$/, '');
      const effectiveCupId = cupId || (await persistCup(cup));
      const logoUrl = await uploadSponsorLogo(effectiveCupId, id, file);
      await update({
        sponsors: [...cup.sponsors, { id, name, logoUrl }],
      });
      setMsg('Logo lastet opp!');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Opplasting feilet');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const remove = async (id: string) => {
    if (cupId) {
      try {
        await deleteSponsorLogo(cupId, id);
      } catch {
        /* ignore storage cleanup errors */
      }
    }
    await update({ sponsors: cup.sponsors.filter((s) => s.id !== id) });
  };

  return (
    <>
      {msg && (
        <div className={`alert ${msg.includes('feilet') ? 'alert-error' : 'alert-success'}`}>
          {msg}
        </div>
      )}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Last opp sponsorlogo</h2>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Laster opp …' : 'Velg bilde'}
        </button>
        <p style={{ fontSize: '0.85rem', color: 'var(--grey-600)', marginTop: '0.75rem' }}>
          Lagres i Supabase Storage. Logoene vises på forsiden og i kiosken.
        </p>
      </div>

      <div className="card">
        <h2>Sponsorer ({cup.sponsors.length})</h2>
        {cup.sponsors.length === 0 ? (
          <p className="empty-state">Ingen logoer lastet opp.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {cup.sponsors.map((s) => (
              <div
                key={s.id}
                style={{
                  border: '1px solid var(--grey-200)',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center',
                }}
              >
                <img
                  src={s.logoUrl}
                  alt={s.name}
                  style={{ maxHeight: 60, maxWidth: 120, margin: '0 auto 0.5rem' }}
                />
                <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>{s.name}</div>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => remove(s.id)}
                >
                  Slett
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
