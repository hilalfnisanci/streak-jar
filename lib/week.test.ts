import { type Jar, type JarStorage, type MarbleEntry } from "./storage";
import { shiftDateKey } from "./streak";
import {
  computeWeekRecap,
  formatDelta,
  formatWeekRange,
  getWeek,
  hasFinishedWeek,
} from "./week";

const TODAY = "2026-11-10";

function span(from: string, to: string) {
  const days: string[] = [];

  for (let day = from; day <= to; day = shiftDateKey(day, 1)) {
    days.push(day);
  }

  return days;
}

function asObjects(days: string[]): MarbleEntry[] {
  return days.map((date) => ({ date, at: `${date}T09:00:00.000Z` }));
}

function makeJar(overrides: Partial<Jar> & Pick<Jar, "id">): Jar {
  return {
    name: overrides.id,
    target: 60,
    color: "coral",
    marbles: [],
    createdAt: "2026-10-01T09:00:00.000Z",
    ...overrides,
  };
}

function storage(jars: Jar[], completed: Jar[] = []): JarStorage {
  return { jars, completed };
}

describe("week ranges", () => {
  it.each([
    ["2026-11-10", "2026-11-02", "2026-11-08", "Nov 2 – 8", "2026-11-09"],
    ["2026-11-09", "2026-11-02", "2026-11-08", "Nov 2 – 8", "2026-11-09"],
    ["2026-11-15", "2026-11-02", "2026-11-08", "Nov 2 – 8", "2026-11-09"],
    ["2026-11-11", "2026-11-02", "2026-11-08", "Nov 2 – 8", "2026-11-09"],
    ["2026-11-12", "2026-11-02", "2026-11-08", "Nov 2 – 8", "2026-11-09"],
    ["2026-11-03", "2026-10-26", "2026-11-01", "Oct 26 – Nov 1", "2026-11-02"],
    ["2027-01-05", "2026-12-28", "2027-01-03", "Dec 28 – Jan 3", "2027-01-04"],
  ])(
    "today %s gives last week %s..%s",
    (today, lastStart, lastEnd, label, thisStart) => {
      const last = getWeek(today, "last");

      expect(last.start).toBe(lastStart);
      expect(last.end).toBe(lastEnd);
      expect(last.days).toHaveLength(7);
      expect(formatWeekRange(last)).toBe(label);
      expect(getWeek(today, "this").start).toBe(thisStart);
    },
  );

  it("labels this week for Tue Nov 10", () => {
    expect(formatWeekRange(getWeek(TODAY, "this"))).toBe("Nov 9 – 15");
  });
});

describe("computeWeekRecap", () => {
  it("derives full weeks, short weeks and comparisons (AC3–AC5)", () => {
    const morningPages = makeJar({
      id: "a",
      marbles: [
        ...["2026-10-26", "2026-10-27", "2026-10-29"],
        ...asObjects(["2026-10-30", "2026-11-01"]),
        ...span("2026-11-02", "2026-11-08"),
      ],
    });
    const reading = makeJar({
      id: "b",
      color: "lavender",
      marbles: asObjects([
        "2026-10-27",
        "2026-10-29",
        "2026-10-31",
        "2026-11-01",
        "2026-11-02",
        "2026-11-03",
        "2026-11-05",
        "2026-11-08",
      ]),
    });
    const walk = makeJar({
      id: "c",
      marbles: ["2026-10-26", "2026-10-28", "2026-11-04", "2026-11-06"],
    });

    const recap = computeWeekRecap(
      storage([morningPages, reading, walk]),
      TODAY,
      "last",
    );
    const [a, b, c] = recap.jars;

    expect(a).toMatchObject({
      marbles: 7,
      daysInScope: 7,
      longestStreak: 7,
      isFull: true,
      isFirstWeek: false,
      previous: 5,
      delta: 2,
    });
    expect(b).toMatchObject({
      marbles: 4,
      daysInScope: 7,
      longestStreak: 2,
      isFull: false,
      previous: 4,
      delta: 0,
    });
    expect(b.days).toEqual([
      "marble",
      "marble",
      "missed",
      "marble",
      "missed",
      "missed",
      "marble",
    ]);
    expect(c.delta).toBe(0);
    expect(recap).toMatchObject({
      total: 13,
      bestStreak: 7,
      comparison: { delta: 2, previousTotal: 11 },
      fullCount: 1,
      allFirstWeek: false,
    });
    expect(formatDelta(2)).toEqual({
      symbol: "▲",
      text: "+2",
      srLabel: "2 more than last week",
    });
    expect(formatDelta(-1)).toEqual({
      symbol: "▼",
      text: "−1",
      srLabel: "1 fewer than last week",
    });
    expect(formatDelta(0).text).toBe("Same");
  });

  it("counts a first week from the creation day (AC6, AC7)", () => {
    const starter = makeJar({
      id: "starter",
      createdAt: "2026-11-04T09:00:00.000Z",
      marbles: asObjects(span("2026-11-04", "2026-11-08")),
    });
    const stretch = makeJar({
      id: "stretch",
      createdAt: "2026-11-04T09:00:00.000Z",
      marbles: ["2026-11-04", "2026-11-05", "2026-11-07", "2026-11-08"],
    });

    const recap = computeWeekRecap(storage([starter, stretch]), TODAY, "last");

    expect(recap.jars[0]).toMatchObject({
      days: ["before", "before", "marble", "marble", "marble", "marble", "marble"],
      marbles: 5,
      daysInScope: 5,
      isFirstWeek: true,
      isFull: true,
      previous: null,
      delta: null,
    });
    expect(recap.jars[1]).toMatchObject({
      marbles: 4,
      daysInScope: 5,
      isFull: false,
    });
    expect(recap.allFirstWeek).toBe(true);
    expect(recap.comparison).toBeNull();
  });

  it("lists jars by activity and marks mid-week completion (AC8, AC11)", () => {
    const quiet = makeJar({
      id: "quiet",
      marbles: span("2026-10-26", "2026-10-28"),
    });
    const createdLater = makeJar({
      id: "later",
      createdAt: "2026-11-09T09:00:00.000Z",
    });
    const shelved = makeJar({
      id: "shelved",
      completedAt: "2026-11-05T15:00:00.000Z",
      marbles: span("2026-11-02", "2026-11-05"),
    });
    const keptOnDisplay = makeJar({
      id: "kept",
      completedAt: "2026-10-20T15:00:00.000Z",
      marbles: span("2026-10-14", "2026-10-20"),
    });
    const data = storage([quiet, createdLater, keptOnDisplay], [shelved]);

    const last = computeWeekRecap(data, TODAY, "last");

    expect(last.jars.map((jarWeek) => jarWeek.jar.id)).toEqual([
      "quiet",
      "shelved",
    ]);
    expect(last.jars[0]).toMatchObject({ marbles: 0, previous: 3, delta: -3 });
    expect(last.jars[1]).toMatchObject({
      marbles: 4,
      isFull: false,
      filledOn: "2026-11-05",
    });

    const quietOnly = computeWeekRecap(storage([quiet]), TODAY, "last");

    expect(quietOnly.total).toBe(0);
    expect(quietOnly.comparison).toEqual({ delta: -3, previousTotal: 3 });

    const thisWeek = computeWeekRecap(data, TODAY, "this");

    expect(thisWeek.jars.map((jarWeek) => jarWeek.jar.id)).toEqual([
      "quiet",
      "later",
    ]);
  });

  it("marks future days this week and never offers a badge (AC9)", () => {
    const jar = makeJar({
      id: "a",
      createdAt: "2026-11-09T08:00:00.000Z",
      marbles: ["2026-11-09", "2026-11-10"],
    });

    const recap = computeWeekRecap(storage([jar]), TODAY, "this");

    expect(recap.daysSoFar).toBe(2);
    expect(recap.jars[0]).toMatchObject({
      days: ["marble", "marble", "future", "future", "future", "future", "future"],
      marbles: 2,
      daysInScope: 2,
      isFull: false,
    });
  });

  it("counts distinct valid legacy and object marbles only (AC12)", () => {
    const jar = makeJar({
      id: "legacy",
      createdAt: "not a timestamp",
      marbles: [
        "2026-11-02",
        { date: "2026-11-02", at: "2026-11-02T08:00:00.000Z" },
        { date: "2026-11-03", at: "2026-11-03T08:00:00.000Z" },
        "2026-11-04",
        "not-a-date",
        { date: "2026/11/05", at: "x" },
        null,
        42,
        { at: "2026-11-06T08:00:00.000Z" },
      ] as unknown as MarbleEntry[],
    });

    const [jarWeek] = computeWeekRecap(storage([jar]), TODAY, "last").jars;

    expect(jarWeek).toMatchObject({
      marbles: 3,
      daysInScope: 7,
      longestStreak: 3,
      isFirstWeek: false,
    });
  });

  it("reports no finished week when every jar is from this week (AC10)", () => {
    const thisWeekJars = storage(
      [makeJar({ id: "a", createdAt: "2026-11-09T06:00:00.000Z" })],
      [makeJar({ id: "b", createdAt: "2026-11-10T06:00:00.000Z" })],
    );

    expect(hasFinishedWeek(thisWeekJars, TODAY)).toBe(false);
    expect(
      hasFinishedWeek(
        storage([makeJar({ id: "c", createdAt: "2026-11-08T20:00:00.000Z" })]),
        TODAY,
      ),
    ).toBe(true);
  });
});

describe("computeWeekRecap across DST (AC13)", () => {
  const originalTimeZone = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = "Europe/Berlin";
  });

  afterEach(() => {
    process.env.TZ = originalTimeZone;
  });

  it("fills the week after the October DST change without skipping a day", () => {
    // 22:30 UTC on Oct 25 is 23:30 in Berlin (CET), so the jar was created on
    // Sunday Oct 25 local time and Oct 26 – Nov 1 is not its first week.
    const jar = makeJar({
      id: "dst",
      createdAt: "2026-10-25T22:30:00.000Z",
      marbles: asObjects(span("2026-10-25", "2026-11-01")),
    });

    const recap = computeWeekRecap(storage([jar]), "2026-11-03", "last");

    expect(recap.week.days).toEqual(span("2026-10-26", "2026-11-01"));
    expect(new Set(recap.week.days).size).toBe(7);
    expect(recap.jars[0]).toMatchObject({
      marbles: 7,
      daysInScope: 7,
      longestStreak: 7,
      isFull: true,
      isFirstWeek: false,
      previous: 1,
    });
  });
});
