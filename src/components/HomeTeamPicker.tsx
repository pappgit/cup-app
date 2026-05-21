import { useCup } from '../hooks/useCup';
import { useFavoriteTeam } from '../hooks/useFavoriteTeam';
import { SCHEDULE_VIEW_ALL, ScheduleTeamFilter } from './ScheduleTeamFilter';

export function HomeTeamPicker() {
  const { cup } = useCup();
  const { teamId, setFavorite } = useFavoriteTeam();

  if (cup.teams.length === 0) return null;

  const selectedName = teamId
    ? cup.teams.find((t) => t.id === teamId)?.name
    : null;

  return (
    <section className="hero hero-team-picker" aria-label="Velg lag">
      <h2 className="hero-team-picker-title">Velg lag</h2>
      <p className="hero-team-picker-desc">
        Velg laget ditt – da vises riktige kamper i Kamper
        {cup.scheduleParams?.seriesPlay ? ' og poeng i Tabell' : ''}.
      </p>
      <ScheduleTeamFilter
        teams={cup.teams}
        value={teamId}
        onChange={setFavorite}
        showResetButton={false}
        label="Ditt lag"
        allOptionLabel="Ikke valgt (hele programmet)"
        id="home-team-picker"
        variant="hero"
      />
      {selectedName && (
        <p className="hero-team-picker-active">
          Valgt: <strong>{selectedName}</strong>
        </p>
      )}
    </section>
  );
}
