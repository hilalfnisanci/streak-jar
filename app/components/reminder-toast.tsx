"use client";

import { useEffect, useRef, useState } from "react";

const TOAST_JAR_KEY = "streak-jar.reminder-toast";

export function queueReminderToast(jarId: string) {
  try {
    window.sessionStorage.setItem(TOAST_JAR_KEY, jarId);
  } catch {
    // The reminder has already been saved; the confirmation is optional.
  }
}

export function takeReminderToast() {
  try {
    const jarId = window.sessionStorage.getItem(TOAST_JAR_KEY);
    window.sessionStorage.removeItem(TOAST_JAR_KEY);
    return jarId;
  } catch {
    return null;
  }
}

export function ReminderToast({ message, onClose }: {
  message: string;
  onClose: (restoreFocus?: boolean) => void;
}) {
  const toast = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!message) return;
    toast.current?.showPopover?.();
  }, [message]);

  useEffect(() => {
    if (!message || focused) return;
    const timer = window.setTimeout(() => onClose(), 5000);
    return () => window.clearTimeout(timer);
  }, [focused, message, onClose]);

  return (
    <>
      <p className="sr-only" role="status">{message}</p>
      {message ? (
        <div
          aria-label="Notifications"
          className="fixed inset-x-5 top-20 bottom-auto z-[60] mx-auto mt-0 flex w-auto max-w-[380px] items-center gap-2 rounded-lg border-0 bg-ink px-3.5 py-2 text-sm font-semibold text-cream shadow-md sm:left-auto sm:right-5"
          onBlur={() => setFocused(false)}
          onFocus={() => setFocused(true)}
          popover="manual"
          ref={toast}
          role="region"
        >
          <span aria-hidden="true">🔔</span>
          <span>{message}</span>
          <button
            aria-label="Dismiss"
            className="ml-auto min-h-11 min-w-11 rounded-lg focus-visible:ring-2 focus-visible:ring-cream"
            onClick={() => onClose(toast.current?.contains(document.activeElement))}
            type="button"
          >
            ×
          </button>
        </div>
      ) : null}
    </>
  );
}
