import { useCup } from '../hooks/useCup';
import { SponsorStrip } from '../components/SponsorStrip';
import { getKioskImageUrl, normalizePageContent } from '../lib/pageContent';
import { DEFAULT_PAGE_CONTENT } from '../types';

export function ShopPage() {
  const { cup } = useCup();
  const items = cup.shopItems.filter((i) => i.available);
  const content = normalizePageContent(cup.pageContent ?? DEFAULT_PAGE_CONTENT);
  const kioskImage = getKioskImageUrl(content);

  return (
    <>
      <h1 className="page-title">Kiosk</h1>

      {kioskImage && (
        <div className="kiosk-hero-image card">
          <img src={kioskImage} alt="Kioskmeny" />
        </div>
      )}

      <p style={{ color: 'var(--grey-600)', marginBottom: '1.5rem' }}>
        Varer tilgjengelig i hallen under cupen.
      </p>

      {items.length === 0 ? (
        <div className="card">
          <p className="empty-state">Kiosken er tom for øyeblikket.</p>
        </div>
      ) : (
        <div className="shop-grid">
          {items.map((item) => (
            <div key={item.id} className="shop-item card">
              {item.imageUrl && (
                <div className="shop-item-image-wrap">
                  <img src={item.imageUrl} alt="" className="shop-item-image" />
                </div>
              )}
              <h3 className="shop-item-name">{item.name}</h3>
              {item.description && (
                <p className="shop-item-desc">{item.description}</p>
              )}
              <div className="shop-price">{item.price} kr</div>
            </div>
          ))}
        </div>
      )}

      <SponsorStrip sponsors={cup.sponsors} />
    </>
  );
}
