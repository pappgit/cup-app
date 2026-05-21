import { useRef, useState } from 'react';
import { useCup } from '../../hooks/useCup';
import { normalizePageContent } from '../../lib/pageContent';
import { DEFAULT_PAGE_CONTENT } from '../../types';
import type { PageContent } from '../../types';

export function AdminHomePage() {
  const { cup, update } = useCup();
  const infoRef = useRef<HTMLTextAreaElement>(null);
  const [msg, setMsg] = useState('');

  const content = normalizePageContent(cup.pageContent ?? DEFAULT_PAGE_CONTENT);

  const save = async (patch: Partial<PageContent>) => {
    const next = normalizePageContent({ ...content, ...patch });
    await update({ pageContent: next });
    setMsg('Lagret!');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <>
      <h1 className="page-title" style={{ marginBottom: '1rem' }}>
        Rediger forside
      </h1>

      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2>Velkomsttekst</h2>
        <div className="form-group">
          <label>Kort tekst under «Velkommen til …»</label>
          <input
            type="text"
            defaultValue={content.heroSubtitle}
            onBlur={(e) => {
              if (e.target.value !== content.heroSubtitle) {
                save({ heroSubtitle: e.target.value });
              }
            }}
          />
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--grey-600)', marginTop: '0.5rem' }}>
          Sponsor på forsiden redigeres under Admin → Sponsorer (plassering: Forside).
        </p>
      </div>

      <div className="card">
        <h2>Info til deltakere og spillere</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--grey-600)', marginBottom: '0.75rem' }}>
          Vises på forsiden under sponsor. Bruk tom linje mellom avsnitt.
        </p>
        <div className="form-group">
          <textarea
            ref={infoRef}
            rows={12}
            defaultValue={content.participantInfo}
            onBlur={(e) => {
              if (e.target.value !== content.participantInfo) {
                save({ participantInfo: e.target.value });
              }
            }}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const text = infoRef.current?.value ?? content.participantInfo;
            if (text !== content.participantInfo) {
              save({ participantInfo: text });
            }
          }}
        >
          Lagre info-tekst
        </button>
      </div>
    </>
  );
}
