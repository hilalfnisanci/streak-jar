export const JARS_STORAGE_KEY = "streak-jar.jars";

export type Jar = {
  id: string;
  name: string;
  target: number;
  color: string;
  marbles: string[];
  createdAt: string;
};

export function loadJars(): Jar[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedValue = window.localStorage.getItem(JARS_STORAGE_KEY);

  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    return Array.isArray(parsedValue) ? (parsedValue as Jar[]) : [];
  } catch {
    return [];
  }
}

export function saveJars(jars: Jar[]) {
  window.localStorage.setItem(JARS_STORAGE_KEY, JSON.stringify(jars));
}
