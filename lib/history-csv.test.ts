import { buildHistoryRows, serializeHistoryCsv } from "./history-csv";
import { type Jar } from "./storage";
import { computeStreak } from "./streak";

function makeJar(overrides: Partial<Jar> = {}): Jar {
  return {
    id: "jar-a",
    name: "Reading",
    target: 30,
    color: "mint",
    marbles: [],
    createdAt: "2026-11-01T08:00:00.000Z",
    ...overrides,
  };
}

describe("buildHistoryRows", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Build timestamps from local wall-clock times so the test passes in any TZ.
  const localAt = (day: number, hours: number, minutes: number) =>
    new Date(2026, 10, day, hours, minutes).toISOString();

  it("writes one row per day in order, with local first time and streak day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 16, 23, 30));

    const reading = makeJar({
      marbles: [
        { date: "2026-11-16", at: localAt(16, 21, 30) },
        "2026-11-12",
        { date: "2026-11-14", at: localAt(14, 12, 0) },
        { date: "2026-11-14", at: localAt(14, 7, 5) },
        "not-a-date",
        "2026-02-30",
        { date: "2026-11-15", at: localAt(15, 9, 0) },
      ],
    });
    const habit = makeJar({
      id: "jar-gap",
      name: "Water",
      marbles: ["2026-11-05", "2026-11-01", "2026-11-03", "2026-11-02"],
    });
    const storage = {
      jars: [reading, makeJar({ id: "jar-empty", name: "Empty" }), habit],
      completed: [
        makeJar({ id: "jar-done", name: "Walking", marbles: ["2026-10-01"] }),
      ],
    };
    const row = (
      jarName: string,
      jarId: string,
      status: "active" | "completed",
      date: string,
      time: string,
      streakDay: number,
    ) => ({ jarName, status, date, time, streakDay, jarId });

    expect(buildHistoryRows(storage)).toEqual([
      row("Reading", "jar-a", "active", "2026-11-12", "", 1),
      row("Reading", "jar-a", "active", "2026-11-14", "07:05", 1),
      row("Reading", "jar-a", "active", "2026-11-15", "09:00", 2),
      row("Reading", "jar-a", "active", "2026-11-16", "21:30", 3),
      row("Water", "jar-gap", "active", "2026-11-01", "", 1),
      row("Water", "jar-gap", "active", "2026-11-02", "", 2),
      row("Water", "jar-gap", "active", "2026-11-03", "", 3),
      row("Water", "jar-gap", "active", "2026-11-05", "", 1),
      row("Walking", "jar-done", "completed", "2026-10-01", "", 1),
    ]);
    // The last row of a streak that includes today matches the app's count.
    expect(computeStreak(reading.marbles)).toBe(3);
  });
});

describe("serializeHistoryCsv", () => {
  it("writes only the header when there is no history", () => {
    expect(serializeHistoryCsv([])).toBe(
      "\uFEFFjar_name,jar_status,date,time,streak_day,jar_id\r\n",
    );
  });

  it("keeps names in one cell and neutralizes formula prefixes", () => {
    const names = [
      'Kitap, "çok" güzel',
      "=HYPERLINK(1)",
      "-1",
      "+1",
      "@SUM(A1)",
      "Line\nbreak",
      "İ ğüşıöç 🌱",
    ];
    const csv = serializeHistoryCsv(
      names.map((jarName) => ({
        jarName,
        status: "active" as const,
        date: "2026-11-17",
        time: "08:00",
        streakDay: 1,
        jarId: "jar-a",
      })),
    );

    expect(csv.split("\r\n").slice(1, -1)).toEqual([
      '"Kitap, ""çok"" güzel",active,2026-11-17,08:00,1,jar-a',
      "'=HYPERLINK(1),active,2026-11-17,08:00,1,jar-a",
      "'-1,active,2026-11-17,08:00,1,jar-a",
      "'+1,active,2026-11-17,08:00,1,jar-a",
      "'@SUM(A1),active,2026-11-17,08:00,1,jar-a",
      '"Line\nbreak",active,2026-11-17,08:00,1,jar-a',
      "İ ğüşıöç 🌱,active,2026-11-17,08:00,1,jar-a",
    ]);
  });
});
