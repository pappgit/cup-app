import type { CupDaySchedule, ScheduleParams } from '../types';
import { AVAILABLE_COURTS } from '../types';
import {
  buildAvailabilityOverview,
  formatCupDate,
  formatTimeRange,
} from '../lib/courtAvailability';
import {
  appendScheduleDay,
  getCourtHallTime,
  removeScheduleDay,
  syncAllDaysCourtTimes,
} from '../lib/scheduleParams';

interface CourtAvailabilityMatrixProps {
  params: ScheduleParams;
  slotMinutes: number;
  onChange: (days: CupDaySchedule[]) => void;
  onDayDateChange: (dayIndex: number, date: string) => void;
}

export function CourtAvailabilityMatrix({
  params,
  slotMinutes,
  onChange,
  onDayDateChange,
}: CourtAvailabilityMatrixProps) {
  const overview = buildAvailabilityOverview(params);

  const updateCell = (
    dayIndex: number,
    court: string,
    patch: Partial<{ enabled: boolean; timeFrom: string; timeTo: string }>
  ) => {
    const day = params.days[dayIndex];
    const hall = getCourtHallTime(day, court);
    const defaultFrom = day.timeFrom ?? '09:00';
    const defaultTo = day.timeTo ?? '17:00';
    const courtTimes = (day.courtTimes ?? []).map((c) => {
      if (c.court !== court) return c;
      const enabled =
        patch.enabled !== undefined ? patch.enabled : c.enabled === true;
      const timeFrom =
        patch.timeFrom ??
        (enabled && !c.timeFrom ? defaultFrom : c.timeFrom);
      const timeTo =
        patch.timeTo ?? (enabled && !c.timeTo ? defaultTo : c.timeTo);
      return { ...c, ...patch, enabled, timeFrom, timeTo };
    });
    if (!courtTimes.some((c) => c.court === court)) {
      const enabled = patch.enabled === true;
      courtTimes.push({
        court,
        timeFrom: patch.timeFrom ?? (enabled ? defaultFrom : hall.timeFrom),
        timeTo: patch.timeTo ?? (enabled ? defaultTo : hall.timeTo),
        enabled,
        ...patch,
      });
    }
    const days = params.days.map((d, i) =>
      i === dayIndex ? syncAllDaysCourtTimes([{ ...d, courtTimes }])[0] : d
    );
    onChange(days);
  };

  const copyDayToAll = (fromIndex: number) => {
    const source = params.days[fromIndex];
    const days = params.days.map((d, i) => {
      if (i === fromIndex) return d;
      const courtTimes = AVAILABLE_COURTS.map((court) => {
        const src = getCourtHallTime(source, court);
        return { ...src, court };
      });
      return syncAllDaysCourtTimes([{ ...d, courtTimes }])[0];
    });
    onChange(days);
  };

  return (
    <div className="court-matrix">
      <p className="court-matrix-intro">
        Kryss av når hver hall er tilgjengelig, sett dato og halltid per dag. Beregn og
        kamprogram bruker kun det som er satt her – legg til eller fjern dager etter behov.
      </p>

      <div className="court-matrix-day-toolbar">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onChange(appendScheduleDay(params.days))}
        >
          + Legg til dag
        </button>
      </div>

      <div className="court-matrix-scroll">
        <table className="court-matrix-table">
          <thead>
            <tr>
              <th className="court-matrix-sticky">Spilleflate</th>
              {params.days.map((day, dayIndex) => (
                <th key={dayIndex} className="court-matrix-day-col">
                  <div className="court-matrix-day-head">
                    <span className="court-matrix-day-label">Dag {dayIndex + 1}</span>
                    {params.days.length > 1 && (
                      <button
                        type="button"
                        className="court-matrix-remove-day"
                        title="Fjern denne dagen"
                        onClick={() => onChange(removeScheduleDay(params.days, dayIndex))}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    className="court-matrix-date"
                    value={day.date}
                    onChange={(e) => onDayDateChange(dayIndex, e.target.value)}
                  />
                  <span className="court-matrix-day-name">{formatCupDate(day.date)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AVAILABLE_COURTS.map((court) => (
              <tr key={court}>
                <th className="court-matrix-sticky court-matrix-court-name">{court}</th>
                {params.days.map((day, dayIndex) => {
                  const hall = getCourtHallTime(day, court);
                  const on = hall.enabled === true;
                  return (
                    <td
                      key={`${dayIndex}-${court}`}
                      className={`court-matrix-cell ${on ? 'court-matrix-cell--on' : ''}`}
                    >
                      <label className="court-matrix-toggle">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) =>
                            updateCell(dayIndex, court, { enabled: e.target.checked })
                          }
                        />
                        <span>Tilgjengelig</span>
                      </label>
                      <div className={`court-matrix-times ${!on ? 'court-matrix-times--off' : ''}`}>
                        <input
                          type="time"
                          value={hall.timeFrom}
                          disabled={!on}
                          onChange={(e) =>
                            updateCell(dayIndex, court, { timeFrom: e.target.value })
                          }
                          aria-label={`${court} ${formatCupDate(day.date)} fra`}
                        />
                        <span>–</span>
                        <input
                          type="time"
                          value={hall.timeTo}
                          disabled={!on}
                          onChange={(e) =>
                            updateCell(dayIndex, court, { timeTo: e.target.value })
                          }
                          aria-label={`${court} ${formatCupDate(day.date)} til`}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {params.days.length > 1 && (
        <div className="court-matrix-actions">
          {params.days.map((_, i) => (
            <button
              key={i}
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => copyDayToAll(i)}
            >
              Kopier dag {i + 1} til alle dager
            </button>
          ))}
        </div>
      )}

      <div className="court-overview">
        <h3 className="court-overview-title">Oversikt tilgjengelighet</h3>
        <p className="court-overview-total">
          <strong>{overview.totalSlots}</strong> kampplasser totalt
          {overview.activeCourts.length > 0 && (
            <>
              {' '}
              · aktive baner: <strong>{overview.activeCourts.join(', ')}</strong>
            </>
          )}
        </p>

        {overview.windows.length === 0 ? (
          <p className="court-overview-empty">Ingen baner er aktivert ennå.</p>
        ) : (
          <ul className="court-overview-list">
            {overview.windows.map((w) => (
              <li key={`${w.date}-${w.court}`}>
                <span className="court-overview-when">{w.dateLabel}</span>
                <span className="court-overview-where">{w.court}</span>
                <span className="court-overview-range">
                  {formatTimeRange(w.timeFrom, w.timeTo)}
                </span>
                <span className="court-overview-slots">
                  {w.slotCount} plass{w.slotCount !== 1 ? 'er' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
