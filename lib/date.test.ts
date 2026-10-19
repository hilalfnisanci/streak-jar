import { getLocalDateKey } from "./date";

describe("getLocalDateKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["Europe/Istanbul", "2026-06-09T22:00:00Z", "2026-06-10"],
    ["Europe/Istanbul", "2026-06-10T06:00:00Z", "2026-06-10"],
    ["America/Los_Angeles", "2026-06-11T06:00:00Z", "2026-06-10"],
    ["Asia/Kathmandu", "2026-06-09T18:30:00Z", "2026-06-10"],
    ["UTC", "2026-06-09T22:00:00Z", "2026-06-09"],
    ["Europe/Istanbul", "2025-12-31T22:00:00Z", "2026-01-01"],
  ])("formats the local day in %s at %s", (timezone, now, expected) => {
    vi.stubEnv("TZ", timezone);

    expect(getLocalDateKey(new Date(now))).toBe(expected);
  });
});
