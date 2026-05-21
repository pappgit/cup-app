import type { Match, ScheduleParams } from '../types';

function matchSignature(matches: Match[]): string {
  return [...matches]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .map(
      (m) =>
        `${m.startTime}|${m.homeTeamId}|${m.awayTeamId}|${m.phase ?? ''}|${m.label ?? ''}|${m.matchNumber ?? ''}`
    )
    .join(';');
}

export function getDraftMatches(
  params: ScheduleParams,
  published: Match[]
): Match[] {
  const draft = params.draftMatches;
  if (draft && draft.length > 0) return draft;
  return published;
}

export function hasUnpublishedDraft(
  params: ScheduleParams,
  published: Match[]
): boolean {
  const draft = params.draftMatches;
  if (!draft || draft.length === 0) return false;
  if (published.length === 0) return true;
  return matchSignature(draft) !== matchSignature(published);
}
