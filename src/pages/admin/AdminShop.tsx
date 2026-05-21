import { useRef, useState } from 'react';
import { useCup } from '../../hooks/useCup';
import { uploadKioskImage, persistCup } from '../../lib/cupApi';
import { getKioskImageUrl, normalizePageContent } from '../../lib/pageContent';
import { DEFAULT_PAGE_CONTENT, type ShopItem } from '../../types';
import type { PageContent } from '../../types';

function newId() {
  return crypto.randomUUID();
}

export function AdminShop() {
  const { cup, cupId, update } = useCup();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const imageRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [msg, setMsg] = useState('');

  const content = normalizePageContent(cup.pageContent ?? DEFAULT_PAGE_CONTENT);
  const kioskImageSrc = getKioskImageUrl(content);

  const saveContent = async (patch: Partial<PageContent>) => {
    const next = normalizePageContent({ ...content, ...patch });
    await update({ pageContent: next });
    setMsg('Lagret!');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setMsg('');
    try {
      const effectiveCupId = cupId || (await persistCup(cup));
      const imageUrl = await uploadKioskImage(effectiveCupId, file);
      await saveContent({ kioskImageUrl: imageUrl });
      setMsg('Kioskbilde oppdatert!');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Opplasting feilet');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const removeKioskImage = () => saveContent({ kioskImageUrl: undefined });

  const addItem = () => {
    const trimmed = name.trim();
    const p = parseFloat(price);
    if (!trimmed || isNaN(p)) return;
    const item: ShopItem = {
      id: newId(),
      name: trimmed,
      price: p,
      description: description.trim() || undefined,
      available: true,
    };
    update({ shopItems: [...cup.shopItems, item] });
    setName('');
    setPrice('');
    setDescription('');
  };

  const toggleAvailable = (id: string) => {
    update({
      shopItems: cup.shopItems.map((i) =>
        i.id === id ? { ...i, available: !i.available } : i
      ),
    });
  };

  const removeItem = (id: string) => {
    update({ shopItems: cup.shopItems.filter((i) => i.id !== id) });
  };

  return (
    <>
      {msg && (
        <div
          className={`alert ${
            msg.includes('feilet') ? 'alert-error' : 'alert-success'
          }`}
          style={{ marginBottom: '1rem' }}
        >
          {msg}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Kioskbilde</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--grey-600)', marginBottom: '1rem' }}>
          Vises øverst på kiosksiden (f.eks. prisliste eller meny). Anbefalt bredde ca. 800 px
          eller mer.
        </p>

        {kioskImageSrc ? (
          <div className="kiosk-image-preview">
            <img src={kioskImageSrc} alt="Kioskbilde forhåndsvisning" />
          </div>
        ) : (
          <p className="empty-state" style={{ padding: '1rem 0' }}>
            Ingen bilde er lastet opp ennå.
          </p>
        )}

        <input
          ref={imageRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => imageRef.current?.click()}
            disabled={uploadingImage}
          >
            {uploadingImage
              ? 'Laster opp …'
              : kioskImageSrc
                ? 'Bytt bilde'
                : 'Last opp bilde'}
          </button>
          {kioskImageSrc && (
            <button type="button" className="btn btn-outline btn-sm" onClick={removeKioskImage}>
              Fjern bilde
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Legg til vare</h2>
        <div className="form-row cols-2">
          <div className="form-group">
            <label>Navn</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pølse" />
          </div>
          <div className="form-group">
            <label>Pris (kr)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Beskrivelse (valgfritt)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button type="button" className="btn btn-secondary" onClick={addItem}>
          Legg til
        </button>
      </div>

      <div className="card">
        <h2>Varer ({cup.shopItems.length})</h2>
        {cup.shopItems.length === 0 ? (
          <p className="empty-state">Ingen varer ennå.</p>
        ) : (
          <ul className="match-list">
            {cup.shopItems.map((item) => (
              <li key={item.id} className="match-item">
                <span>
                  <strong>{item.name}</strong> — {item.price} kr
                  {!item.available && ' (utgått)'}
                </span>
                <span style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => toggleAvailable(item.id)}
                  >
                    {item.available ? 'Skjul' : 'Vis'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => removeItem(item.id)}
                  >
                    Slett
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
