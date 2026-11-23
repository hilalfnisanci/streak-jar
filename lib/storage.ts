export const JARS_STORAGE_KEY = "streak-jar.jars";

export type MarbleEntry =
  | string
  | {
      date: string;
      at: string;
    };

export type Jar = {
  id: string;
  name: string;
  target: number;
  color: string;
  marbles: MarbleEntry[];
  createdAt: string;
  completedAt?: string;
};

export type JarStorage = {
  jars: Jar[];
  completed: Jar[];
};

// Persist jars as active and completed lists. Legacy installs stored a bare
// Jar[]; normalize that shape on read so older data keeps working.
function normalizeJarStorage(value: unknown): JarStorage {
  if (Array.isArray(value)) {
    return { jars: value as Jar[], completed: [] };
  }

  if (value && typeof value === "object") {
    const storedValue = value as Partial<JarStorage>;

    return {
      jars: Array.isArray(storedValue.jars) ? storedValue.jars : [],
      completed: Array.isArray(storedValue.completed)
        ? storedValue.completed
        : [],
    };
  }

  return { jars: [], completed: [] };
}

export function loadJarStorage(): JarStorage {
  if (typeof window === "undefined") {
    return { jars: [], completed: [] };
  }

  const storedValue = window.localStorage.getItem(JARS_STORAGE_KEY);

  if (!storedValue) {
    return { jars: [], completed: [] };
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    return normalizeJarStorage(parsedValue);
  } catch {
    return { jars: [], completed: [] };
  }
}

function hasReminderJarFields(value: unknown): value is Jar {
  if (!value || typeof value !== "object") return false;

  const jar = value as Partial<Jar>;
  return (
    typeof jar.id === "string" &&
    jar.id.length > 0 &&
    typeof jar.name === "string" &&
    typeof jar.color === "string" &&
    typeof jar.createdAt === "string" &&
    typeof jar.target === "number" &&
    Number.isFinite(jar.target) &&
    jar.target > 0 &&
    Array.isArray(jar.marbles) &&
    (jar.completedAt === undefined || typeof jar.completedAt === "string")
  );
}

// Unlike page reads, never treat invalid data as empty when deciding to notify.
export function readJarStorageForReminders(): JarStorage | null {
  try {
    const raw = window.localStorage.getItem(JARS_STORAGE_KEY);
    if (raw === null) return { jars: [], completed: [] };

    const value: unknown = JSON.parse(raw);
    const storage = Array.isArray(value) ? { jars: value, completed: [] } : value;
    if (
      storage &&
      typeof storage === "object" &&
      "jars" in storage &&
      "completed" in storage &&
      Array.isArray(storage.jars) &&
      Array.isArray(storage.completed) &&
      storage.jars.every(hasReminderJarFields) &&
      storage.completed.every(hasReminderJarFields)
    ) {
      return { jars: storage.jars, completed: storage.completed };
    }
  } catch {
    // Storage access or decoding failed; the scheduler must skip this check.
  }
  return null;
}

export function loadJars(): Jar[] {
  return loadJarStorage().jars;
}

export function loadCompletedJars(): Jar[] {
  return loadJarStorage().completed;
}

export function findJarById(id: string): Jar | undefined {
  const storage = loadJarStorage();

  return (
    storage.jars.find((jar) => jar.id === id) ??
    storage.completed.find((jar) => jar.id === id)
  );
}

export function saveJarStorage(storage: JarStorage) {
  window.localStorage.setItem(JARS_STORAGE_KEY, JSON.stringify(storage));
}

export function saveJars(jars: Jar[]) {
  saveJarStorage({
    ...loadJarStorage(),
    jars,
  });
}
