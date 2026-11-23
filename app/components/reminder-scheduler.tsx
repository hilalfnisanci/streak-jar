"use client";

import { useEffect } from "react";

import {
  dispatchDueReminders,
  getReminderDeadline,
  getReminderPermission,
  readReminderSettings,
  subscribeToReminderPermission,
  subscribeToReminderSettings,
} from "../../lib/reminders";
import { JARS_STORAGE_KEY } from "../../lib/storage";

const WORKER_SCOPE = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`;
const RETRY_MS = 60_000;
const CLOCK_CHECK_MS = 5 * 60_000;

function preferenceKey(settings: ReturnType<typeof readReminderSettings>) {
  return settings && JSON.stringify([settings.time, settings.enabledJarIds]);
}

export function ReminderScheduler() {
  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    let registering = false;
    let checking = false;
    let registration: ServiceWorkerRegistration | undefined;
    let stopWatchingActivation: (() => void) | undefined;
    let lastPreferences: string | null = null;

    function check() {
      if (stopped) return;
      window.clearTimeout(timer);

      const now = new Date();
      const settings = readReminderSettings();
      lastPreferences = preferenceKey(settings);
      if (!settings?.enabledJarIds.length || getReminderPermission() !== "granted") return;

      const due = getReminderDeadline(now, settings.time);
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const delay =
        now < due
          ? Math.min(CLOCK_CHECK_MS, due.getTime() - now.getTime())
          : Math.min(RETRY_MS, tomorrow.getTime() - now.getTime());

      timer = window.setTimeout(check, delay);

      if (!registration && !registering) {
        registering = true;
        void registerWorker();
      } else if (registration?.active && now >= due && !checking) {
        checking = true;
        void dispatchDueReminders(registration, () => !stopped)
          .catch(() => {
            // Inaccessible storage or locks must never cause an unclaimed send.
          })
          .finally(() => {
            checking = false;
          });
      }
    }

    async function registerWorker() {
      try {
        const result = await navigator.serviceWorker.register(
          `${WORKER_SCOPE}reminders-sw.js`,
          { scope: WORKER_SCOPE },
        );
        if (stopped) return;
        if (result.active) {
          registration = result;
          check();
          return;
        }

        const worker = result.installing ?? result.waiting;
        if (!worker) return;
        registration = result;
        const onStateChange = () => {
          if (worker.state === "activated") {
            stopWatchingActivation?.();
            check();
          } else if (worker.state === "redundant") {
            stopWatchingActivation?.();
            // Failed installation: allow registration to retry on the timer.
            registration = undefined;
          }
        };
        worker.addEventListener("statechange", onStateChange);
        stopWatchingActivation = () => worker.removeEventListener("statechange", onStateChange);
        onStateChange();
      } catch {
        // Registration can fail even when the browser exposes the APIs.
        // Don't block app use; the next check can retry.
      } finally {
        registering = false;
      }
    }

    function onJarStorage(event: StorageEvent) {
      if (event.key === JARS_STORAGE_KEY) check();
    }

    const unsubscribeSettings = subscribeToReminderSettings(() => {
      // Claim-only writes from other tabs must not trigger immediate retries.
      if (preferenceKey(readReminderSettings()) !== lastPreferences) check();
    });
    const unsubscribePermission = subscribeToReminderPermission(check);
    window.addEventListener("storage", onJarStorage);
    window.addEventListener("pageshow", check);
    check();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stopWatchingActivation?.();
      unsubscribeSettings();
      unsubscribePermission();
      window.removeEventListener("storage", onJarStorage);
      window.removeEventListener("pageshow", check);
    };
  }, []);

  return null;
}
