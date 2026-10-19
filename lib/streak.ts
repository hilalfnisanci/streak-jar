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
