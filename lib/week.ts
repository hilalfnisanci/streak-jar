import { getLocalDateKey } from "./local-date";
import { type Jar, type JarStorage } from "./storage";
import { getMarbleDateSet, shiftDateKey } from "./streak";

// Weekly recap derivation. Everything here is a pure function of stored jar
// data and a local `today` date key: it never reads the clock or `window`, and
// it never writes storage. Date arithmetic runs on date keys through the
// UTC-based `shiftDateKey`, so DST changes cannot skip or repeat a day.

export type WeekKind = "last" | "this";

export type Week = {
  start: string;
  end: string;
  days: string[];
};

export type DayState = "marble" | "missed" | "before" | "future";

export type JarWeek = {
  jar: Jar;
  days: DayState[];
  marbles: number;
  daysInScope: number;
  longestStreak: number;
  isFirstWeek: boolean;
  isFull: boolean;
  previous: number | null;
  delta: number | null;
  filledOn: string | null;
};

export type WeekRecap = {
  kind: WeekKind;
  week: Week;
  jars: JarWeek[];
  total: number;
  bestStreak: number;
  comparison: { delta: number; previousTotal: number } | null;
  daysSoFar: number;
  allFirstWeek: boolean;
  fullCount: number;
};

export const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return { year, month, day };
}

// Monday = 0 ... Sunday = 6.
export function getWeekdayIndex(dateKey: string): number {
  const { year, month, day } = parseDateKey(dateKey);

  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

export function getWeekStart(dateKey: string): string {
  return shiftDateKey(dateKey, -getWeekdayIndex(dateKey));
}

function getWeekFromStart(start: string): Week {
  const days = Array.from({ length: 7 }, (_, index) =>
    shiftDateKey(start, index),
  );

  return { start, end: days[6], days };
}

export function getWeek(today: string, kind: WeekKind): Week {
  const thisWeekStart = getWeekStart(today);

  return getWeekFromStart(
    kind === "this" ? thisWeekStart : shiftDateKey(thisWeekStart, -7),
  );
}

function toLocalDayKey(timestamp: string | undefined): string | null {
  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);

  return Number.isNaN(date.getTime()) ? null : getLocalDateKey(date);
}

// A jar whose creation time cannot be parsed is treated as created before
// every week, so it never shows "before" days.
function isBeforeCreation(day: string, creationDay: string | null) {
  return creationDay !== null && day < creationDay;
}

function countMarbles(
  week: Week,
  marbleDates: Set<string>,
  creationDay: string | null,
) {
  return week.days.filter(
    (day) => !isBeforeCreation(day, creationDay) && marbleDates.has(day),
  ).length;
}

function computeJarWeek(
  jar: Jar,
  week: Week,
  kind: WeekKind,
  today: string,
): JarWeek {
  const marbleDates = getMarbleDateSet(
    Array.isArray(jar.marbles) ? jar.marbles : [],
  );
  const creationDay = toLocalDayKey(jar.createdAt);
  const completionDay = toLocalDayKey(jar.completedAt);
  const days = week.days.map((day): DayState => {
    if (isBeforeCreation(day, creationDay)) {
      return "before";
    }

    if (kind === "this" && day > today) {
      return "future";
    }

    return marbleDates.has(day) ? "marble" : "missed";
  });
  const marbles = days.filter((state) => state === "marble").length;
  const daysInScope = days.filter(
    (state) => state === "marble" || state === "missed",
  ).length;
  let longestStreak = 0;
  let run = 0;

  for (const state of days) {
    run = state === "marble" ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }

  const previousWeek = getWeekFromStart(shiftDateKey(week.start, -7));
  const previous =
    creationDay === null || creationDay <= previousWeek.end
      ? countMarbles(previousWeek, marbleDates, creationDay)
      : null;

  return {
    jar,
    days,
    marbles,
    daysInScope,
    longestStreak,
    isFirstWeek:
      creationDay !== null &&
      creationDay >= week.start &&
      creationDay <= week.end,
    isFull: kind === "last" && daysInScope > 0 && marbles === daysInScope,
    previous,
    delta: previous === null ? null : marbles - previous,
    filledOn:
      completionDay !== null &&
      completionDay >= week.start &&
      completionDay <= week.end
        ? completionDay
        : null,
  };
}

export function computeWeekRecap(
  storage: JarStorage,
  today: string,
  kind: WeekKind,
): WeekRecap {
  const week = getWeek(today, kind);
  // Same order as the home screen: active jars first, then the Trophy Shelf.
  // A jar with `completedAt` can no longer receive marbles, so it only counts
  // as active while it has not been completed, wherever it is stored.
  const candidates = [
    ...storage.jars.map((jar) => ({ jar, active: !jar.completedAt })),
    ...storage.completed.map((jar) => ({ jar, active: false })),
  ];
  const jars = candidates
    .filter(({ jar }) => {
      const creationDay = toLocalDayKey(jar.createdAt);

      return creationDay === null || creationDay <= week.end;
    })
    .map(({ jar, active }) => ({
      active,
      jarWeek: computeJarWeek(jar, week, kind, today),
    }))
    .filter(({ active, jarWeek }) => active || jarWeek.marbles > 0)
    .map(({ jarWeek }) => jarWeek);
  const withPrevious = jars.filter((jarWeek) => jarWeek.previous !== null);
  const previousTotal = withPrevious.reduce(
    (sum, jarWeek) => sum + (jarWeek.previous ?? 0),
    0,
  );
  const comparedTotal = withPrevious.reduce(
    (sum, jarWeek) => sum + jarWeek.marbles,
    0,
  );

  return {
    kind,
    week,
    jars,
    total: jars.reduce((sum, jarWeek) => sum + jarWeek.marbles, 0),
    bestStreak: jars.reduce(
      (best, jarWeek) => Math.max(best, jarWeek.longestStreak),
      0,
    ),
    comparison:
      withPrevious.length > 0
        ? { delta: comparedTotal - previousTotal, previousTotal }
        : null,
    daysSoFar: kind === "this" ? getWeekdayIndex(today) + 1 : 7,
    allFirstWeek:
      jars.length > 0 && jars.every((jarWeek) => jarWeek.isFirstWeek),
    fullCount: jars.filter((jarWeek) => jarWeek.isFull).length,
  };
}

// False when every jar was created during the current week, so no week has
// finished since the user started.
export function hasFinishedWeek(storage: JarStorage, today: string): boolean {
  const thisWeekStart = getWeekStart(today);

  return [...storage.jars, ...storage.completed].some((jar) => {
    const creationDay = toLocalDayKey(jar.createdAt);

    return creationDay === null || creationDay < thisWeekStart;
  });
}

// "Nov 2" — a fixed English month list keeps output identical in every locale.
export function formatShortDate(dateKey: string): string {
  const { month, day } = parseDateKey(dateKey);

  return `${MONTH_NAMES[month - 1]} ${day}`;
}

// "Nov 2 – 8", or "Oct 30 – Nov 5" across months.
export function formatWeekRange(week: Week): string {
  const start = parseDateKey(week.start);
  const end = parseDateKey(week.end);

  return start.month === end.month
    ? `${formatShortDate(week.start)} – ${end.day}`
    : `${formatShortDate(week.start)} – ${formatShortDate(week.end)}`;
}

export function getWeekYear(week: Week): number {
  return parseDateKey(week.end).year;
}

export function getWeekdayName(dateKey: string): string {
  return WEEKDAY_NAMES[getWeekdayIndex(dateKey)];
}

export function pluralize(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function pluralDays(count: number): string {
  return pluralize(count, "day", "days");
}

const MINUS = "−";

export function formatDelta(delta: number): {
  symbol: "▲" | "▼" | "＝";
  text: string;
  srLabel: string;
} {
  if (delta > 0) {
    return {
      symbol: "▲",
      text: `+${delta}`,
      srLabel: `${delta} more than last week`,
    };
  }

  if (delta < 0) {
    return {
      symbol: "▼",
      text: `${MINUS}${-delta}`,
      srLabel: `${-delta} fewer than last week`,
    };
  }

  return { symbol: "＝", text: "Same", srLabel: "Same as last week" };
}
