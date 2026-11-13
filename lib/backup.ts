import { jarColorOrder } from "./jar-colors";
import { type Jar, type JarStorage, type MarbleEntry } from "./storage";
import { dateKeyPattern } from "./streak";

export const BACKUP_APP_ID = "streak-jar";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 1_000_000;

export type JarBackup = {
  app: typeof BACKUP_APP_ID;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: JarStorage;
};

export function createBackup(storage: JarStorage, now: Date): JarBackup {
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: { jars: storage.jars, completed: storage.completed },
  };
}

export function serializeBackup(backup: JarBackup): string {
  return JSON.stringify(backup, null, 2);
}

export function getBackupFileName(today: string): string {
  return `streak-jar-backup-${today}.json`;
}

export type ParseResult =
  | { ok: true; storage: JarStorage }
  | { ok: false; errors: string[] };

type JarLists = Record<JarLocation, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDateString(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && dateKeyPattern.test(value);
}

function parseMarble(
  value: unknown,
  path: string,
  errors: string[],
): MarbleEntry | undefined {
  if (isDateKey(value)) {
    return value;
  }

  if (isRecord(value) && isDateKey(value.date) && typeof value.at === "string") {
    return { date: value.date, at: value.at };
  }

  errors.push(
    `${path}: must be a YYYY-MM-DD date or an object with a YYYY-MM-DD "date" and an "at" time`,
  );

  return undefined;
}

// Build a new Jar from the known fields only, so a backup cannot add arbitrary
// keys to storage.
function parseJar(value: unknown, path: string, errors: string[]): Jar | undefined {
  if (!isRecord(value)) {
    errors.push(`${path}: must be an object`);
    return undefined;
  }

  const errorCount = errors.length;
  const { id, name, target, color, marbles, createdAt, completedAt } = value;

  if (typeof id !== "string" || id === "") {
    errors.push(`${path}.id: must be a non-empty string`);
  }

  if (typeof name !== "string" || name.trim() === "") {
    errors.push(`${path}.name: must be a non-empty string`);
  }

  if (
    typeof target !== "number" ||
    !Number.isInteger(target) ||
    target < 5 ||
    target > 365
  ) {
    errors.push(`${path}.target: must be a whole number from 5 to 365`);
  }

  if (
    typeof color !== "string" ||
    !(jarColorOrder as readonly string[]).includes(color)
  ) {
    errors.push(`${path}.color: must be one of ${jarColorOrder.join(", ")}`);
  }

  const parsedMarbles: MarbleEntry[] = [];

  if (Array.isArray(marbles)) {
    marbles.forEach((marble, index) => {
      const parsed = parseMarble(marble, `${path}.marbles[${index}]`, errors);

      if (parsed !== undefined) {
        parsedMarbles.push(parsed);
      }
    });
  } else {
    errors.push(`${path}.marbles: must be a list`);
  }

  if (!isDateString(createdAt)) {
    errors.push(`${path}.createdAt: must be a date`);
  }

  if (completedAt !== undefined && !isDateString(completedAt)) {
    errors.push(`${path}.completedAt: must be a date`);
  }

  if (errors.length > errorCount) {
    return undefined;
  }

  const jar: Jar = {
    id: id as string,
    name: (name as string).trim(),
    target: target as number,
    color: color as string,
    marbles: parsedMarbles,
    createdAt: createdAt as string,
  };

  if (completedAt !== undefined) {
    jar.completedAt = completedAt as string;
  }

  return jar;
}

export function parseBackup(text: string): ParseResult {
  let value: unknown;

  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["file: is not valid JSON"] };
  }

  if (!isRecord(value)) {
    return { ok: false, errors: ["file: must be a Streak Jar backup object"] };
  }

  const errors: string[] = [];

  if (value.app !== BACKUP_APP_ID) {
    errors.push(`app: must be "${BACKUP_APP_ID}"`);
  }

  if (typeof value.version === "number" && value.version > BACKUP_VERSION) {
    errors.push(
      "version: this backup was made by a newer version of Streak Jar",
    );
  } else if (value.version !== BACKUP_VERSION) {
    errors.push(`version: must be ${BACKUP_VERSION}`);
  }

  if (!isRecord(value.data)) {
    errors.push("data: must be an object");
    return { ok: false, errors };
  }

  const data = value.data as JarLists;
  const storage: JarStorage = { jars: [], completed: [] };
  const seenIds = new Set<string>();

  for (const location of ["jars", "completed"] as const) {
    const list = data[location];

    if (!Array.isArray(list)) {
      errors.push(`data.${location}: must be a list`);
      continue;
    }

    list.forEach((item, index) => {
      const path = `data.${location}[${index}]`;
      const jar = parseJar(item, path, errors);

      if (!jar) {
        return;
      }

      if (seenIds.has(jar.id)) {
        errors.push(`${path}.id: "${jar.id}" is used by more than one jar`);
        return;
      }

      seenIds.add(jar.id);
      storage[location].push(jar);
    });
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, storage };
}

export type JarLocation = "jars" | "completed";

export type JarConflict = {
  id: string;
  local: Jar;
  localIn: JarLocation;
  incoming: Jar;
  incomingIn: JarLocation;
};

export type ConflictChoice = "local" | "incoming" | "both";

export type MergeSummary = {
  added: number;
  replaced: number;
  kept: number;
  unchanged: number;
};

type LocatedJar = { jar: Jar; location: JarLocation };

function indexJars(storage: JarStorage): Map<string, LocatedJar> {
  const index = new Map<string, LocatedJar>();

  for (const location of ["jars", "completed"] as const) {
    for (const jar of storage[location]) {
      index.set(jar.id, { jar, location });
    }
  }

  return index;
}

function sameMarble(a: MarbleEntry, b: MarbleEntry): boolean {
  if (typeof a === "string" || typeof b === "string") {
    return a === b;
  }

  return a.date === b.date && a.at === b.at;
}

function sameJar(a: Jar, b: Jar): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.target === b.target &&
    a.color === b.color &&
    a.createdAt === b.createdAt &&
    a.completedAt === b.completedAt &&
    a.marbles.length === b.marbles.length &&
    a.marbles.every((marble, index) => sameMarble(marble, b.marbles[index]))
  );
}

// A conflict is a local jar and a backup jar with the same id whose contents
// differ. Identical jars are not conflicts; the merge skips them.
export function findConflicts(
  local: JarStorage,
  incoming: JarStorage,
): JarConflict[] {
  const localIndex = indexJars(local);
  const conflicts: JarConflict[] = [];

  for (const incomingIn of ["jars", "completed"] as const) {
    for (const jar of incoming[incomingIn]) {
      const match = localIndex.get(jar.id);

      if (match && !sameJar(match.jar, jar)) {
        conflicts.push({
          id: jar.id,
          local: match.jar,
          localIn: match.location,
          incoming: jar,
          incomingIn,
        });
      }
    }
  }

  return conflicts;
}

// Merge a validated backup into local storage without mutating either input.
// Local jars keep their order; backup jars are appended in backup order. A
// conflict with no entry in `choices` keeps the local jar.
export function mergeBackup(
  local: JarStorage,
  incoming: JarStorage,
  choices: Record<string, ConflictChoice>,
  createId: () => string,
): { storage: JarStorage; summary: MergeSummary } {
  const localIndex = indexJars(local);
  const replacedIds = new Set<string>();
  const appended: JarStorage = { jars: [], completed: [] };
  const summary: MergeSummary = { added: 0, replaced: 0, kept: 0, unchanged: 0 };

  for (const location of ["jars", "completed"] as const) {
    for (const jar of incoming[location]) {
      const match = localIndex.get(jar.id);

      if (!match) {
        appended[location].push(jar);
        summary.added += 1;
        continue;
      }

      if (sameJar(match.jar, jar)) {
        summary.unchanged += 1;
        continue;
      }

      const choice = choices[jar.id] ?? "local";

      if (choice === "incoming") {
        replacedIds.add(jar.id);
        appended[location].push(jar);
        summary.replaced += 1;
      } else if (choice === "both") {
        appended[location].push({ ...jar, id: createId() });
        summary.added += 1;
      } else {
        summary.kept += 1;
      }
    }
  }

  // A replaced jar stays in place when it remains in the same list, and moves
  // to the end of the other list when the backup has it there.
  const mergeList = (location: JarLocation): Jar[] => {
    const incomingById = new Map(
      appended[location].map((jar) => [jar.id, jar]),
    );
    const merged = local[location]
      .filter((jar) => !replacedIds.has(jar.id) || incomingById.has(jar.id))
      .map((jar) => (replacedIds.has(jar.id) ? incomingById.get(jar.id)! : jar));
    const inPlace = new Set(merged.map((jar) => jar.id));

    return [...merged, ...appended[location].filter((jar) => !inPlace.has(jar.id))];
  };

  return {
    storage: { jars: mergeList("jars"), completed: mergeList("completed") },
    summary,
  };
}
