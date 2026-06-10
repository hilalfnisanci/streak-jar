"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { type Jar, loadCompletedJars, loadJars } from "../lib/storage";
import { computeStreak } from "../lib/streak";

const emptyStateMarbleColors = [
  "bg-coral",
  "bg-mint",
  "bg-lavender",
  "bg-butter",
  "bg-sky",
  "bg-peach",
  "bg-lilac",
  "bg-sage",
] as const;

const jarColorStyles = {
  coral: {
    fill: "bg-coral/35",
    dot: "bg-coral",
    border: "border-coral/60",
    tint: "bg-coral/10",
  },
  mint: {
    fill: "bg-mint/35",
    dot: "bg-mint",
    border: "border-mint/60",
    tint: "bg-mint/10",
  },
  lavender: {
    fill: "bg-lavender/35",
    dot: "bg-lavender",
    border: "border-lavender/60",
    tint: "bg-lavender/10",
  },
  butter: {
    fill: "bg-butter/45",
    dot: "bg-butter",
    border: "border-butter/70",
    tint: "bg-butter/15",
  },
  sky: {
    fill: "bg-sky/35",
    dot: "bg-sky",
    border: "border-sky/60",
    tint: "bg-sky/10",
  },
  peach: {
    fill: "bg-peach/35",
    dot: "bg-peach",
    border: "border-peach/60",
    tint: "bg-peach/10",
  },
  lilac: {
    fill: "bg-lilac/35",
    dot: "bg-lilac",
    border: "border-lilac/60",
    tint: "bg-lilac/10",
  },
  sage: {
    fill: "bg-sage/35",
    dot: "bg-sage",
    border: "border-sage/60",
    tint: "bg-sage/10",
  },
} as const;

function getJarColorStyles(color: string) {
  return (
    jarColorStyles[color as keyof typeof jarColorStyles] ??
    jarColorStyles.coral
  );
}

function getFillPercent(jar: Jar) {
  if (jar.target <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((jar.marbles.length / jar.target) * 100));
}

function EmptyState() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-4xl flex-col items-center justify-center px-5 pb-16 text-center">
      <div className="mb-8 grid grid-cols-4 gap-2" aria-hidden="true">
        {emptyStateMarbleColors.map((color) => (
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
        className="mt-8 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-soft-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream"
        href="/jars/new"
      >
        Create your first jar
      </Link>
    </section>
  );
}

function MiniJar({ jar }: { jar: Jar }) {
  const colorStyles = getJarColorStyles(jar.color);
  const fillPercent = getFillPercent(jar);
  const previewMarbles = jar.marbles.slice(0, 12);

  return (
    <div
      aria-label={`${jar.name} jar is ${fillPercent}% full`}
      className="relative h-40 w-28"
      role="img"
    >
      <div className="absolute left-1/2 top-0 h-5 w-14 -translate-x-1/2 rounded-t-md border-2 border-ink/75 bg-glass" />
      <div className="absolute left-1/2 top-4 h-5 w-20 -translate-x-1/2 rounded-md border-2 border-ink/75 bg-glass" />
      <div className="absolute bottom-0 left-1/2 h-32 w-24 -translate-x-1/2 overflow-hidden rounded-b-[1.75rem] rounded-t-xl border-2 border-ink/75 bg-white/60 shadow-inner">
        <div
          className={`absolute bottom-0 left-0 w-full ${colorStyles.fill}`}
          style={{ height: `${fillPercent}%` }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-3 bottom-3 grid grid-cols-3 gap-1.5"
        >
          {previewMarbles.map((marble, index) => (
            <span
              className={`h-4 w-4 rounded-full shadow-sm ring-1 ring-white/80 ${colorStyles.dot}`}
              key={`${marble}-${index}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function JarCard({ jar }: { jar: Jar }) {
  const colorStyles = getJarColorStyles(jar.color);
  const streakCount = computeStreak(jar.marbles);

  return (
    <Link
      aria-label={`Open ${jar.name}`}
      className={`group relative flex min-h-72 flex-col items-center rounded-lg border ${colorStyles.border} ${colorStyles.tint} px-5 py-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream`}
      href={`/jar?id=${encodeURIComponent(jar.id)}`}
    >
      {jar.completedAt ? (
        <span className="absolute right-3 top-3 rounded-full border border-mint/70 bg-cream px-3 py-1 text-xs font-semibold text-ink shadow-sm">
          ✓ Complete
        </span>
      ) : null}
      <MiniJar jar={jar} />
      <h2 className="mt-5 w-full truncate font-heading text-2xl font-semibold text-ink">
        {jar.name}
      </h2>
      <p className="mt-2 text-sm font-semibold text-soft-ink">
        {jar.marbles.length} / {jar.target}
      </p>
      {streakCount >= 3 ? (
        <p
          aria-label={`${streakCount} day streak`}
          className="mt-3 inline-flex items-center gap-1 rounded-full border border-butter/70 bg-butter/20 px-2.5 py-1 text-xs font-semibold text-ink"
        >
          <span aria-hidden="true">🔥</span>
          <span>{streakCount}</span>
        </p>
      ) : null}
    </Link>
  );
}

export default function Home() {
  const [jars, setJars] = useState<Jar[]>([]);
  const [completedJars, setCompletedJars] = useState<Jar[]>([]);

  useEffect(() => {
    setJars(loadJars());
    setCompletedJars(loadCompletedJars());
  }, []);

  if (jars.length === 0 && completedJars.length === 0) {
    return <EmptyState />;
  }

  return (
    <section className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-6xl px-5 pb-16 pt-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Your jars
        </h1>
        <Link
          className="fixed right-5 top-5 z-10 rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-cream shadow-md transition hover:bg-soft-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream"
          href="/jars/new"
        >
          + New jar
        </Link>
      </div>
      {jars.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {jars.map((jar) => (
            <JarCard jar={jar} key={jar.id} />
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
  );
}
