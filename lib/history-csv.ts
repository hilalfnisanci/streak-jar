import { type Jar, type JarStorage } from "./storage";
import { getMarbleDateSet, shiftDateKey } from "./streak";

const HISTORY_CSV_HEADER = [
  "jar_name",
  "jar_status",
  "date",
  "time",
  "streak_day",
  "jar_id",
] as const;

// Lets Excel detect UTF-8 so non-ASCII jar names (ğ, ş, İ…) are not garbled.
const UTF8_BOM = "\uFEFF";
// RFC 4180 records end with CRLF.
const LINE_END = "\r\n";
// Spreadsheets run a cell starting with one of these as a formula.
const FORMULA_START = /^[=+\-@\t\r]/;

function toCell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;

  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function formatLocalTime(ms: number): string {
  const date = new Date(ms);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

// Earliest valid `at` per day key; legacy string marbles carry no time.
function getEarliestTimes(marbles: readonly unknown[]): Map<string, string> {
  const earliest = new Map<string, number>();

  for (const marble of marbles) {
    if (!marble || typeof marble !== "object") {
      continue;
    }

    const { date, at } = marble as { date?: unknown; at?: unknown };
    const ms = typeof at === "string" ? Date.parse(at) : Number.NaN;

    if (typeof date === "string" && !Number.isNaN(ms)) {
      earliest.set(date, Math.min(ms, earliest.get(date) ?? ms));
    }
  }

  return new Map(
    [...earliest].map(([date, ms]) => [date, formatLocalTime(ms)]),
  );
}

function getJarRows(jar: Jar, status: "active" | "completed"): string[][] {
  const marbles: readonly unknown[] = Array.isArray(jar.marbles) ? jar.marbles : [];
  const dates = [...getMarbleDateSet(marbles)].sort();
  const times = getEarliestTimes(marbles);
  const rows: string[][] = [];
  let streakDay = 0;
  let previousDate = "";

  for (const date of dates) {
    streakDay = previousDate === shiftDateKey(date, -1) ? streakDay + 1 : 1;
    previousDate = date;
    rows.push([
      String(jar.name ?? ""),
      status,
      date,
      times.get(date) ?? "",
      String(streakDay),
      String(jar.id ?? ""),
    ]);
  }

  return rows;
}

// One row per distinct valid marble day: active jars first, then completed,
// each in storage order, dates ascending within a jar.
export function createHistoryCsv(storage: JarStorage): string {
  const rows: string[][] = [
    [...HISTORY_CSV_HEADER],
    ...storage.jars.flatMap((jar) => getJarRows(jar, "active")),
    ...storage.completed.flatMap((jar) => getJarRows(jar, "completed")),
  ];

  return UTF8_BOM + rows.map((row) => row.map(toCell).join(",")).join(LINE_END) + LINE_END;
}

export function getHistoryFileName(today: string): string {
  return `streak-jar-history-${today}.csv`;
}
