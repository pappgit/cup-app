import { useMemo } from 'react';
import { applyPlayoffTeamUpdates, resolveGroupsForCup } from '../lib/groups';
import { normalizeScheduleParams } from '../lib/scheduleParams';
import { DEFAULT_SCHEDULE_PARAMS, type Match } from '../types';
import { useCup } from './useCup';

/** Kamper med sluttspill-lag oppdatert ut fra gjeldende tabell (visning). */
export function useCupMatches(): Match[] {
  const { cup } = useCup();
  const params = useMemo(
    () => normalizeScheduleParams(cup.scheduleParams ?? DEFAULT_SCHEDULE_PARAMS),
    [cup.scheduleParams]
  );

  return useMemo(() => {
    const groups = resolveGroupsForCup(cup.teams, params);
    return applyPlayoffTeamUpdates(cup.matches, cup.teams, groups, params.seriesPlay);
  }, [cup.matches, cup.teams, params]);
}
