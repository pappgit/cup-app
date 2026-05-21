import { useCup } from '../../hooks/useCup';

const GUIDE_STEPS = [
  'Rediger velkomsttekst og deltakerinfo under Forside',
  'Last opp sponsorlogoer med plassering under Sponsorer',
  'Tilpass menyikoner og farger under Utseende',
  'Sett cupnavn og antall lag under Lag',
  'Legg inn alle lagnavn',
  'Konfigurer parametere og generer kamprogram under Kamprogram',
  'Legg til kioskvarer',
  'Eksporter data fra Innstillinger for backup',
];

export function AdminDashboard() {
  const { cup } = useCup();

  return (
    <>
      <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <span className="stat-card-value">{cup.teams.length}</span>
          <span className="stat-card-label">Lag</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{cup.matches.length}</span>
          <span className="stat-card-label">Kamper</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{cup.shopItems.length}</span>
          <span className="stat-card-label">Kioskvarer</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{cup.sponsors.length}</span>
          <span className="stat-card-label">Sponsorer</span>
        </div>
      </div>

      <div className="card">
        <h2>Hurtigguide</h2>
        <p className="card-lead">
          Anbefalt rekkefølge når du setter opp cupen for første gang.
        </p>
        <ol className="admin-guide">
          {GUIDE_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </>
  );
}
