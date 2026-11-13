import { createHistoryCsv, getHistoryFileName } from "./history-csv";
import { type Jar, type JarStorage } from "./storage";

function makeJar(overrides: Partial<Jar> = {}): Jar {
  return {
    id: "jar-a",
    name: "Reading",
    target: 30,
    color: "mint",
    marbles: [],
    createdAt: "2026-11-01T08:00:00.000Z",
    ...overrides,
  };
}

function lines(storage: JarStorage) {
  return createHistoryCsv(storage).split("\r\n");
}

describe("createHistoryCsv", () => {
  it("writes a BOM and only the header when there are no jars", () => {
    const csv = createHistoryCsv({ jars: [], completed: [] });

    expect(csv).toBe("﻿jar_name,jar_status,date,time,streak_day,jar_id\r\n");
  });

  it("writes one row per valid day with local time and streak day", () => {
    // Vitest runs in Europe/Istanbul (UTC+3).
    const storage: JarStorage = {
      jars: [
        makeJar({
          marbles: [
            { date: "2026-11-05", at: "2026-11-05T06:00:00.000Z" },
            "2026-11-01",
            { date: "2026-11-02", at: "2026-11-02T18:30:00.000Z" },
            { date: "2026-11-02", at: "2026-11-02T05:15:00.000Z" },
            "2026-11-03",
            "2026-11-03",
            "not-a-date",
            { date: "2026/11/04", at: "2026-11-04T07:00:00.000Z" },
            { date: "2026-11-05", at: "garbage" },
            null as unknown as string,
          ],
        }),
      ],
      completed: [
        makeJar({ id: "jar-b", name: "Walking", marbles: ["2026-10-30"] }),
      ],
    };

    expect(lines(storage).slice(1)).toEqual([
      "Reading,active,2026-11-01,,1,jar-a",
      "Reading,active,2026-11-02,08:15,2,jar-a",
      "Reading,active,2026-11-03,,3,jar-a",
      "Reading,active,2026-11-05,09:00,1,jar-a",
      "Walking,completed,2026-10-30,,1,jar-b",
      "",
    ]);
  });

  it("quotes special characters and neutralises formula-like names", () => {
    const names = ['Su, "günde 2L"', "Line\nbreak", "=1+1", "+90", "-5", "@SUM(A1)", "ğüşıöç İ"];
    const csv = createHistoryCsv({
      jars: names.map((name, index) =>
        makeJar({ id: `jar-${index}`, name, marbles: ["2026-11-01"] }),
      ),
      completed: [],
    });

    expect(csv.split("\r\n").slice(1, -1).map((row) => row.split(",active,")[0])).toEqual([
      '"Su, ""günde 2L"""',
      '"Line\nbreak"',
      "'=1+1",
      "'+90",
      "'-5",
      "'@SUM(A1)",
      "ğüşıöç İ",
    ]);
  });
});

describe("getHistoryFileName", () => {
  it("uses the given local date", () => {
    expect(getHistoryFileName("2026-11-13")).toBe("streak-jar-history-2026-11-13.csv");
  });
});
