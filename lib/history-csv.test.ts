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
        { date: "2026-11-15", at: localAt(15, 9, 0) },
      ],
    });
    const storage = {
      jars: [reading, makeJar({ id: "jar-empty", name: "Empty" })],
      completed: [
        makeJar({ id: "jar-done", name: "Walking", marbles: ["2026-10-01"] }),
      ],
    };

    expect(buildHistoryRows(storage)).toEqual([
      { jar: "Reading", status: "active", date: "2026-11-12", time: "", streakDay: 1 },
      { jar: "Reading", status: "active", date: "2026-11-14", time: "07:05", streakDay: 1 },
      { jar: "Reading", status: "active", date: "2026-11-15", time: "09:00", streakDay: 2 },
      { jar: "Reading", status: "active", date: "2026-11-16", time: "21:30", streakDay: 3 },
      { jar: "Walking", status: "completed", date: "2026-10-01", time: "", streakDay: 1 },
    ]);
    // The last row of a streak that includes today matches the app's count.
    expect(computeStreak(reading.marbles)).toBe(3);
  });
});

describe("serializeHistoryCsv", () => {
  it("writes only the header when there is no history", () => {
    expect(serializeHistoryCsv([])).toBe("\uFEFFJar,Status,Date,Time,Streak day\r\n");
  });

  it("keeps names in one cell and neutralizes formula prefixes", () => {
    const names = ['Kitap, "çok" güzel', "=HYPERLINK(1)", "-1", "Line\nbreak", "Şükür 🌱"];
    const csv = serializeHistoryCsv(
      names.map((jar) => ({
        jar,
        status: "active" as const,
        date: "2026-11-17",
        time: "08:00",
        streakDay: 1,
      })),
    );

    expect(csv.split("\r\n").slice(1, -1)).toEqual([
      '"Kitap, ""çok"" güzel",active,2026-11-17,08:00,1',
      "'=HYPERLINK(1),active,2026-11-17,08:00,1",
      "'-1,active,2026-11-17,08:00,1",
      '"Line\nbreak",active,2026-11-17,08:00,1',
      "Şükür 🌱,active,2026-11-17,08:00,1",
    ]);
  });
});
