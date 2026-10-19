import { getLocalDateKey } from "./date";

describe("getLocalDateKey", () => {
  it.each([0, 1, 9, 23])("uses the local calendar day at hour %i", (hour) => {
    expect(getLocalDateKey(new Date(2026, 5, 10, hour))).toBe("2026-06-10");
  });

  it("pads single-digit months and days", () => {
    expect(getLocalDateKey(new Date(2026, 0, 2, 1))).toBe("2026-01-02");
  });
});
