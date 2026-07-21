"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge, buttonClasses, cardClasses } from "./components/ui";
import { Jar as JarVisual } from "./components/jar";
import { cn } from "../lib/cn";
import {
  getJarColor,
  jarColorSolids,
} from "../lib/jar-colors";
import { type Jar, loadCompletedJars, loadJars } from "../lib/storage";
import { computeStreak } from "../lib/streak";

type OverviewStats = {
  totalMarbles: number;
  activeJars: number;
  longestStreak: number;
  completedCount: number;
};

function EmptyState() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-5xl flex-col items-center justify-center px-5 pb-16 pt-6 text-center">
      <div className={cardClasses("w-full max-w-3xl px-6 py-10 sm:px-10")}>
        <JarVisual color="mint" className="mx-auto" variant="preview" />
        <div
          className="mt-8 grid grid-cols-4 justify-center gap-2"
          aria-hidden="true"
        >
          {jarColorSolids.map((color) => (
            <span
              className={`h-5 w-5 rounded-full shadow-sm ring-1 ring-white/70 ${color}`}
              key={color}
            />
          ))}
        </div>
        <h1 className="mx-auto mt-8 max-w-2xl font-heading text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Your jars will appear here. First marble&apos;s just a tap away.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-soft-ink">
          Start with one habit, then watch the jar fill one bright marble at a
          time.
        </p>
        <Link
          className={cn("mt-8", buttonClasses())}
          href="/jars/new"
        >
          Create your first jar
        </Link>
      </div>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <article
      aria-label={`${label} overview stat`}
      className={cardClasses("px-4 py-5 sm:px-5")}
    >
      <p className="font-heading text-3xl font-semibold leading-none text-ink">
        {value}
      </p>
      <p className="mt-2 text-sm font-semibold text-soft-ink">
        {label}
      </p>
    </article>
  );
}

function OverviewHeader({ stats }: { stats: OverviewStats }) {
  return (
    <header className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-soft-ink">
            Overview
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            Your jars
          </h1>
        </div>
        <Link
          className={buttonClasses({
            size: "sm",
            className: "shrink-0 self-start",
          })}
          href="/jars/new"
        >
          + New jar
        </Link>
      </div>
      <div
        aria-label="Overview stats"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <StatTile label="Marbles collected" value={stats.totalMarbles} />
        <StatTile label="Active jars" value={stats.activeJars} />
        <StatTile label="Longest streak" value={stats.longestStreak} />
        <StatTile label="Completed" value={stats.completedCount} />
      </div>
    </header>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-lg bg-line/60 motion-reduce:animate-none",
        className,
      )}
    />
  );
}

function DashboardSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading your jars"
      className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-6xl px-5 pb-16 pt-6"
      role="status"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-12 w-48" />
        </div>
        <SkeletonBlock className="h-10 w-28" />
      </div>
      <div
        aria-hidden="true"
        className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className={cardClasses("px-4 py-5 sm:px-5")}
            key={`stat-skeleton-${index}`}
          >
            <SkeletonBlock className="h-8 w-14" />
            <SkeletonBlock className="mt-3 h-4 w-24 max-w-full" />
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <div
            className={cardClasses("min-h-72 px-5 py-6")}
            key={`jar-skeleton-${index}`}
          >
            <SkeletonBlock className="mx-auto h-40 w-28" />
            <SkeletonBlock className="mx-auto mt-5 h-7 w-36 max-w-full" />
            <SkeletonBlock className="mx-auto mt-3 h-4 w-16" />
          </div>
        ))}
      </div>
    </section>
  );
}

function JarCard({ jar }: { jar: Jar }) {
  const colorStyles = getJarColor(jar.color);
  const streakCount = computeStreak(jar.marbles);

  return (
    <Link
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setJars(loadJars());
    setCompletedJars(loadCompletedJars());
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <DashboardSkeleton />;
  }

  if (jars.length === 0 && completedJars.length === 0) {
    return <EmptyState />;
  }

  const stats = {
    totalMarbles: [...jars, ...completedJars].reduce(
      (total, jar) => total + jar.marbles.length,
      0,
    ),
    activeJars: jars.length,
    longestStreak: jars.reduce(
      (longest, jar) => Math.max(longest, computeStreak(jar.marbles)),
      0,
    ),
    completedCount: completedJars.length,
  };

  return (
    <section className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-6xl px-5 pb-16 pt-6">
      <OverviewHeader stats={stats} />
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
