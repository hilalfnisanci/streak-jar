import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  REMINDERS_STORAGE_KEY,
  readReminderSettings,
  setJarReminder,
  setReminderTime,
} from "../../../lib/reminders";
import { JARS_STORAGE_KEY, type Jar, saveJarStorage } from "../../../lib/storage";
import { ReminderScheduler } from "../reminder-scheduler";

const today = "2026-11-23";
const yesterday = "2026-11-22";

function jar(id: string, fields: Partial<Jar> = {}): Jar {
  return {
    id,
    name: id,
    color: "mint",
    target: 10,
    marbles: [],
    createdAt: yesterday,
    ...fields,
  };
}

function setTime(hour: number, minute = 0, day = 23) {
  vi.setSystemTime(new Date(2026, 10, day, hour, minute));
}

function seedReminders(enabledJarIds: string[]) {
  localStorage.setItem(
    REMINDERS_STORAGE_KEY,
    JSON.stringify({ time: "20:00", enabledJarIds, lastClaimByJar: {} }),
  );
}

function storageChange(key: string) {
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

function resume() {
  window.dispatchEvent(new Event("focus"));
}

function drain() {
  return vi.advanceTimersByTimeAsync(0);
}

describe("ReminderScheduler", () => {
  const showNotification = vi.fn<(
    title: string,
    options?: NotificationOptions,
  ) => Promise<void>>();
  const register = vi.fn();
  const permission = {
    permission: "granted" as NotificationPermission,
    requestPermission: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    showNotification.mockReset().mockResolvedValue(undefined);
    register.mockReset().mockResolvedValue({ active: {}, showNotification });
    permission.permission = "granted";

    // Each request must hold the same exclusive lock until it settles.
    // Competing schedulers and settings writes use this real queue.
    const queues = new Map<string, Promise<unknown>>();
    function request<T>(name: string, callback: () => T) {
      const result = (queues.get(name) ?? Promise.resolve()).then(callback);
      queues.set(name, result.catch(() => undefined));
      return result;
    }
    vi.stubGlobal("Notification", permission);
    vi.stubGlobal("navigator", {
      locks: { request },
      serviceWorker: { register },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("catches up once on the same local day across tabs, using fresh and legacy jar data", async () => {
    setTime(19, 55);
    const jars = [
      jar("due", { marbles: [yesterday] }),
      jar("legacy-today", { marbles: [today] }),
      jar("object-today", { marbles: [{ date: today, at: new Date().toISOString() }] }),
      jar("fresh"),
      jar("full", { target: 1, marbles: [yesterday] }),
      jar("on-display", { completedAt: yesterday }),
      jar("off"),
    ];
    const trophy = jar("trophy", { completedAt: yesterday });
    localStorage.setItem(JARS_STORAGE_KEY, JSON.stringify(jars));
    seedReminders([...jars.filter(({ id }) => id !== "off").map(({ id }) => id), trophy.id]);

    // The tabs start with legacy array data. An external writer holds the
    // shared lock while both tabs wake, then adds today's marble elsewhere.
    render(
      <>
        <ReminderScheduler />
        <ReminderScheduler />
      </>,
    );
    await act(drain);
    expect(showNotification).not.toHaveBeenCalled();

    let unlock!: () => void;
    const holdingLock = navigator.locks.request(
      REMINDERS_STORAGE_KEY,
      () =>
        new Promise<void>((resolve) => {
          unlock = resolve;
        }),
    );

    await act(async () => {
      setTime(20, 15);
      document.dispatchEvent(new Event("visibilitychange"));
      await drain();
    });
    expect(showNotification).not.toHaveBeenCalled();

    await act(async () => {
      saveJarStorage({
        jars: jars.map((current) =>
          current.id === "fresh" ? { ...current, marbles: [today] } : current,
        ),
        completed: [trophy],
      });
      storageChange(JARS_STORAGE_KEY);
      unlock();
      await holdingLock;
      await drain();
    });
    expect(showNotification).toHaveBeenCalledExactlyOnceWith(
      "due: no marble yet today",
      expect.objectContaining({ data: { jarId: "due" }, tag: `streak-jar:due:${today}` }),
    );

    await act(async () => {
      resume();
      await drain();
    });
    expect(showNotification).toHaveBeenCalledTimes(1);
  });

  it("uses an edited time and releases only its failed claim while preference writes proceed", async () => {
    setTime(19, 20);
    const first = jar("first");
    const saved = jar("saved");
    saveJarStorage({ jars: [first, saved], completed: [] });
    seedReminders([first.id]);

    let rejectDisplay!: (error: Error) => void;
    showNotification.mockImplementationOnce(() =>
      new Promise<void>((_, reject) => {
        rejectDisplay = reject;
      }),
    );
    render(<ReminderScheduler />);

    await act(async () => {
      expect(await setReminderTime("19:30")).toBe(true);
      await vi.advanceTimersByTimeAsync(10 * 60_000 - 1);
    });
    expect(showNotification).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(showNotification).toHaveBeenCalledTimes(1);
    expect(readReminderSettings()?.lastClaimByJar).toEqual({ first: today });

    await act(async () => {
      void setJarReminder(saved.id, true);
      void setReminderTime("19:40");
      await drain();
    });
    expect(readReminderSettings()).toEqual({
      time: "19:40",
      enabledJarIds: [first.id, saved.id],
      lastClaimByJar: { first: today },
    });

    await act(async () => {
      rejectDisplay(new Error("Display failed"));
      await drain();
    });
    expect(readReminderSettings()).toEqual({
      time: "19:40",
      enabledJarIds: [first.id, saved.id],
      lastClaimByJar: {},
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000);
    });
    expect(showNotification.mock.calls.map(([, options]) => options?.data)).toEqual([
      { jarId: first.id },
      { jarId: first.id },
      { jarId: saved.id },
    ]);
    expect(readReminderSettings()?.lastClaimByJar).toEqual({ first: today, saved: today });
  });

  it("skips unreadable storage and never sends a previous day's pending reminder", async () => {
    setTime(20, 15, 22);
    seedReminders(["due"]);
    localStorage.setItem(
      JARS_STORAGE_KEY,
      JSON.stringify({ jars: [jar("due")], completed: "unreadable" }),
    );
    render(<ReminderScheduler />);
    await act(drain);
    expect(showNotification).not.toHaveBeenCalled();

    // Recover as a legacy array, but only after midnight. Wait for today's
    // local deadline instead of sending yesterday's missed notification.
    await act(async () => {
      setTime(8);
      localStorage.setItem(JARS_STORAGE_KEY, JSON.stringify([jar("due")]));
      storageChange(JARS_STORAGE_KEY);
      await drain();
    });
    expect(showNotification).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12 * 60 * 60_000);
    });
    expect(showNotification).toHaveBeenCalledExactlyOnceWith(
      "due: no marble yet today",
      expect.objectContaining({ tag: `streak-jar:due:${today}` }),
    );
  });

  it("does not claim or display when permission has been revoked by the deadline", async () => {
    setTime(19, 59);
    seedReminders(["due"]);
    saveJarStorage({ jars: [jar("due")], completed: [] });
    render(<ReminderScheduler />);

    await act(async () => {
      permission.permission = "denied";
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(showNotification).not.toHaveBeenCalled();
    expect(readReminderSettings()?.lastClaimByJar).toEqual({});
  });
});
