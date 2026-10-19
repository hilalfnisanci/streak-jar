import { getLocalDateKey } from "./date";

describe("getLocalDateKey", () => {
  it.each([
    ["2026-06-09T01:00:00+03:00", "2026-06-09"],
    ["2026-06-09T09:00:00+03:00", "2026-06-09"],
    ["2026-06-09T23:59:59+03:00", "2026-06-09"],
    ["2026-06-10T00:00:00+03:00", "2026-06-10"],
    ["2027-01-01T00:00:00+03:00", "2027-01-01"],
  ])("maps %s to local day %s", (instant, expected) => {
    expect(getLocalDateKey(new Date(instant))).toBe(expected);
  });
});
