import { getLocalDateKey } from "./date";

describe("getLocalDateKey", () => {
  it.each([
    [new Date(2026, 5, 10, 1), "2026-06-10"],
    [new Date(2026, 5, 10, 23, 59), "2026-06-10"],
    [new Date(2026, 0, 1, 0), "2026-01-01"],
    [new Date(2028, 1, 29, 1), "2028-02-29"],
  ])("formats %s as the local calendar day", (date, expected) => {
    expect(getLocalDateKey(date)).toBe(expected);
  });
});
