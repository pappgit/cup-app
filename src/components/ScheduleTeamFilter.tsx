import { setFavoriteTeamId } from '../lib/storage';
import type { Team } from '../types';

/** Tom streng = hele kamprogrammet. */
export const SCHEDULE_VIEW_ALL = '';

interface ScheduleTeamFilterProps {
  teams: Team[];
  value: string;
  onChange: (teamId: string) => void;
  showResetButton?: boolean;
  id?: string;
}

export function ScheduleTeamFilter({
  teams,
  value,
  onChange,
  showResetButton = true,
  id = 'schedule-team-filter',
}: ScheduleTeamFilterProps) {
  const handleChange = (teamId: string) => {
    setFavoriteTeamId(teamId || null);
    onChange(teamId);
  };

  return (
    <div className="schedule-toolbar">
      <div className="form-group schedule-toolbar-select">
        <label htmlFor={id}>Vis kamper</label>
        <select id={id} value={value} onChange={(e) => handleChange(e.target.value)}>
          <option value={SCHEDULE_VIEW_ALL}>Hele kamprogrammet</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      {showResetButton && value !== SCHEDULE_VIEW_ALL && (
        <button
          type="button"
          className="btn btn-outline btn-sm schedule-toolbar-btn"
          onClick={() => handleChange(SCHEDULE_VIEW_ALL)}
        >
          Vis hele kamprogrammet
        </button>
      )}
    </div>
  );
}
