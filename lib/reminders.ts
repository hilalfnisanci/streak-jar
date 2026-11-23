import { useSyncExternalStore } from "react";

import { getLocalDateKey } from "./local-date";
import { readJarStorageForReminders, type Jar } from "./storage";
import { computeStreak, getMarbleDateSet, isValidDateKey } from "./streak";

export const DEFAULT_REMINDER_TIME = "20:00";
export const REMINDERS_STORAGE_KEY = "streak-jar.reminders.v1";

const REMINDERS_CHANGE = "streak-jar.reminders.change";
const PERMISSION_CHANGE = "streak-jar.reminders.permission-change";

type ReminderSettings = {
  time: string;
  enabledJarIds: string[];
  lastClaimByJar: Record<string, string>;
};

type ReminderPermission = NotificationPermission | "unsupported";

const defaultSettings: ReminderSettings = {
  time: DEFAULT_REMINDER_TIME,
  enabledJarIds: [],
  lastClaimByJar: {},
};

export function isReminderTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseReminderSettings(raw: string | null): ReminderSettings | null {
  if (raw === null) return defaultSettings;

  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") return null;

  const { time, enabledJarIds, lastClaimByJar } = value as Partial<ReminderSettings>;
  if (
    !isReminderTime(time) ||
    !Array.isArray(enabledJarIds) ||
    !enabledJarIds.every((id) => typeof id === "string" && id.length > 0) ||
    !lastClaimByJar ||
    typeof lastClaimByJar !== "object" ||
    Array.isArray(lastClaimByJar) ||
    !Object.values(lastClaimByJar).every(isValidDateKey)
  ) {
    return null;
  }

  return { time, enabledJarIds, lastClaimByJar };
}

// useSyncExternalStore requires a stable snapshot while storage is unchanged.
let previousRaw: string | null | undefined;
let previousSettings: ReminderSettings | null = null;

export function readReminderSettings(): ReminderSettings | null {
  try {
    const raw = window.localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (raw !== previousRaw) {
      previousSettings = parseReminderSettings(raw);
      previousRaw = raw;
    }
    return previousSettings;
  } catch {
    return null;
  }
}

export function subscribeToReminderSettings(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === REMINDERS_STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(REMINDERS_CHANGE, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(REMINDERS_CHANGE, listener);
  };
}

export function useReminderSettings() {
  return useSyncExternalStore(
    subscribeToReminderSettings,
    () => readReminderSettings() ?? defaultSettings,
    () => defaultSettings,
  );
}

export function getReminderPermission(): ReminderPermission {
  if (
    typeof window === "undefined" ||
    typeof window.Notification?.requestPermission !== "function" ||
    typeof navigator.serviceWorker?.register !== "function" ||
    (typeof window.ServiceWorkerRegistration !== "undefined" &&
      typeof window.ServiceWorkerRegistration.prototype.showNotification !== "function") ||
    typeof navigator.locks?.request !== "function"
  ) {
    return "unsupported";
  }
  return window.Notification.permission;
}

export function subscribeToReminderPermission(listener: () => void) {
  window.addEventListener(PERMISSION_CHANGE, listener);
  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    window.removeEventListener(PERMISSION_CHANGE, listener);
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}

export function useReminderPermission() {
  return useSyncExternalStore<ReminderPermission>(
    subscribeToReminderPermission,
    getReminderPermission,
    () => "unsupported",
  );
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  const permission = getReminderPermission();
  if (permission !== "default") return permission;

  try {
    return await window.Notification.requestPermission();
  } catch {
    return getReminderPermission();
  } finally {
    window.dispatchEvent(new Event(PERMISSION_CHANGE));
  }
}

function writeReminderSettings(settings: ReminderSettings) {
  window.localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(settings));
}

async function updateReminderSettings(
  update: (settings: ReminderSettings) => ReminderSettings,
): Promise<boolean> {
  try {
    const saved = await navigator.locks.request(REMINDERS_STORAGE_KEY, () => {
      const settings = readReminderSettings();
      if (!settings) return false;
      writeReminderSettings(update(settings));
      return true;
    });
    if (saved) window.dispatchEvent(new Event(REMINDERS_CHANGE));
    return saved;
  } catch {
    return false;
  }
}

export function setReminderTime(time: string): Promise<boolean> {
  if (!isReminderTime(time)) return Promise.resolve(false);
  return updateReminderSettings((settings) => ({ ...settings, time }));
}

export function setJarReminder(jarId: string, enabled: boolean): Promise<boolean> {
  if (!jarId) return Promise.resolve(false);
  return updateReminderSettings((settings) => ({
    ...settings,
    enabledJarIds: enabled
      ? [...new Set([...settings.enabledJarIds, jarId])]
      : settings.enabledJarIds.filter((id) => id !== jarId),
  }));
}

export function getReminderDeadline(date: Date, time: string): Date {
  const [hour, minute] = time.split(":").map(Number);
  const deadline = new Date(date);
  deadline.setHours(hour, minute, 0, 0);
  return deadline;
}

async function displayReminder(
  registration: ServiceWorkerRegistration,
  jar: Jar,
  date: string,
): Promise<boolean> {
  try {
    const streak = computeStreak(jar.marbles);
    await registration.showNotification(`${jar.name}: no marble yet today`, {
      body:
        streak > 0
          ? `Add today’s marble to keep your ${streak}-day streak going.`
          : "Add today’s marble to keep the jar filling.",
      data: { jarId: jar.id },
      tag: `streak-jar:${jar.id}:${date}`,
    });
    return true;
  } catch {
    return false;
  }
}

export async function dispatchDueReminders(
  registration: ServiceWorkerRegistration,
  isCurrent: () => boolean,
): Promise<void> {
  const attempted = new Set<string>();

  while (isCurrent()) {
    const pending = await navigator.locks.request(REMINDERS_STORAGE_KEY, () => {
      if (!isCurrent() || getReminderPermission() !== "granted") return;

      const now = new Date();
      const settings = readReminderSettings();
      if (!settings || now < getReminderDeadline(now, settings.time)) return;

      const storage = readJarStorageForReminders();
      if (!storage) return;

      const today = getLocalDateKey(now);
      const enabled = new Set(settings.enabledJarIds);
      const completed = new Set(storage.completed.map((jar) => jar.id));
      const jar = storage.jars.find(
        (candidate) =>
          enabled.has(candidate.id) &&
          !completed.has(candidate.id) &&
          !attempted.has(candidate.id) &&
          settings.lastClaimByJar[candidate.id] !== today &&
          !candidate.completedAt &&
          candidate.marbles.length < candidate.target &&
          !getMarbleDateSet(candidate.marbles).has(today),
      );
      if (!jar) return;

      attempted.add(jar.id);
      writeReminderSettings({
        ...settings,
        lastClaimByJar: { ...settings.lastClaimByJar, [jar.id]: today },
      });

      // Start display with the claim held, but don't lock preference writers
      // while waiting for the browser to settle the display promise.
      return {
        jarId: jar.id,
        date: today,
        displayed: displayReminder(registration, jar, today),
      };
    });
    if (!pending) return;

    if (!(await pending.displayed)) {
      await navigator.locks.request(REMINDERS_STORAGE_KEY, () => {
        const settings = readReminderSettings();
        if (settings?.lastClaimByJar[pending.jarId] !== pending.date) return;
        const claims = { ...settings.lastClaimByJar };
        delete claims[pending.jarId];
        writeReminderSettings({ ...settings, lastClaimByJar: claims });
      });
    }
  }
}
