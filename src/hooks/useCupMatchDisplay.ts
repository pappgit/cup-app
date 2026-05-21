import { useMemo } from 'react';
import {
  getMatchLabelForDisplay,
  getMatchTeamNamesForDisplay,
} from '../lib/matchDisplay';
import {
  applyPlayoffTeamUpdates,
  isGroupStageComplete,
  resolveGroupsForCup,
} from '../lib/groups';
import { normalizeScheduleParams } from '../lib/scheduleParams';
import { DEFAULT_SCHEDULE_PARAMS, type Match } from '../types';
import { useCup } from './useCup';

/** Kamper + visningsregler (sluttspill-lag skjules til gruppespill er ferdig). */
export function useCupMatchDisplay() {
  const { cup } = useCup();
  const params = useMemo(
    () => normalizeScheduleParams(cup.scheduleParams ?? DEFAULT_SCHEDULE_PARAMS),
    [cup.scheduleParams]
  );

  const groups = useMemo(
    () => resolveGroupsForCup(cup.teams, params),
    [cup.teams, params]
  );

  const groupStageComplete = useMemo(
    () => isGroupStageComplete(groups, cup.matches),
    [groups, cup.matches]
  );

  const matches = useMemo(() => {
    if (!params.seriesPlay) return cup.matches;
    return applyPlayoffTeamUpdates(cup.matches, cup.teams, groups, params.seriesPlay);
  }, [cup.matches, cup.teams, groups, params.seriesPlay]);

  const teamName = (id: string) => cup.teams.find((t) => t.id === id)?.name ?? 'Ukjent lag';

  const getTeamNames = (match: Match) =>
    getMatchTeamNamesForDisplay(match, teamName, groupStageComplete);

  const getLabel = (match: Match) => getMatchLabelForDisplay(match, groupStageComplete);

  return {
    matches,
    groupStageComplete,
    teamName,
    getTeamNames,
    getLabel,
  };
}
