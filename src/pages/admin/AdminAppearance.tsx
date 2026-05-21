import { useRef, useState } from 'react';
import { NavMenuIcon } from '../../components/NavMenuIcon';
import { ClubLogo } from '../../components/ClubLogo';
import { useCup } from '../../hooks/useCup';
import { uploadNavIcon, uploadSidebarLogo, persistCup } from '../../lib/cupApi';
import { getSidebarLogoUrl, normalizePageContent } from '../../lib/pageContent';
import { normalizeNavItems } from '../../lib/navConfig';
import { applyTheme, normalizeTheme } from '../../lib/theme';
import {
  DEFAULT_NAV_ITEMS,
  DEFAULT_PAGE_CONTENT,
  DEFAULT_SIDEBAR_LOGO,
  DEFAULT_THEME,
} from '../../types';
import type { AppTheme, NavItemConfig, PageContent } from '../../types';

export function AdminAppearance() {
  const { cup, cupId, update } = useCup();
  const content = normalizePageContent(cup.pageContent ?? DEFAULT_PAGE_CONTENT);
  const logoRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [msg, setMsg] = useState('');
  const [navDraft, setNavDraft] = useState<NavItemConfig[]>(content.navItems);
  const [uploadingNavPath, setUploadingNavPath] = useState<string | null>(null);
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

  const handleNavIconUpload = async (path: string, file: File) => {
    setUploadingNavPath(path);
    setMsg('');
    try {
      const effectiveCupId = cupId || (await persistCup(cup));
      const iconUrl = await uploadNavIcon(effectiveCupId, path, file);
      const next = navDraft.map((item) =>
        item.path === path ? { ...item, iconUrl } : item
      );
      setNavDraft(next);
      await save({ navItems: normalizeNavItems(next) });
      setMsg('Menyikon oppdatert!');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Opplasting feilet');
    } finally {
      setUploadingNavPath(null);
    }
  };

  const clearNavIconImage = async (path: string) => {
    const next = navDraft.map((item) =>
      item.path === path ? { ...item, iconUrl: undefined } : item
    );
    setNavDraft(next);
    await save({ navItems: normalizeNavItems(next) });
    setMsg('Bildeikon fjernet – bruker emoji igjen.');
    setTimeout(() => setMsg(''), 3000);
  };

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
          Last opp eget bilde per menypunkt, eller bruk emoji som reserve når ingen bilde er
          lastet opp.
        </p>
        <div className="nav-icons-editor">
          {navDraft.map((item, i) => (
            <NavIconEditorRow
              key={item.path}
              item={item}
              fallbackIcon={DEFAULT_NAV_ITEMS[i]?.icon ?? ''}
              uploading={uploadingNavPath === item.path}
              onIconChange={(icon) => {
                const next = [...navDraft];
                next[i] = { ...item, icon };
                setNavDraft(next);
              }}
              onUpload={(file) => handleNavIconUpload(item.path, file)}
              onClearImage={() => clearNavIconImage(item.path)}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={saveNav}>
            Lagre emoji
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={resetNav}>
            Tilbakestill alle ikoner
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

function NavIconEditorRow({
  item,
  fallbackIcon,
  uploading,
  onIconChange,
  onUpload,
  onClearImage,
}: {
  item: NavItemConfig;
  fallbackIcon: string;
  uploading: boolean;
  onIconChange: (icon: string) => void;
  onUpload: (file: File) => void;
  onClearImage: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const previewItem = { ...item, icon: item.icon || fallbackIcon };

  return (
    <div className="nav-icon-row">
      <div className="nav-icon-preview">
        <NavMenuIcon item={previewItem} className="nav-icon-preview-inner" />
      </div>
      <div className="nav-icon-fields">
        <strong>{item.label}</strong>
        <span className="nav-icon-path">{item.path}</span>
      </div>
      <div className="nav-icon-actions">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? 'Laster …' : item.iconUrl ? 'Bytt bilde' : 'Last opp bilde'}
        </button>
        {item.iconUrl && (
          <button type="button" className="btn btn-outline btn-sm" onClick={onClearImage}>
            Fjern bilde
          </button>
        )}
        <label className="nav-icon-emoji-label">
          <span className="sr-only">Emoji for {item.label}</span>
          <input
            type="text"
            className="nav-icon-input"
            maxLength={4}
            value={item.icon}
            onChange={(e) => onIconChange(e.target.value)}
            aria-label={`Emoji for ${item.label}`}
            title="Brukes når ingen bilde er lastet opp"
          />
        </label>
      </div>
    </div>
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
