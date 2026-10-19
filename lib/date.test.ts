import { getLocalDateKey } from "./date";

describe("getLocalDateKey", () => {
  it.each([
    [new Date(2026, 5, 10, 1), "2026-06-10"],
    [new Date(2026, 0, 1, 0), "2026-01-01"],
    [new Date(2024, 1, 29, 23, 59), "2024-02-29"],
    [new Date(2026, 11, 31, 23, 59), "2026-12-31"],
  ])("formats %s as the local calendar date %s", (date, expected) => {
    expect(getLocalDateKey(date)).toBe(expected);
  });
});
