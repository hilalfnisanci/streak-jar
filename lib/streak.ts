import { getLocalDateKey } from "./local-date";
import { type MarbleEntry } from "./storage";

export type Marble = MarbleEntry;

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

function getMarbleDate(marble: unknown) {
  if (typeof marble === "string") {
    return marble;
  }

  if (marble && typeof marble === "object" && "date" in marble) {
    const date = (marble as { date?: unknown }).date;

    return typeof date === "string" ? date : "";
  }

  return "";
}

function normalizeStreakCount(streak: number) {
  if (!Number.isFinite(streak)) {
    return 0;
  }

  return Math.max(0, Math.floor(streak));
}

function shiftDateKey(dateKey: string, offsetDays: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + offsetDays);

  // Shift date-only keys in UTC so daylight saving changes cannot skip a day.
  return date.toISOString().slice(0, 10);
}

export function computeStreak(marbles: Marble[]): number {
  const marbleDates = new Set(
    marbles
      .map((marble) => getMarbleDate(marble))
      .filter((date) => dateKeyPattern.test(date)),
  );
  let streak = 0;
  let cursorDate = getLocalDateKey(new Date());

  while (marbleDates.has(cursorDate)) {
    streak += 1;
    cursorDate = shiftDateKey(cursorDate, -1);
  }

  return normalizeStreakCount(streak);
}

export function computeLongestStreak(marbles: Marble[]): number {
  const days = new Set<number>();

  for (const marble of marbles) {
    const dateKey = getMarbleDate(marble);
    if (!dateKeyPattern.test(dateKey)) {
      continue;
    }

    // UTC is only a calendar-day index here; the stored local date stays authoritative.
    const timestamp = Date.parse(`${dateKey}T00:00:00.000Z`);
    if (
      Number.isFinite(timestamp) &&
      new Date(timestamp).toISOString().slice(0, 10) === dateKey
    ) {
      days.add(timestamp / 86_400_000);
    }
  }

  let longest = 0;
  let current = 0;
  let previous: number | undefined;

  for (const day of [...days].sort((a, b) => a - b)) {
    current = previous !== undefined && day === previous + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = day;
  }

  return longest;
}
