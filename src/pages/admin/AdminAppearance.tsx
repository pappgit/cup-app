import { useRef, useState } from 'react';
import { useCup } from '../../hooks/useCup';
import { uploadSidebarLogo, persistCup } from '../../lib/cupApi';
import { getSidebarLogoUrl, normalizePageContent } from '../../lib/pageContent';
import { normalizeNavItems } from '../../lib/navConfig';
import { applyTheme, normalizeTheme } from '../../lib/theme';
import {
  DEFAULT_NAV_ITEMS,
  DEFAULT_PAGE_CONTENT,
  DEFAULT_SIDEBAR_LOGO,
  DEFAULT_THEME,
} from '../../types';
import { ClubLogo } from '../../components/ClubLogo';
import type { AppTheme, NavItemConfig, PageContent } from '../../types';

export function AdminAppearance() {
  const { cup, cupId, update } = useCup();
  const content = normalizePageContent(cup.pageContent ?? DEFAULT_PAGE_CONTENT);
  const logoRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [msg, setMsg] = useState('');
  const [navDraft, setNavDraft] = useState<NavItemConfig[]>(content.navItems);
  const [themeDraft, setThemeDraft] = useState<AppTheme>(content.theme);

  const save = async (patch: Partial<PageContent>) => {
    const next = normalizePageContent({ ...content, ...patch });
    await update({ pageContent: next });
    if (patch.theme) applyTheme(next.theme);
    setMsg('Lagret!');
    setTimeout(() => setMsg(''), 3000);
  };

  const saveNav = () => save({ navItems: normalizeNavItems(navDraft) });
  const saveTheme = () => save({ theme: normalizeTheme(themeDraft) });

  const resetTheme = () => {
    setThemeDraft({ ...DEFAULT_THEME });
    applyTheme(DEFAULT_THEME);
  };

  const resetNav = () => setNavDraft([...DEFAULT_NAV_ITEMS]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setMsg('');
    try {
      const effectiveCupId = cupId || (await persistCup(cup));
      const logoUrl = await uploadSidebarLogo(effectiveCupId, file);
      await save({ sidebarLogoUrl: logoUrl });
      setMsg('Logo oppdatert!');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Opplasting feilet');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const resetLogo = () => save({ sidebarLogoUrl: DEFAULT_SIDEBAR_LOGO });

  return (
    <>
      <h1 className="page-title" style={{ marginBottom: '1rem' }}>
        Utseende
      </h1>

      {msg && (
        <div
          className={`alert ${
            msg.includes('feilet') ? 'alert-error' : 'alert-success'
          }`}
        >
          {msg}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2>Logo i sidemeny</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--grey-600)', marginBottom: '1rem' }}>
          Vises øverst i sidemenyen og i topplinjen. Logo skaleres automatisk til å passe i rammen.
        </p>
        <div className="logo-upload-preview">
          <div className="logo-upload-preview-sidebar">
            <ClubLogo pageContent={content} className="sidebar-logo" alt="Forhåndsvisning" />
            <span className="logo-upload-preview-label">Slik i menyen</span>
          </div>
          <img
            src={getSidebarLogoUrl(content)}
            alt=""
            className="logo-upload-preview-large"
          />
        </div>
        <input
          ref={logoRef}
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          style={{ display: 'none' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => logoRef.current?.click()}
            disabled={uploadingLogo}
          >
            {uploadingLogo ? 'Laster opp …' : 'Last opp ny logo'}
          </button>
          {content.sidebarLogoUrl !== DEFAULT_SIDEBAR_LOGO && (
            <button type="button" className="btn btn-outline btn-sm" onClick={resetLogo}>
              Bruk standard Tunet-logo
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2>Menyikoner</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--grey-600)', marginBottom: '1rem' }}>
          Velg emoji eller kort symbol for hvert menypunkt i sidemenyen.
        </p>
        <div className="nav-icons-editor">
          {navDraft.map((item, i) => (
            <div key={item.path} className="nav-icon-row">
              <span className="nav-icon-preview" aria-hidden>
                {item.icon || DEFAULT_NAV_ITEMS[i]?.icon}
              </span>
              <div className="nav-icon-fields">
                <strong>{item.label}</strong>
                <span className="nav-icon-path">{item.path}</span>
              </div>
              <input
                type="text"
                className="nav-icon-input"
                maxLength={4}
                value={item.icon}
                onChange={(e) => {
                  const next = [...navDraft];
                  next[i] = { ...item, icon: e.target.value };
                  setNavDraft(next);
                }}
                aria-label={`Ikon for ${item.label}`}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={saveNav}>
            Lagre ikoner
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={resetNav}>
            Tilbakestill ikoner
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Farger</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--grey-600)', marginBottom: '1rem' }}>
          Tilpass fargepaletten – nyttig hvis andre klubber bruker appen.
        </p>
        <div className="theme-editor">
          {(Object.keys(DEFAULT_THEME) as (keyof AppTheme)[]).map((key) => (
            <div key={key} className="theme-color-row">
              <label htmlFor={`theme-${key}`}>{themeLabel(key)}</label>
              <input
                id={`theme-${key}`}
                type="color"
                value={themeDraft[key]}
                onChange={(e) =>
                  setThemeDraft((t) => ({ ...t, [key]: e.target.value }))
                }
              />
              <input
                type="text"
                value={themeDraft[key]}
                onChange={(e) =>
                  setThemeDraft((t) => ({ ...t, [key]: e.target.value }))
                }
                className="theme-hex-input"
              />
            </div>
          ))}
        </div>
        <div
          className="theme-preview"
          style={{
            background: `linear-gradient(135deg, ${themeDraft.purpleDark}, ${themeDraft.purple})`,
            borderColor: themeDraft.yellow,
          }}
        >
          <span style={{ color: themeDraft.yellow }}>Forhåndsvisning</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              applyTheme(themeDraft);
              saveTheme();
            }}
          >
            Lagre farger
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={resetTheme}>
            Tilbakestill Tunet-farger
          </button>
        </div>
      </div>
    </>
  );
}

function themeLabel(key: keyof AppTheme): string {
  const labels: Record<keyof AppTheme, string> = {
    purple: 'Hovedfarge',
    purpleDark: 'Mørk lilla',
    purpleLight: 'Lys lilla',
    yellow: 'Gul aksent',
    yellowDark: 'Mørk gul',
  };
  return labels[key];
}
