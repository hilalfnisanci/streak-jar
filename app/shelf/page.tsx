"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { type Jar, type MarbleEntry, loadJars } from "../../lib/storage";

const jarColorStyles = {
  coral: { fill: "bg-coral/35", dot: "bg-coral", border: "border-coral/60" },
  mint: { fill: "bg-mint/35", dot: "bg-mint", border: "border-mint/60" },
  lavender: {
    fill: "bg-lavender/35",
    dot: "bg-lavender",
    border: "border-lavender/60",
  },
  butter: { fill: "bg-butter/45", dot: "bg-butter", border: "border-butter/70" },
  sky: { fill: "bg-sky/35", dot: "bg-sky", border: "border-sky/60" },
  peach: { fill: "bg-peach/35", dot: "bg-peach", border: "border-peach/60" },
  lilac: { fill: "bg-lilac/35", dot: "bg-lilac", border: "border-lilac/60" },
  sage: { fill: "bg-sage/35", dot: "bg-sage", border: "border-sage/60" },
} as const;

function getJarColorStyles(color: string) {
  return jarColorStyles[color as keyof typeof jarColorStyles] ?? jarColorStyles.coral;
}

function getMarbleDate(marble: MarbleEntry) {
  return typeof marble === "string" ? marble : marble.date;
}

function getMarbleDateSet(marbles: MarbleEntry[]) {
  return new Set(
    marbles
      .map((marble) => getMarbleDate(marble))
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
  );
}

function shiftDate(date: string, offsetDays: number) {
  const shiftedDate = new Date(`${date}T00:00:00.000Z`);
  shiftedDate.setUTCDate(shiftedDate.getUTCDate() + offsetDays);

  return shiftedDate.toISOString().slice(0, 10);
}

// Longest contiguous run of consecutive calendar days among the jar's marbles.
function getLongestStreak(marbleDates: Set<string>) {
  if (marbleDates.size === 0) {
    return 0;
  }

  const sortedDates = Array.from(marbleDates).sort();
  let longest = 1;
  let current = 1;

  for (let index = 1; index < sortedDates.length; index += 1) {
    if (shiftDate(sortedDates[index - 1], 1) === sortedDates[index]) {
      current += 1;
    } else {
      current = 1;
    }

    longest = Math.max(longest, current);
  }

  return longest;
}

function toUtcMidnight(isoTimestamp: string) {
  return new Date(`${isoTimestamp.slice(0, 10)}T00:00:00.000Z`);
}

function formatMonthDay(isoTimestamp: string) {
  return toUtcMidnight(isoTimestamp).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function formatFullDate(isoTimestamp: string) {
  return toUtcMidnight(isoTimestamp).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

function getDurationDays(jar: Jar) {
  if (!jar.completedAt) {
    return 0;
  }

  const start = toUtcMidnight(jar.createdAt).getTime();
  const end = toUtcMidnight(jar.completedAt).getTime();

  return Math.max(0, Math.round((end - start) / 86_400_000));
}

function pluralizeDays(count: number) {
  return `${count} day${count === 1 ? "" : "s"}`;
}

function ShelfJarVisual({ jar, size }: { jar: Jar; size: "small" | "large" }) {
  const colorStyles = getJarColorStyles(jar.color);
  const previewMarbles =
    size === "large" ? jar.marbles.slice(-24) : jar.marbles.slice(0, 12);

  if (size === "large") {
    return (
      <div className="relative mx-auto h-64 w-44">
        <div className="absolute left-1/2 top-0 h-7 w-24 -translate-x-1/2 rounded-t-md border-[3px] border-ink/75 bg-glass" />
        <div className="absolute left-1/2 top-6 h-7 w-32 -translate-x-1/2 rounded-lg border-[3px] border-ink/75 bg-glass" />
        <div className="absolute bottom-0 left-1/2 h-52 w-40 -translate-x-1/2 overflow-hidden rounded-b-[2.5rem] rounded-t-2xl border-[3px] border-ink/75 bg-white/60 shadow-inner">
          <div className={`absolute inset-0 ${colorStyles.fill}`} />
          <div
            aria-hidden="true"
            className="absolute inset-x-5 bottom-5 grid grid-cols-4 gap-2"
          >
            {previewMarbles.map((marble, index) => (
              <span
                className={`h-6 w-6 rounded-full shadow-sm ring-2 ring-white/80 ${colorStyles.dot}`}
                key={`${getMarbleDate(marble)}-${index}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-32 w-24">
      <div className="absolute left-1/2 top-0 h-4 w-12 -translate-x-1/2 rounded-t-md border-2 border-ink/75 bg-glass" />
      <div className="absolute left-1/2 top-3 h-4 w-16 -translate-x-1/2 rounded-md border-2 border-ink/75 bg-glass" />
      <div className="absolute bottom-0 left-1/2 h-24 w-20 -translate-x-1/2 overflow-hidden rounded-b-[1.5rem] rounded-t-lg border-2 border-ink/75 bg-white/60 shadow-inner">
        <div className={`absolute inset-0 ${colorStyles.fill}`} />
        <div
          aria-hidden="true"
          className="absolute inset-x-2 bottom-2 grid grid-cols-3 gap-1"
        >
          {previewMarbles.map((marble, index) => (
            <span
              className={`h-3 w-3 rounded-full shadow-sm ring-1 ring-white/80 ${colorStyles.dot}`}
              key={`${getMarbleDate(marble)}-${index}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StoryModal({ jar, onClose }: { jar: Jar; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const marbleDates = getMarbleDateSet(jar.marbles);
  const longestStreak = getLongestStreak(marbleDates);
  const durationDays = getDurationDays(jar);

  return (
    <div
      aria-labelledby="shelf-story-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center overflow-y-auto bg-ink/55 px-5 py-8"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="relative w-full max-w-lg rounded-lg border border-line bg-cream px-6 py-8 text-center shadow-2xl sm:px-10 sm:py-10"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md border border-line bg-white px-3 py-1 text-sm font-semibold text-ink shadow-sm transition hover:border-soft-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream"
          onClick={onClose}
          type="button"
        >
          Close
        </button>

        <div className="mt-2">
          <ShelfJarVisual jar={jar} size="large" />
        </div>

        <h2
          className="mt-6 font-heading text-3xl font-semibold leading-tight text-ink sm:text-4xl"
          id="shelf-story-title"
        >
          {jar.name}
        </h2>

        {jar.completedAt ? (
          <p className="mt-4 text-base leading-7 text-soft-ink">
            Started {formatMonthDay(jar.createdAt)}, finished{" "}
            {formatMonthDay(jar.completedAt)} ({pluralizeDays(durationDays)})
          </p>
        ) : null}

        <p className="mt-2 text-base font-semibold text-ink">
          Longest streak: {pluralizeDays(longestStreak)}
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-3xl flex-col items-center justify-center px-5 pb-16 text-center">
      <h1 className="font-heading text-4xl font-semibold leading-tight text-ink sm:text-5xl">
        No trophies yet. Finish a jar first.
      </h1>
      <Link
        className="mt-8 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-soft-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream"
        href="/"
      >
        Back to jars
      </Link>
    </section>
  );
}

export default function ShelfPage() {
  const [jars, setJars] = useState<Jar[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [openJarId, setOpenJarId] = useState<string | null>(null);

  useEffect(() => {
    setJars(loadJars());
    setHasLoaded(true);
  }, []);

  const completedJars = useMemo(
    () =>
      jars
        .filter((jar) => Boolean(jar.completedAt))
        .sort((first, second) =>
          (second.completedAt ?? "").localeCompare(first.completedAt ?? ""),
        ),
    [jars],
  );

  const openJar = completedJars.find((jar) => jar.id === openJarId) ?? null;

  if (!hasLoaded) {
    return null;
  }

  if (completedJars.length === 0) {
    return <EmptyState />;
  }

  return (
    <section className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-6xl px-5 pb-16 pt-6">
      <Link
        className="inline-flex rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-soft-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream"
        href="/"
      >
        Back
      </Link>

      <h1 className="mt-6 font-heading text-4xl font-semibold leading-tight text-ink sm:text-5xl">
        Trophy shelf
      </h1>
      <p className="mt-3 text-base leading-7 text-soft-ink">
        Every jar you have filled to the top. Tap one to relive its story.
      </p>

      <div className="mt-10 rounded-lg border border-line p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-10">
          {completedJars.map((jar) => (
            <button
              aria-label={`Open ${jar.name} story`}
              className="group flex flex-col items-center rounded-md px-2 pb-2 text-center transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream"
              key={jar.id}
              onClick={() => setOpenJarId(jar.id)}
              type="button"
            >
              <ShelfJarVisual jar={jar} size="small" />
              <span className="mt-4 w-28 truncate font-heading text-lg font-semibold text-ink">
                {jar.name}
              </span>
              <span className="mt-1 text-xs font-medium text-soft-ink">
                {jar.completedAt ? formatFullDate(jar.completedAt) : null}
              </span>
            </button>
          ))}
        </div>
        <div
          aria-hidden="true"
          className="mt-2 h-5 w-full rounded-b-md border-t-2 border-ink/30 shadow-md"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, #b5763f 0px, #c08a52 6px, #a9692f 12px, #c89863 20px)",
          }}
        />
      </div>

      {openJar ? (
        <StoryModal jar={openJar} onClose={() => setOpenJarId(null)} />
      ) : null}
    </section>
  );
}
