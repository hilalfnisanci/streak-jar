import { type MarbleEntry } from "./storage";

export type Marble = MarbleEntry;

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMarbleDate(marble: Marble) {
  return typeof marble === "string" ? marble : marble.date;
}

function shiftDateKey(dateKey: string, offsetDays: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + offsetDays);

  return getDateKey(date);
}

export function computeStreak(marbles: Marble[]): number {
  const marbleDates = new Set(
    marbles
      .map((marble) => getMarbleDate(marble))
      .filter((date) => dateKeyPattern.test(date)),
  );
  let streak = 0;
  let cursorDate = getDateKey(new Date());

  while (marbleDates.has(cursorDate)) {
    streak += 1;
    cursorDate = shiftDateKey(cursorDate, -1);
  }

  return streak;
}
