import { useCup } from '../hooks/useCup';

export function SavingIndicator() {
  const { saving } = useCup();
  if (!saving) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        background: 'var(--purple)',
        color: 'var(--yellow)',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        fontSize: '0.85rem',
        fontWeight: 600,
        zIndex: 200,
        boxShadow: 'var(--shadow)',
      }}
    >
      Lagrer …
    </div>
  );
}
