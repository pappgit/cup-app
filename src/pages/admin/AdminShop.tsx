import { useRef, useState } from 'react';
import { useCup } from '../../hooks/useCup';
import { uploadKioskImage, uploadShopItemImage, persistCup } from '../../lib/cupApi';
import { getKioskImageUrl, normalizePageContent } from '../../lib/pageContent';
import { DEFAULT_PAGE_CONTENT, type ShopItem } from '../../types';
import type { PageContent } from '../../types';

function newId() {
  return crypto.randomUUID();
}

function ShopItemRow({
  item,
  onToggle,
  onRemove,
  onImageChange,
  uploading,
}: {
  item: ShopItem;
  onToggle: () => void;
  onRemove: () => void;
  onImageChange: (file: File) => void;
  uploading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <li className="shop-admin-item">
      <div className="shop-admin-item-media">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="shop-admin-item-thumb" />
        ) : (
          <div className="shop-admin-item-thumb shop-admin-item-thumb--empty">Ingen bilde</div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImageChange(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? 'Laster …' : item.imageUrl ? 'Bytt bilde' : 'Last opp bilde'}
        </button>
      </div>
      <div className="shop-admin-item-body">
        <strong>{item.name}</strong>
        <span className="shop-admin-item-meta">
          {item.price} kr
          {item.description ? ` · ${item.description}` : ''}
          {!item.available && ' · utgått'}
        </span>
      </div>
      <div className="shop-admin-item-actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={onToggle}>
          {item.available ? 'Skjul' : 'Vis'}
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={onRemove}>
          Slett
        </button>
      </div>
    </li>
  );
}

export function AdminShop() {
  const { cup, cupId, update } = useCup();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [newItemImage, setNewItemImage] = useState<File | null>(null);
  const [newItemPreview, setNewItemPreview] = useState<string | null>(null);
  const newItemImageRef = useRef<HTMLInputElement>(null);
  const kioskImageRef = useRef<HTMLInputElement>(null);
  const [uploadingKiosk, setUploadingKiosk] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState('');

  const content = normalizePageContent(cup.pageContent ?? DEFAULT_PAGE_CONTENT);
  const kioskImageSrc = getKioskImageUrl(content);

  const showMsg = (text: string, isError = false) => {
    setMsg(text);
    if (!isError) setTimeout(() => setMsg(''), 4000);
  };

  const saveContent = async (patch: Partial<PageContent>) => {
    const next = normalizePageContent({ ...content, ...patch });
    await update({ pageContent: next });
    showMsg('Lagret!');
  };

  const handleKioskImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingKiosk(true);
    try {
      const effectiveCupId = cupId || (await persistCup(cup));
      const imageUrl = await uploadKioskImage(effectiveCupId, file);
      await saveContent({ kioskImageUrl: imageUrl });
      showMsg('Kioskbilde oppdatert!');
    } catch (err) {
      showMsg(err instanceof Error ? err.message : 'Opplasting feilet', true);
    } finally {
      setUploadingKiosk(false);
      e.target.value = '';
    }
  };

  const pickNewItemImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (newItemPreview) URL.revokeObjectURL(newItemPreview);
    setNewItemImage(file);
    setNewItemPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const clearNewItemImage = () => {
    if (newItemPreview) URL.revokeObjectURL(newItemPreview);
    setNewItemImage(null);
    setNewItemPreview(null);
  };

  const uploadItemImage = async (itemId: string, file: File): Promise<string> => {
    const effectiveCupId = cupId || (await persistCup(cup));
    return uploadShopItemImage(effectiveCupId, itemId, file);
  };

  const addItem = async () => {
    const trimmed = name.trim();
    const p = parseFloat(price);
    if (!trimmed || isNaN(p)) return;

    setAdding(true);
    try {
      const id = newId();
      let imageUrl: string | undefined;

      if (newItemImage) {
        imageUrl = await uploadItemImage(id, newItemImage);
      }

      const item: ShopItem = {
        id,
        name: trimmed,
        price: p,
        description: description.trim() || undefined,
        imageUrl,
        available: true,
      };

      await update({ shopItems: [...cup.shopItems, item] });
      setName('');
      setPrice('');
      setDescription('');
      clearNewItemImage();
      showMsg('Vare lagt til!');
    } catch (err) {
      showMsg(err instanceof Error ? err.message : 'Kunne ikke legge til vare', true);
    } finally {
      setAdding(false);
    }
  };

  const updateItemImage = async (itemId: string, file: File) => {
    setUploadingItemId(itemId);
    try {
      const imageUrl = await uploadItemImage(itemId, file);
      await update({
        shopItems: cup.shopItems.map((i) =>
          i.id === itemId ? { ...i, imageUrl } : i
        ),
      });
      showMsg('Varebilde oppdatert!');
    } catch (err) {
      showMsg(err instanceof Error ? err.message : 'Opplasting feilet', true);
    } finally {
      setUploadingItemId(null);
    }
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
          ref={kioskImageRef}
          type="file"
          accept="image/*"
          onChange={handleKioskImageUpload}
          style={{ display: 'none' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => kioskImageRef.current?.click()}
            disabled={uploadingKiosk}
          >
            {uploadingKiosk
              ? 'Laster opp …'
              : kioskImageSrc
                ? 'Bytt bilde'
                : 'Last opp bilde'}
          </button>
          {kioskImageSrc && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => saveContent({ kioskImageUrl: undefined })}
            >
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
        <div className="form-group">
          <label>Bilde (valgfritt)</label>
          {newItemPreview && (
            <div className="shop-new-item-preview">
              <img src={newItemPreview} alt="" />
            </div>
          )}
          <input
            ref={newItemImageRef}
            type="file"
            accept="image/*"
            onChange={pickNewItemImage}
            style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => newItemImageRef.current?.click()}
            >
              {newItemImage ? 'Bytt bilde' : 'Velg bilde'}
            </button>
            {newItemImage && (
              <button type="button" className="btn btn-outline btn-sm" onClick={clearNewItemImage}>
                Fjern bilde
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={addItem}
          disabled={adding}
        >
          {adding ? 'Legger til …' : 'Legg til'}
        </button>
      </div>

      <div className="card">
        <h2>Varer ({cup.shopItems.length})</h2>
        {cup.shopItems.length === 0 ? (
          <p className="empty-state">Ingen varer ennå.</p>
        ) : (
          <ul className="shop-admin-list">
            {cup.shopItems.map((item) => (
              <ShopItemRow
                key={item.id}
                item={item}
                uploading={uploadingItemId === item.id}
                onToggle={() => toggleAvailable(item.id)}
                onRemove={() => removeItem(item.id)}
                onImageChange={(file) => updateItemImage(item.id, file)}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
