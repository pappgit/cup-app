import { useState } from 'react';
import { useCup } from '../../hooks/useCup';
import type { ShopItem } from '../../types';

function newId() {
  return crypto.randomUUID();
}

export function AdminShop() {
  const { cup, update } = useCup();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

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
