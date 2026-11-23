import Link from "next/link";
import { useId, useState } from "react";

import { cn } from "../../lib/cn";
import {
  requestReminderPermission,
  setJarReminder,
  useReminderPermission,
  useReminderSettings,
} from "../../lib/reminders";
import { Card } from "../components/ui";

export function DailyReminder({
  jarId,
  isDoneToday,
}: {
  jarId: string;
  isDoneToday: boolean;
}) {
  const id = useId();
  const { time, enabledJarIds } = useReminderSettings();
  const permission = useReminderPermission();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const enabled = permission === "granted" && enabledJarIds.includes(jarId);
  const unavailable = permission === "unsupported" || permission === "denied";

  const description =
    permission === "unsupported"
      ? "This browser can’t show reminders."
      : permission === "denied"
        ? "Notifications are blocked for this site. Allow them in your browser’s site settings."
        : !enabled
          ? `Off. Get a nudge at ${time} if today’s marble is missing.`
          : isDoneToday
            ? "On. Today’s marble is in — no reminder tonight."
            : `On. We’ll remind you at ${time} if today’s marble is missing.`;

  async function toggleReminder() {
    if (unavailable || pending) {
      return;
    }

    setPending(true);
    setStatus("");
    try {
      if (permission === "default") {
        const result = await requestReminderPermission();
        if (result !== "granted") {
          setStatus(
            result === "denied"
              ? "Notifications blocked — reminder stays off."
              : "Permission not given — reminder stays off.",
          );
          return;
        }
      }

      if (await setJarReminder(jarId, !enabled)) {
        setStatus(enabled ? "Reminder off" : `Reminder on · ${time}`);
      } else {
        setStatus("Couldn’t save the reminder. Try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6">
      <Card>
        <div className="flex items-center gap-3 p-3.5">
          <span
            aria-hidden="true"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              enabled ? "bg-sage/20 text-ink" : "bg-line/50 text-soft-ink",
            )}
          >
            <svg
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
              viewBox="0 0 24 24"
            >
              <path
                d={enabled
                  ? "M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2H4.5l1.5-2Z M10 20.5a2 2 0 0 0 4 0"
                  : "M6 16.5V11a6 6 0 0 1 9.5-4.9M18 11v5.5l1.5 2H8 M10 20.5a2 2 0 0 0 4 0M4 4l16 16"}
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink" id={`${id}-label`}>
              Daily reminder
            </p>
            <p
              className="mt-0.5 text-xs leading-5 text-soft-ink"
              id={`${id}-description`}
            >
              {description}
            </p>
          </div>
          <span aria-hidden="true" className="text-xs font-semibold text-ink">
            {enabled ? "On" : "Off"}
          </span>
          <button
            aria-checked={enabled}
            aria-describedby={`${id}-description`}
            aria-disabled={unavailable || pending}
            aria-labelledby={`${id}-label`}
            className="relative h-11 w-[52px] flex-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ink aria-disabled:cursor-not-allowed"
            onClick={toggleReminder}
            role="switch"
            type="button"
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-1 top-[9px] h-[26px] w-11 rounded-full border transition",
                enabled ? "border-ink bg-ink" : "border-soft-ink/45 bg-line",
                unavailable && "border-dashed bg-line/60",
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-[7px] top-3 size-5 rounded-full bg-white shadow-sm transition",
                enabled && "translate-x-[18px]",
              )}
            />
          </button>
        </div>
        <div className="border-t border-line px-4 py-2.5">
          <Link
            className="text-xs font-semibold text-ink underline"
            href="/settings#reminders"
          >
            Change reminder time
          </Link>
        </div>
      </Card>
      <p className="mt-2 min-h-5 text-xs font-semibold text-ink" role="status">
        {status}
      </p>
    </div>
  );
}
