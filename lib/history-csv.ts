import { type Jar, type JarStorage } from "./storage";
import { isValidDateKey, shiftDateKey } from "./streak";

export const HISTORY_CSV_HEADER = [
  "jar_name",
  "jar_status",
  "date",
  "time",
  "streak_day",
  "jar_id",
];

// Excel opens a UTF-8 CSV as the system code page unless it starts with a BOM.
const UTF8_BOM = "\uFEFF";

// Spreadsheets evaluate a cell that starts with one of these as a formula.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export type HistoryRow = {
  jarName: string;
  status: "active" | "completed";
  date: string;
  time: string;
  streakDay: number;
  jarId: string;
};

function formatLocalTime(iso: string): string | undefined {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

// Map each valid day key to its earliest marble timestamp, if any entry for
// that day has one. Legacy string marbles carry a date only.
function collectDays(marbles: readonly unknown[]): Map<string, string | undefined> {
  const days = new Map<string, string | undefined>();

  for (const marble of marbles) {
    let date: unknown;
    let at: unknown;

    if (typeof marble === "string") {
      date = marble;
    } else if (marble && typeof marble === "object") {
      ({ date, at } = marble as { date?: unknown; at?: unknown });
    }

    if (!isValidDateKey(date)) {
      continue;
    }

    const earliest = days.get(date);
    const valid = typeof at === "string" && !Number.isNaN(Date.parse(at));

    if (valid && (earliest === undefined || Date.parse(at as string) < Date.parse(earliest))) {
      days.set(date, at as string);
    } else if (!days.has(date)) {
      days.set(date, undefined);
    }
  }

  return days;
}

function jarRows(jar: Jar, status: HistoryRow["status"]): HistoryRow[] {
  const days = collectDays(Array.isArray(jar.marbles) ? jar.marbles : []);
  const dates = [...days.keys()].sort();
  const rows: HistoryRow[] = [];
  let previous: string | undefined;
  let streakDay = 0;

  for (const date of dates) {
    // Same consecutive-day rule as computeStreak, counted forward.
    streakDay = previous === shiftDateKey(date, -1) ? streakDay + 1 : 1;
    previous = date;

    const at = days.get(date);

    rows.push({
      jarName: jar.name,
      status,
      date,
      time: at === undefined ? "" : (formatLocalTime(at) ?? ""),
      streakDay,
      // Imported backups are not type-checked; keep a missing id from breaking the export.
      jarId: String(jar.id ?? ""),
    });
  }

  return rows;
}

// One row per distinct completed day: active jars first, then completed jars,
// each in stored order with its days oldest first.
export function buildHistoryRows(storage: JarStorage): HistoryRow[] {
  return [
    ...storage.jars.flatMap((jar) => jarRows(jar, "active")),
    ...storage.completed.flatMap((jar) => jarRows(jar, "completed")),
  ];
}

function toCsvCell(value: string): string {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;

  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function serializeHistoryCsv(rows: readonly HistoryRow[]): string {
  const lines = [
    HISTORY_CSV_HEADER,
    ...rows.map((row) => [
      row.jarName,
      row.status,
      row.date,
      row.time,
      String(row.streakDay),
      row.jarId,
    ]),
  ].map((cells) => cells.map(toCsvCell).join(","));

  return `${UTF8_BOM}${lines.join("\r\n")}\r\n`;
}

export function getHistoryFileName(today: string): string {
  return `streak-jar-history-${today}.csv`;
}
