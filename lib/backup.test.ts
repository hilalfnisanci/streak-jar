import {
  createBackup,
  findConflicts,
  mergeBackup,
  parseBackup,
  serializeBackup,
} from "./backup";
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

function backupText(data: unknown, envelope: Record<string, unknown> = {}) {
  return JSON.stringify({
    app: "streak-jar",
    version: 1,
    exportedAt: "2026-11-13T09:30:00.000Z",
    data,
    ...envelope,
  });
}

describe("parseBackup", () => {
  it("accepts its own export, including both marble shapes and completed jars", () => {
    const storage: JarStorage = {
      jars: [
        makeJar({
          marbles: ["2026-11-02", { date: "2026-11-03", at: "2026-11-03T07:00:00.000Z" }],
        }),
      ],
      completed: [
        makeJar({
          id: "jar-b",
          target: 5,
          marbles: ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"],
          completedAt: "2026-11-05T20:00:00.000Z",
        }),
      ],
    };

    const text = serializeBackup(createBackup(storage, new Date("2026-11-13T09:30:00.000Z")));

    expect(JSON.parse(text)).toMatchObject({
      app: "streak-jar",
      version: 1,
      exportedAt: "2026-11-13T09:30:00.000Z",
    });
    expect(parseBackup(text)).toEqual({ ok: true, storage });
  });

  it.each([
    ["invalid JSON", "{not json", "file:"],
    ["another app", backupText({ jars: [], completed: [] }, { app: "other" }), "app:"],
    ["a newer version", backupText({ jars: [], completed: [] }, { version: 2 }), "newer version"],
    ["a missing completed list", backupText({ jars: [] }), "data.completed:"],
    ["a target below 5", backupText({ jars: [makeJar({ target: 3 })], completed: [] }), "data.jars[0].target:"],
    ["an unknown colour", backupText({ jars: [], completed: [makeJar({ color: "teal" })] }), "data.completed[0].color:"],
    [
      "a malformed marble date",
      backupText({ jars: [makeJar({ marbles: ["2026-11-02", "11/03/2026"] })], completed: [] }),
      "data.jars[0].marbles[1]:",
    ],
    [
      "an id used twice",
      backupText({ jars: [makeJar()], completed: [makeJar({ completedAt: "2026-11-05T20:00:00.000Z" })] }),
      "data.completed[0].id:",
    ],
  ])("rejects %s with the failing path", (_label, text, expected) => {
    const result = parseBackup(text);

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors.join("\n")).toContain(expected);
  });

  it("keeps only known jar fields and trims the name", () => {
    const result = parseBackup(
      backupText({
        jars: [{ ...makeJar({ name: "  Reading  " }), injected: "<script>" }],
        completed: [],
      }),
    );

    expect(result).toEqual({
      ok: true,
      storage: { jars: [makeJar()], completed: [] },
    });
  });
});

describe("findConflicts", () => {
  it("reports only same-id jars whose contents differ", () => {
    const local: JarStorage = {
      jars: [makeJar(), makeJar({ id: "jar-b", marbles: ["2026-11-02"] })],
      completed: [],
    };
    const changed = makeJar({
      id: "jar-b",
      marbles: ["2026-11-02", "2026-11-03"],
      completedAt: "2026-11-05T20:00:00.000Z",
    });

    expect(
      findConflicts(local, { jars: [makeJar()], completed: [changed] }),
    ).toEqual([
      {
        id: "jar-b",
        local: local.jars[1],
        localIn: "jars",
        incoming: changed,
        incomingIn: "completed",
      },
    ]);
  });
});

describe("mergeBackup", () => {
  it("applies each choice, appends new jars and leaves its inputs unchanged", () => {
    const local: JarStorage = {
      jars: [
        makeJar({ id: "keep", name: "Mine" }),
        makeJar({ id: "replace", name: "Old" }),
        makeJar({ id: "same" }),
        makeJar({ id: "both", name: "Local copy" }),
      ],
      completed: [],
    };
    const incoming: JarStorage = {
      jars: [
        makeJar({ id: "keep", name: "Theirs" }),
        makeJar({ id: "same" }),
        makeJar({ id: "new" }),
        makeJar({ id: "both", name: "Backup copy" }),
      ],
      completed: [
        makeJar({ id: "replace", name: "Finished", completedAt: "2026-11-05T20:00:00.000Z" }),
      ],
    };
    const localBefore = structuredClone(local);
    const incomingBefore = structuredClone(incoming);

    const { storage, summary } = mergeBackup(
      local,
      incoming,
      { replace: "incoming", both: "both" },
      () => "copy-1",
    );

    expect(storage.jars.map((jar) => [jar.id, jar.name])).toEqual([
      ["keep", "Mine"],
      ["same", "Reading"],
      ["both", "Local copy"],
      ["new", "Reading"],
      ["copy-1", "Backup copy"],
    ]);
    expect(storage.completed).toEqual([incoming.completed[0]]);
    expect(summary).toEqual({ added: 2, replaced: 1, kept: 1, unchanged: 1 });
    expect(local).toEqual(localBefore);
    expect(incoming).toEqual(incomingBefore);
  });
});
