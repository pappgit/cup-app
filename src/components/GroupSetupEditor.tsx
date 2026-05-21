import type { Group, Team } from '../types';
import { listGroupStagePairings } from '../lib/groups';

interface GroupSetupEditorProps {
  groups: Group[];
  teams: Team[];
  onMoveTeam: (teamId: string, toGroupId: string) => void;
}

export function GroupSetupEditor({ groups, teams, onMoveTeam }: GroupSetupEditorProps) {
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? 'Ukjent lag';
  const pairings = listGroupStagePairings(groups);

  return (
    <div className="group-setup">
      <p className="group-setup-intro">
        Flytt lag mellom gruppene – kampoppsettet (hvem møter hvem) oppdateres automatisk når du
        lagrer endringen.
      </p>

      <div className="group-setup-grid">
        {groups.map((group) => (
          <div key={group.id} className="group-setup-card">
            <h4 className="group-setup-card-title">{group.name}</h4>
            <ul className="group-setup-teams">
              {group.teamIds.map((teamId) => (
                <li key={teamId} className="group-setup-team">
                  <span className="group-setup-team-name">{teamName(teamId)}</span>
                  {groups.length > 1 && (
                    <select
                      className="group-setup-move"
                      value=""
                      aria-label={`Flytt ${teamName(teamId)} til annen gruppe`}
                      onChange={(e) => {
                        const to = e.target.value;
                        if (to) onMoveTeam(teamId, to);
                        e.target.value = '';
                      }}
                    >
                      <option value="">Flytt til …</option>
                      {groups
                        .filter((g) => g.id !== group.id)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="group-setup-pairings">
        <h4 className="group-setup-pairings-title">
          Gruppespill ({pairings.length} kamper)
        </h4>
        <ul className="group-setup-pairings-list">
          {pairings.map((p, i) => (
            <li key={`${p.groupId}-${p.home}-${p.away}-${i}`}>
              <span className="group-setup-pairings-group">Gruppe {p.groupId}</span>
              {teamName(p.home)} vs {teamName(p.away)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
