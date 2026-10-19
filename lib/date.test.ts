import { getLocalDateKey } from "./date";

describe("getLocalDateKey", () => {
  it.each([
    ["2026-06-09T01:00:00+03:00", "2026-06-09"],
    ["2026-06-09T09:00:00+03:00", "2026-06-09"],
    ["2026-06-09T23:59:59+03:00", "2026-06-09"],
    ["2026-06-10T00:00:00+03:00", "2026-06-10"],
    ["2026-01-01T00:00:00+03:00", "2026-01-01"],
    ["2024-02-29T00:00:00+03:00", "2024-02-29"],
  ])("uses the local calendar day for %s", (timestamp, expected) => {
    expect(getLocalDateKey(new Date(timestamp))).toBe(expected);
  });
});
