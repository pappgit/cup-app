import { useCup } from '../hooks/useCup';
import { useFavoriteTeam } from '../hooks/useFavoriteTeam';
import { SCHEDULE_VIEW_ALL, ScheduleTeamFilter } from './ScheduleTeamFilter';

export function TeamPickerBar() {
  const { cup } = useCup();
  const { teamId, setFavorite } = useFavoriteTeam();

  if (cup.teams.length === 0) return null;

  const selectedName = teamId
    ? cup.teams.find((t) => t.id === teamId)?.name
    : null;

  return (
    <div className="team-picker-bar">
      <div className="team-picker-bar-inner">
        <span className="team-picker-label">Ditt lag</span>
        <ScheduleTeamFilter
          teams={cup.teams}
          value={teamId}
          onChange={setFavorite}
          showResetButton={false}
          label="Velg lag"
          allOptionLabel="Ikke valgt (hele programmet)"
          id="global-team-picker"
        />
        {selectedName && (
          <span className="team-picker-active">
            Viser innhold for <strong>{selectedName}</strong> i Kamper og Tabell
          </span>
        )}
      </div>
    </div>
  );
}
