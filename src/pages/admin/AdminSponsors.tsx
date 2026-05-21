import { useRef, useState } from 'react';
import { useCup } from '../../hooks/useCup';
import { uploadSponsorLogo, deleteSponsorLogo, persistCup } from '../../lib/cupApi';
import { SPONSOR_PLACEMENTS, normalizeSponsor } from '../../lib/sponsors';
import { SponsorLogo } from '../../components/SponsorLogo';
import type { Sponsor, SponsorPlacement } from '../../types';

function newId() {
  return crypto.randomUUID();
}

export function AdminSponsors() {
  const { cup, cupId, update } = useCup();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [placement, setPlacement] = useState<SponsorPlacement>('forside');
  const [slogan, setSlogan] = useState('Meny sponser cupen med matvarer.');
  const [name, setName] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMsg('');
    try {
      const id = newId();
      const sponsorName = name.trim() || file.name.replace(/\.[^.]+$/, '');
      const effectiveCupId = cupId || (await persistCup(cup));
      const logoUrl = await uploadSponsorLogo(effectiveCupId, id, file);

      const withoutPlacement = cup.sponsors.filter((s) => s.placement !== placement);
      const newSponsor = normalizeSponsor({
        id,
        name: sponsorName,
        logoUrl,
        placement,
        slogan: placement === 'forside' ? slogan.trim() || undefined : undefined,
      });

      await update({ sponsors: [...withoutPlacement, newSponsor] });
      setMsg(`Logo lagret for plassering: ${SPONSOR_PLACEMENTS.find((p) => p.value === placement)?.label}`);
      setName('');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Opplasting feilet');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const updateSponsor = async (id: string, patch: Partial<Sponsor>) => {
    await update({
      sponsors: cup.sponsors.map((s) =>
        s.id === id ? normalizeSponsor({ ...s, ...patch }) : s
      ),
    });
    setMsg('Lagret!');
    setTimeout(() => setMsg(''), 2500);
  };

  const remove = async (id: string) => {
    const sponsor = cup.sponsors.find((s) => s.id === id);
    if (cupId && sponsor) {
      try {
        await deleteSponsorLogo(cupId, id);
      } catch {
        /* ignore */
      }
    }
    await update({ sponsors: cup.sponsors.filter((s) => s.id !== id) });
  };

  const grouped = SPONSOR_PLACEMENTS.map((p) => ({
    ...p,
    items: cup.sponsors.filter((s) => s.placement === p.value),
  }));

  return (
    <>
      {msg && (
        <div className={`alert ${msg.includes('feilet') ? 'alert-error' : 'alert-success'}`}>
          {msg}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Last opp sponsorlogo</h2>
        <div className="form-row cols-2">
          <div className="form-group">
            <label>Plassering</label>
            <select
              value={placement}
              onChange={(e) => setPlacement(e.target.value as SponsorPlacement)}
            >
              {SPONSOR_PLACEMENTS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Navn (valgfritt)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="f.eks. Meny"
            />
          </div>
        </div>
        {placement === 'forside' && (
          <div className="form-group">
            <label>Slogan (kun Forside)</label>
            <input
              type="text"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="Meny sponser cupen med matvarer."
            />
          </div>
        )}
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
          <strong>Forside</strong> – ramme under velkomsttekst. <strong>Meny</strong> – lilla felt
          i sidemenyen. <strong>Kiosk</strong> – nederst på kiosksiden. Logo skaleres automatisk
          til rammen. Ny logo på samme plassering erstatter forrige.
        </p>
      </div>

      {grouped.map(({ value, label, items }) => (
        <div key={value} className="card" style={{ marginBottom: '1.25rem' }}>
          <h2>
            Plassering: {label}{' '}
            <span style={{ fontWeight: 400, fontSize: '0.9rem', color: 'var(--grey-600)' }}>
              ({items.length})
            </span>
          </h2>
          {items.length === 0 ? (
            <p className="empty-state">Ingen logo for denne plasseringen.</p>
          ) : (
            <div className="sponsor-admin-grid">
              {items.map((s) => (
                <div key={s.id} className="sponsor-admin-card">
                  <div
                    className={`sponsor-logo-slot sponsor-logo-slot--${value === 'forside' ? 'forside' : value === 'meny' ? 'sidebar' : 'strip'}`}
                  >
                    <SponsorLogo src={s.logoUrl} alt={s.name} variant={value === 'forside' ? 'frame' : value === 'meny' ? 'sidebar' : 'strip'} />
                  </div>
                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label>Navn</label>
                    <input
                      type="text"
                      defaultValue={s.name}
                      onBlur={(e) => {
                        if (e.target.value !== s.name) {
                          updateSponsor(s.id, { name: e.target.value });
                        }
                      }}
                    />
                  </div>
                  {s.placement === 'forside' && (
                    <div className="form-group">
                      <label>Slogan</label>
                      <input
                        type="text"
                        defaultValue={s.slogan ?? ''}
                        onBlur={(e) => {
                          if (e.target.value !== (s.slogan ?? '')) {
                            updateSponsor(s.id, { slogan: e.target.value });
                          }
                        }}
                      />
                    </div>
                  )}
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
      ))}
    </>
  );
}
