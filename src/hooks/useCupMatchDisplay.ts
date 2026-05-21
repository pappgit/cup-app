import { useMemo } from 'react';
import {
  getMatchLabelForDisplay,
  getMatchTeamNamesForDisplay,
} from '../lib/matchDisplay';
import {
  applyPlayoffTeamUpdates,
  isGroupStageComplete,
  isPlayoffMatch,
  resolveGroupsForCup,
} from '../lib/groups';
import { normalizeScheduleParams } from '../lib/scheduleParams';
import { DEFAULT_SCHEDULE_PARAMS, type Match } from '../types';
import { useCup } from './useCup';

/** Kamper + visningsregler (sluttspill-lag skjules til gruppespill er ferdig). */
export function useCupMatchDisplay(matchesOverride?: Match[]) {
  const { cup } = useCup();
  const params = useMemo(
    () => normalizeScheduleParams(cup.scheduleParams ?? DEFAULT_SCHEDULE_PARAMS),
    [cup.scheduleParams]
  );

  const groups = useMemo(
    () => resolveGroupsForCup(cup.teams, params),
    [cup.teams, params]
  );

  const sourceMatches = matchesOverride ?? cup.matches;

  const groupStageComplete = useMemo(
    () => isGroupStageComplete(groups, sourceMatches),
    [groups, sourceMatches]
  );

  const matches = useMemo(() => {
    if (!params.seriesPlay) return sourceMatches;
    return applyPlayoffTeamUpdates(sourceMatches, cup.teams, groups, params.seriesPlay);
  }, [sourceMatches, cup.teams, groups, params.seriesPlay]);

  const teamName = (id: string) => cup.teams.find((t) => t.id === id)?.name ?? 'Ukjent lag';

  const getTeamNames = (match: Match) =>
    getMatchTeamNamesForDisplay(match, teamName, groups, sourceMatches, cup.teams);

  const getLabel = (match: Match) => getMatchLabelForDisplay(match, groupStageComplete);

  return {
    matches,
    groups,
    groupStageComplete,
    teamName,
    getTeamNames,
    getLabel,
    isPlayoffMatch,
  };
}
