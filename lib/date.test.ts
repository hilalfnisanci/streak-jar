import { getLocalDateKey } from "./date";

describe("getLocalDateKey", () => {
  it.each([
    ["2026-06-10T01:00:00+03:00", "2026-06-10"],
    ["2026-06-10T09:00:00+03:00", "2026-06-10"],
    ["2026-06-10T23:59:59+03:00", "2026-06-10"],
    ["2026-06-11T00:00:00+03:00", "2026-06-11"],
    ["2026-01-01T00:00:00+03:00", "2026-01-01"],
  ])("formats %s as the local calendar day", (instant, expected) => {
    expect(getLocalDateKey(new Date(instant))).toBe(expected);
  });
});
