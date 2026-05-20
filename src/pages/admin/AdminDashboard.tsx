import { useCup } from '../../hooks/useCup';

export function AdminDashboard() {
  const { cup } = useCup();

  return (
    <div className="admin-grid two-col">
      <div className="card">
        <h2>Cup</h2>
        <p>
          <strong>{cup.name}</strong>
        </p>
        <p>
          {cup.teams.length} av {cup.teamCount} lag registrert
        </p>
        <p>{cup.matches.length} kamper i programmet</p>
      </div>
      <div className="card">
        <h2>Kiosk & sponsorer</h2>
        <p>{cup.shopItems.length} varer i kiosken</p>
        <p>{cup.sponsors.length} sponsorlogoer</p>
      </div>
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h2>Hurtigguide</h2>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8 }}>
          <li>Sett cupnavn og antall lag under Lag</li>
          <li>Legg inn alle lagnavn</li>
          <li>Konfigurer parametere og generer kamprogram under Kamprogram</li>
          <li>Legg til kioskvarer og sponsorlogoer</li>
          <li>Eksporter data fra Innstillinger for backup</li>
        </ol>
      </div>
    </div>
  );
}
