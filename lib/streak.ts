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

export function shiftDateKey(dateKey: string, offsetDays: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + offsetDays);

  // Shift date-only keys in UTC so daylight saving changes cannot skip a day.
  return date.toISOString().slice(0, 10);
}

// A YYYY-MM-DD key for a real calendar day: "2024-02-29" passes, while
// "2026-02-30" and "2026-13-01" fail because they do not round-trip.
export function isValidDateKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    dateKeyPattern.test(value) &&
    shiftDateKey(value, 0) === value
  );
}

// Distinct valid marble day keys. Legacy strings and {date, at} objects count
// the same; malformed entries are ignored.
export function getMarbleDateSet(marbles: readonly unknown[]): Set<string> {
  return new Set(
    marbles
      .map((marble) => getMarbleDate(marble))
      .filter(isValidDateKey),
  );
}

// A streak stays alive until the day ends: with no marble yet today, it is
// counted back from yesterday.
export function computeStreak(marbles: Marble[]): number {
  const marbleDates = getMarbleDateSet(marbles);
  const today = getLocalDateKey(new Date());
  let streak = 0;
  let cursorDate = marbleDates.has(today) ? today : shiftDateKey(today, -1);

  while (marbleDates.has(cursorDate)) {
    streak += 1;
    cursorDate = shiftDateKey(cursorDate, -1);
  }

  return normalizeStreakCount(streak);
}
