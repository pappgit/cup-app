export interface MatchDisplayParts {
  dateKey: string;
  dateLabel: string;
  time: string;
  court: string | null;
}

export function getMatchDisplayParts(iso: string, court?: string): MatchDisplayParts {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return {
    dateKey: `${y}-${mo}-${day}`,
    dateLabel: d.toLocaleDateString('nb-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
    time: d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }),
    court: court ?? null,
  };
}

export function groupMatchesByDay<T extends { startTime: string }>(
  matches: T[]
): { dateKey: string; dateLabel: string; items: T[] }[] {
  const groups = new Map<string, { dateLabel: string; items: T[] }>();

  for (const m of matches) {
    const { dateKey, dateLabel } = getMatchDisplayParts(m.startTime);
    if (!groups.has(dateKey)) {
      groups.set(dateKey, { dateLabel, items: [] });
    }
    groups.get(dateKey)!.items.push(m);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, { dateLabel, items }]) => ({
      dateKey,
      dateLabel,
      items: items.sort(
        (x, y) => new Date(x.startTime).getTime() - new Date(y.startTime).getTime()
      ),
    }));
}
