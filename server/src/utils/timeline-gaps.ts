export interface TimelineGap {
  from: string;
  to: string;
  days: number;
}

export interface TimelineEntry {
  date: string;
  [key: string]: unknown;
}

function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatWeek(d: Date): string {
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((d.getTime() - jan1.getTime()) / 86400000) + 1;
  const weekNum = Math.ceil(dayOfYear / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function formatMonth(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function generateAllDates(startDate: Date, endDate: Date, groupBy: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);

  if (groupBy === 'day') {
    while (current <= endDate) {
      dates.push(formatDate(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }
  } else if (groupBy === 'week') {
    // Align to Monday of the start week
    const dayOfWeek = current.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    current.setUTCDate(current.getUTCDate() + mondayOffset);

    while (current <= endDate) {
      dates.push(formatWeek(current));
      current.setUTCDate(current.getUTCDate() + 7);
    }
  } else if (groupBy === 'month') {
    current.setUTCDate(1);
    while (current <= endDate) {
      dates.push(formatMonth(current));
      current.setUTCMonth(current.getUTCMonth() + 1);
    }
  }

  return dates;
}

/**
 * Fill missing dates in a timeline with zero-value entries and detect gaps.
 *
 * @param timeline - The raw query results (may have missing dates)
 * @param startDate - The start of the period
 * @param endDate - The end of the period (typically now)
 * @param groupBy - 'day', 'week', or 'month'
 * @param defaultEntry - Template for zero-value entries (date will be overwritten)
 * @returns Object with filled timeline and gaps array
 */
export function fillTimelineGaps<T extends TimelineEntry>(
  timeline: T[],
  startDate: Date,
  endDate: Date,
  groupBy: string,
  defaultEntry: Omit<T, 'date'>
): { timeline: T[]; gaps: TimelineGap[] } {
  const allDates = generateAllDates(startDate, endDate, groupBy);

  // Index existing entries by date
  const existingByDate = new Map<string, T>();
  for (const entry of timeline) {
    existingByDate.set(entry.date, entry);
  }

  // Fill missing dates with zero entries
  const filled: T[] = allDates.map((date) => {
    const existing = existingByDate.get(date);
    if (existing) return existing;
    return { ...defaultEntry, date } as T;
  });

  // Sort ascending by date for gap detection
  filled.sort((a, b) => a.date.localeCompare(b.date));

  // Detect gaps: consecutive zero-value entries
  const gaps = detectGaps(filled, groupBy);

  return { timeline: filled, gaps };
}

function detectGaps<T extends TimelineEntry>(timeline: T[], groupBy: string): TimelineGap[] {
  if (timeline.length === 0) return [];

  // A "gap" is a run of consecutive dates where all numeric fields are 0
  const gaps: TimelineGap[] = [];
  let gapStart: string | null = null;

  for (let i = 0; i < timeline.length; i++) {
    const entry = timeline[i];
    const isZero = isZeroEntry(entry);

    if (isZero) {
      if (gapStart === null) {
        gapStart = entry.date;
      }
    } else {
      if (gapStart !== null) {
        const prev = timeline[i - 1];
        gaps.push(buildGap(gapStart, prev.date, groupBy));
        gapStart = null;
      }
    }
  }

  // Handle gap extending to the end
  if (gapStart !== null) {
    const last = timeline[timeline.length - 1];
    gaps.push(buildGap(gapStart, last.date, groupBy));
  }

  return gaps;
}

function isZeroEntry(entry: TimelineEntry): boolean {
  for (const [key, value] of Object.entries(entry)) {
    if (key === 'date') continue;
    if (typeof value === 'number' && value !== 0) return false;
  }
  return true;
}

function buildGap(from: string, to: string, groupBy: string): TimelineGap {
  let days: number;

  if (groupBy === 'day') {
    const fromMs = new Date(from + 'T00:00:00Z').getTime();
    const toMs = new Date(to + 'T00:00:00Z').getTime();
    days = Math.round((toMs - fromMs) / 86400000) + 1;
  } else if (groupBy === 'week') {
    const fromMs = parseWeekDate(from).getTime();
    const toMs = parseWeekDate(to).getTime();
    days = Math.round((toMs - fromMs) / 86400000) + 7;
  } else {
    // month
    const fromMs = parseMonthDate(from).getTime();
    const toMs = parseMonthDate(to).getTime();
    days = Math.round((toMs - fromMs) / 86400000) + 30;
  }

  return { from, to, days };
}

function parseWeekDate(weekStr: string): Date {
  // "2025-W43" → ISO week number
  const [yearStr, weekStr2] = weekStr.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr2, 10);

  // Jan 1 of the year + (week - 1) * 7 days
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dayOfWeek = jan1.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  jan1.setUTCDate(jan1.getUTCDate() + mondayOffset);
  jan1.setUTCDate(jan1.getUTCDate() + (week - 1) * 7);

  return jan1;
}

function parseMonthDate(monthStr: string): Date {
  const [yearStr, monthStr2] = monthStr.split('-');
  return new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthStr2, 10) - 1, 1));
}
