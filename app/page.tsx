"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Badge, buttonClasses, cardClasses } from "./components/ui";
import { Jar as JarVisual } from "./components/jar";
import { RecapEntryCard } from "./components/recap-entry-card";
import { ReminderToast, takeReminderToast } from "./components/reminder-toast";
import { cn } from "../lib/cn";
import {
  getJarColor,
  jarColorSolids,
} from "../lib/jar-colors";
import { getLocalDateKey } from "../lib/local-date";
import { useReminderPermission, useReminderSettings } from "../lib/reminders";
import { type Jar, loadCompletedJars, loadJars } from "../lib/storage";
import { computeStreak } from "../lib/streak";

function EmptyState() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-4xl flex-col items-center justify-center px-5 pb-16 text-center">
      <div className="mb-8 grid grid-cols-4 gap-2" aria-hidden="true">
        {jarColorSolids.map((color) => (
          <span
            className={`h-5 w-5 rounded-full shadow-sm ring-1 ring-white/70 ${color}`}
            key={color}
          />
        ))}
      </div>
      <h1 className="max-w-2xl font-heading text-4xl font-semibold leading-tight text-ink sm:text-5xl">
        Your jars will appear here. First marble&apos;s just a tap away.
      </h1>
      <p className="mt-4 max-w-md text-base leading-7 text-soft-ink">
        Start with one habit, then watch the jar fill one bright marble at a
        time.
      </p>
      <Link
        className={cn("mt-8", buttonClasses())}
        href="/jars/new"
      >
        Create your first jar
      </Link>
    </section>
  );
}

function JarCard({ jar, reminderTime }: { jar: Jar; reminderTime?: string }) {
  const reminderHintId = useId();
  const colorStyles = getJarColor(jar.color);
  const streakCount = computeStreak(jar.marbles);

  return (
    <Link
      aria-describedby={reminderTime ? reminderHintId : undefined}
      aria-label={`Open ${jar.name}`}
      className={cardClasses(
        cn(
          "group relative flex min-h-72 flex-col items-center px-5 py-6 text-center transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream",
          colorStyles.borderSoft,
          colorStyles.tint,
        ),
      )}
      href={`/jar?id=${encodeURIComponent(jar.id)}`}
    >
      {jar.completedAt ? (
        <Badge tone="success" className="absolute right-3 top-3 bg-cream">
          ✓ Complete
        </Badge>
      ) : null}
      <JarVisual
        color={jar.color}
        marbles={jar.marbles}
        name={jar.name}
        target={jar.target}
        variant="mini"
      />
      <h2 className="mt-5 w-full truncate font-heading text-2xl font-semibold text-ink">
        {jar.name}
      </h2>
      <p className="mt-2 text-sm font-semibold text-soft-ink">
        {jar.marbles.length} / {jar.target}
      </p>
      {reminderTime ? (
        <p className="mt-2 text-xs font-medium text-soft-ink" id={reminderHintId}>
          <span aria-hidden="true">🔔 {reminderTime}</span>
          <span className="sr-only">Reminder at {reminderTime}</span>
        </p>
      ) : null}
      {streakCount >= 3 ? (
        <Badge
          tone="streak"
          aria-label={`${streakCount} day streak`}
          className="mt-3 px-2.5"
        >
          <span aria-hidden="true">🔥</span>
          <span>{streakCount}</span>
        </Badge>
      ) : null}
    </Link>
  );
}

export default function Home() {
  const [jars, setJars] = useState<Jar[]>([]);
  const [completedJars, setCompletedJars] = useState<Jar[]>([]);
  const [toastJarId, setToastJarId] = useState<string | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const { time, enabledJarIds } = useReminderSettings();
  const permission = useReminderPermission();

  useEffect(() => {
    setJars(loadJars());
    setCompletedJars(loadCompletedJars());
    const toastId = takeReminderToast();
    if (toastId) setToastJarId(toastId);
  }, []);

  const closeToast = useCallback((restoreFocus = false) => {
    setToastJarId(null);
    if (restoreFocus) title.current?.focus();
  }, []);
  const remindersOn = new Set(permission === "granted" ? enabledJarIds : []);
  const toastJar = toastJarId && remindersOn.has(toastJarId)
    ? jars.find((jar) => jar.id === toastJarId)
    : undefined;

  return (
    <>
      <ReminderToast
        message={toastJar ? `Reminder on for ${toastJar.name} · ${time}` : ""}
        onClose={closeToast}
      />
      {jars.length === 0 && completedJars.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-6xl px-5 pb-16 pt-6">
          <div className="flex items-center justify-between gap-4">
            <h1
              className="font-heading text-4xl font-semibold leading-tight text-ink sm:text-5xl"
              ref={title}
              tabIndex={-1}
            >
              Your jars
            </h1>
            <Link
              className={buttonClasses({
                size: "sm",
                className: "fixed right-5 top-5 z-10 py-3 shadow-md",
              })}
              href="/jars/new"
            >
              + New jar
            </Link>
          </div>
          <RecapEntryCard
            storage={{ jars, completed: completedJars }}
            today={getLocalDateKey(new Date())}
          />
          {jars.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {jars.map((jar) => (
                <JarCard
                  jar={jar}
                  key={jar.id}
                  reminderTime={
                    remindersOn.has(jar.id) && !jar.completedAt && jar.marbles.length < jar.target
                      ? time
                      : undefined
                  }
                />
              ))}
            </div>
          ) : null}

          {completedJars.length > 0 ? (
            <section className="mt-12 border-t border-line pt-8">
              <h2 className="font-heading text-3xl font-semibold text-ink">
                Trophy Shelf
              </h2>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {completedJars.map((jar) => (
                  <JarCard jar={jar} key={jar.id} />
                ))}
              </div>
            </section>
          ) : null}
        </section>
      )}
    </>
  );
}
