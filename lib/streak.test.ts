import { computeStreak, type Marble } from "./streak";

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

  it("counts the local day at 01:00, before the UTC date changes", () => {
    vi.setSystemTime(new Date("2026-06-10T01:00:00+03:00"));

    expect(computeStreak(["2026-06-08", "2026-06-09", "2026-06-10"])).toBe(3);
    expect(computeStreak(["2026-06-09"])).toBe(0);
  });

  it.each([
    ["2026-01-01", "2025-12-31", "2025-12-30"],
    ["2024-03-01", "2024-02-29", "2024-02-28"],
    ["2026-03-01", "2026-02-28", "2026-02-27"],
  ])("counts across calendar boundaries on %s", (today, yesterday, before) => {
    vi.setSystemTime(new Date(`${today}T01:00:00+03:00`));

    expect(computeStreak([before, yesterday, today, today])).toBe(3);
  });

  it("counts today and yesterday as a two-day streak", () => {
    expect(computeStreak(["2026-06-09", "2026-06-10"])).toBe(2);
  });

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
