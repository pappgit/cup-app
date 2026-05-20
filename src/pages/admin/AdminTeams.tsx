import { useState } from 'react';
import { useCup } from '../../hooks/useCup';

function newId() {
  return crypto.randomUUID();
}

export function AdminTeams() {
  const { cup, update } = useCup();
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  const addTeam = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const nextTeams = [...cup.teams, { id: newId(), name: trimmed }];
    update({
      teams: nextTeams,
      teamCount: Math.max(cup.teamCount, nextTeams.length),
    });
    setName('');
    setMsg('');
  };

  const removeTeam = (id: string) => {
    const nextTeams = cup.teams.filter((t) => t.id !== id);
    update({
      teams: nextTeams,
      teamCount: Math.max(2, nextTeams.length),
      matches: cup.matches.filter((m) => m.homeTeamId !== id && m.awayTeamId !== id),
    });
  };

  const saveSettings = () => {
    update({ name: cup.name, teamCount: cup.teamCount });
    setMsg('Lagret!');
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <>
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Cupinnstillinger</h2>
        <div className="form-row cols-2">
          <div className="form-group">
            <label>Cupnavn</label>
            <input
              value={cup.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Planlagt maks antall lag (valgfritt)</label>
            <input
              type="number"
              min={2}
              max={64}
              value={cup.teamCount}
              onChange={(e) =>
                update({ teamCount: Math.max(2, parseInt(e.target.value, 10) || 2) })
              }
            />
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--grey-600)', margin: '0 0 1rem' }}>
          Du legger inn så mange lag du vil — minimum 2 for kamprogram. Registrert nå:{' '}
          <strong>{cup.teams.length}</strong> lag.
        </p>
        <button type="button" className="btn btn-primary" onClick={saveSettings}>
          Lagre
        </button>
      </div>

      <div className="card">
        <h2>Lag ({cup.teams.length} registrert)</h2>
        <div className="form-row cols-2" style={{ alignItems: 'end' }}>
          <div className="form-group">
            <label>Lagnavn</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTeam()}
              placeholder="F.eks. Tunet G12"
            />
          </div>
          <button type="button" className="btn btn-secondary" onClick={addTeam}>
            Legg til lag
          </button>
        </div>
        <div className="team-chip-list" style={{ marginTop: '1rem' }}>
          {cup.teams.map((t) => (
            <span
              key={t.id}
              className="team-chip"
              style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}
            >
              {t.name}
              <button
                type="button"
                onClick={() => removeTeam(t.id)}
                style={{ color: 'var(--purple)', fontWeight: 700, padding: 0 }}
                aria-label={`Fjern ${t.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {cup.teams.length === 0 && (
          <p className="empty-state">Ingen lag lagt inn ennå.</p>
        )}
      </div>
    </>
  );
}
