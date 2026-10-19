import { getLocalDateKey } from "./date";

describe("getLocalDateKey", () => {
  it.each([
    [new Date(2026, 5, 9, 1), "2026-06-09"],
    [new Date(2026, 5, 9, 23, 30), "2026-06-09"],
    [new Date(2027, 0, 1, 0), "2027-01-01"],
    [new Date(2028, 1, 29, 1), "2028-02-29"],
  ])("formats %s as the local calendar day", (date, expected) => {
    expect(getLocalDateKey(date)).toBe(expected);
  });
});
