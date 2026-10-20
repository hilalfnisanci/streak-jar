import { computeLongestStreak, computeStreak, type Marble } from "./streak";

describe("computeStreak", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for an empty jar", () => {
    expect(computeStreak([])).toBe(0);
  });

  it("counts only today as a one-day streak", () => {
    expect(computeStreak(["2026-06-10"])).toBe(1);
  });

  it("counts today and yesterday as a two-day streak", () => {
    expect(computeStreak(["2026-06-09", "2026-06-10"])).toBe(2);
  });

  it.each([1, 23])("counts local calendar days at %i:00", (hour) => {
    vi.setSystemTime(new Date(2026, 5, 10, hour));

    expect(
      computeStreak([
        "2026-06-08",
        "2026-06-09",
        { date: "2026-06-10", at: new Date().toISOString() },
        "2026-06-10",
      ]),
    ).toBe(3);
    expect(computeStreak(["2026-06-09"])).toBe(0);
  });

  it.each([
    [2026, 0, 1, ["2025-12-30", "2025-12-31", "2026-01-01"]],
    [2024, 2, 1, ["2024-02-28", "2024-02-29", "2024-03-01"]],
    [2026, 2, 9, ["2026-03-07", "2026-03-08", "2026-03-09"]],
    [2026, 10, 2, ["2026-10-31", "2026-11-01", "2026-11-02"]],
  ] as const)(
    "counts across calendar and DST boundaries ending on %i/%i/%i",
    (year, month, day, dates) => {
      vi.setSystemTime(new Date(year, month, day, 1));

      expect(computeStreak([...dates])).toBe(3);
    },
  );

  it("counts a five-day streak through today", () => {
    expect(
      computeStreak([
        "2026-06-06",
        "2026-06-07",
        "2026-06-08",
        "2026-06-09",
        "2026-06-10",
      ]),
    ).toBe(5);
  });

  it("returns 0 when today is missing even if yesterday exists", () => {
    expect(computeStreak(["2026-06-09"])).toBe(0);
  });

  it("counts only from today back to a mid-history gap", () => {
    expect(
      computeStreak([
        "2026-06-05",
        "2026-06-06",
        "2026-06-08",
        "2026-06-09",
        "2026-06-10",
      ]),
    ).toBe(3);
  });

  it("supports stored marble objects and ignores invalid legacy ids", () => {
    const marbles: Marble[] = [
      "legacy-id",
      { date: "2026-06-08", at: "2026-06-08T12:00:00.000Z" },
      { date: "2026-06-09", at: "2026-06-09T12:00:00.000Z" },
      { date: "2026-06-10", at: "2026-06-10T12:00:00.000Z" },
    ];

    expect(computeStreak(marbles)).toBe(3);
  });

  it("returns a finite non-negative integer for malformed stored marbles", () => {
    const streak = computeStreak([
      "",
      "legacy-id",
      "2026-06-99",
      {},
      { date: undefined },
      { date: null },
      { date: Number.NaN },
      { date: "not-a-date" },
    ] as unknown as Marble[]);

    expect(Number.isFinite(streak)).toBe(true);
    expect(Number.isInteger(streak)).toBe(true);
    expect(streak).toBeGreaterThanOrEqual(0);
    expect(streak).toBe(0);
  });

  it("returns 0 for marbles only from old dates", () => {
    expect(computeStreak(["2026-05-01", "2026-05-02"])).toBe(0);
  });
});

describe("computeLongestStreak", () => {
  it.each([
    { dates: [], expected: 0 },
    { dates: ["2026-06-01"], expected: 1 },
    { dates: ["2026-06-01", "2026-06-02"], expected: 2 },
    { dates: ["2026-06-01", "2026-06-03"], expected: 1 },
  ])("returns $expected for $dates", ({ dates, expected }) => {
    expect(computeLongestStreak(dates)).toBe(expected);
  });

  it("finds the longest group anywhere in history, not just the latest group", () => {
    expect(
      computeLongestStreak([
        "2026-01-01",
        "2026-01-03",
        "2026-01-04",
        "2026-01-05",
        "2026-01-06",
        "2026-06-08",
        "2026-06-09",
        "2026-06-10",
      ]),
    ).toBe(4);
  });

  it("deduplicates mixed, unsorted records using date rather than at without mutation", () => {
    const marbles: Marble[] = [
      { date: "2026-06-10", at: "2026-06-09T22:00:00.000Z" },
      "2026-06-08",
      { date: "2026-06-09", at: "2026-06-10T02:00:00.000Z" },
      "2026-06-10",
      "2026-06-08",
    ];
    const original = structuredClone(marbles);
    marbles.forEach(Object.freeze);
    Object.freeze(marbles);

    expect(computeLongestStreak(marbles)).toBe(3);
    expect(marbles).toEqual(original);
  });

  it("ignores malformed values and impossible dates without bridging valid groups", () => {
    const invalid = [
      "",
      "legacy-id",
      "2026-02-30",
      "2026-02-29",
      "2026-13-01",
      "2026-00-01",
      "2026-06-00",
      "2026-06-99",
      "2026-6-01",
      "2026-06-01T12:00:00.000Z",
      null,
      undefined,
      {},
      { date: undefined },
      { date: null },
      { date: Number.NaN },
      { date: "not-a-date" },
      { at: "2026-06-02T12:00:00.000Z" },
    ] as unknown as Marble[];

    expect(computeLongestStreak(invalid)).toBe(0);
    expect(
      computeLongestStreak([...invalid, "2026-02-28", "2026-03-01"]),
    ).toBe(2);
    expect(
      computeLongestStreak([...invalid, "2026-06-01", "2026-06-03"]),
    ).toBe(1);
  });

  it.each([
    ["2026-04-30", "2026-05-01", "2026-05-02"],
    ["2025-12-31", "2026-01-01", "2026-01-02"],
    ["2024-02-28", "2024-02-29", "2024-03-01"],
    ["2026-03-07", "2026-03-08", "2026-03-09"],
    ["2026-10-31", "2026-11-01", "2026-11-02"],
    ["0099-12-31", "0100-01-01", "0100-01-02"],
  ])("counts consecutive calendar days across %s, %s and %s", (...dates) => {
    expect(computeLongestStreak(dates)).toBe(3);
    expect(computeLongestStreak([dates[0], dates[2]])).toBe(1);
  });
});
