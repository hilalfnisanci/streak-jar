"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { CelebrationModal } from "../components/celebration-modal";
import { Badge, Button, buttonClasses, Card, cardClasses } from "../components/ui";
import { cn } from "../../lib/cn";
import { getJarColor } from "../../lib/jar-colors";
import {
  findJarById,
  type Jar,
  type MarbleEntry,
  loadJarStorage,
  saveJarStorage,
} from "../../lib/storage";
import { computeStreak } from "../../lib/streak";

const CELEBRATION_DELAY_MS = 650;

type DropCue = {
  marbleKey: string;
  message: string;
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(date: string, offsetDays: number) {
  const shiftedDate = new Date(`${date}T00:00:00.000Z`);
  shiftedDate.setUTCDate(shiftedDate.getUTCDate() + offsetDays);

  return shiftedDate.toISOString().slice(0, 10);
}

function getMarbleDate(marble: MarbleEntry) {
  return typeof marble === "string" ? marble : marble.date;
}

function getMarbleKey(marble: MarbleEntry, index: number) {
  if (typeof marble === "string") {
    return `${marble}-${index}`;
  }

  return `${marble.date}-${marble.at}`;
}

function getMarbleDateSet(marbles: MarbleEntry[]) {
  return new Set(
    marbles
      .map((marble) => getMarbleDate(marble))
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
  );
}

function getFillPercent(jar: Jar) {
  if (jar.target <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((jar.marbles.length / jar.target) * 100));
}

function getDropMessage(streakCount: number) {
  if (streakCount >= 10) {
    return `${streakCount} in a row!`;
  }

  if (streakCount >= 3) {
    return "Keep going";
  }

  return "Nice!";
}

function getLastFourteenDays(today: string) {
  return Array.from({ length: 14 }, (_, index) => shiftDate(today, index - 13));
}

function readJarIdFromLocation() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("id") ?? "";
}

function NotFoundState() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-3xl flex-col items-center justify-center px-5 pb-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-soft-ink">
        404
      </p>
      <h1 className="mt-3 font-heading text-4xl font-semibold leading-tight text-ink">
        Jar not found
      </h1>
      <p className="mt-4 max-w-md text-base leading-7 text-soft-ink">
        This jar is not saved in this browser.
      </p>
      <Link
        className={cn("mt-8", buttonClasses())}
        href="/"
      >
        Back to jars
      </Link>
    </section>
  );
}

function LargeJar({ dropCue, jar }: { dropCue: DropCue | null; jar: Jar }) {
  const shouldReduceMotion = useReducedMotion();
  const colorStyles = getJarColor(jar.color);
  const fillPercent = getFillPercent(jar);
  const previewMarbles = jar.marbles.slice(-24);

  return (
    <div
      aria-label={`${jar.name} jar is ${fillPercent}% full`}
      className="relative mx-auto h-[430px] w-full max-w-[340px] sm:h-[500px] sm:max-w-[400px]"
      role="img"
    >
      <AnimatePresence>
        {dropCue ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            aria-live="polite"
            className="pointer-events-none absolute -top-2 left-0 right-0 z-20 flex justify-center"
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -8 }}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
          >
            <p className="rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-ink shadow-sm ring-1 ring-line">
              {dropCue.message}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="absolute left-1/2 top-0 h-10 w-40 -translate-x-1/2 rounded-t-lg border-4 border-ink/75 bg-glass" />
      <div className="absolute left-1/2 top-9 h-12 w-56 -translate-x-1/2 rounded-xl border-4 border-ink/75 bg-glass" />
      <div className="absolute bottom-0 left-1/2 h-[370px] w-full -translate-x-1/2 overflow-hidden rounded-b-[4rem] rounded-t-[2rem] border-4 border-ink/75 bg-white/60 shadow-inner sm:h-[430px]">
        <div
          className={`absolute bottom-0 left-0 w-full transition-all ${colorStyles.fill}`}
          style={{ height: `${fillPercent}%` }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-10 bottom-8 grid grid-cols-4 gap-3 sm:grid-cols-6"
          layout
        >
          {previewMarbles.map((marble, index) => {
            const marbleKey = getMarbleKey(marble, index);
            const isDropping = dropCue?.marbleKey === marbleKey;

            return (
              <motion.span
                animate={{ scale: 1, y: 0 }}
                className={`h-8 w-8 rounded-full shadow-sm ring-2 ring-white/80 ${colorStyles.solid}`}
                initial={
                  isDropping && !shouldReduceMotion
                    ? { scale: 0.95, y: -40 }
                    : false
                }
                key={marbleKey}
                layout
                transition={
                  isDropping && !shouldReduceMotion
                    ? {
                        bounce: 0.32,
                        damping: 14,
                        duration: 0.6,
                        stiffness: 360,
                        type: "spring",
                      }
                    : { duration: 0 }
                }
              />
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

function HistoryGrid({
  marbleDates,
  today,
  color,
}: {
  marbleDates: Set<string>;
  today: string;
  color: string;
}) {
  const colorStyles = getJarColor(color);
  const days = getLastFourteenDays(today);

  return (
    <section className="mt-10 border-t border-line pt-7">
      <h2 className="font-heading text-2xl font-semibold text-ink">
        Last 14 days
      </h2>
      <div className="mt-4 grid grid-cols-7 gap-3 md:grid-cols-[repeat(14,2.75rem)]">
        {days.map((date) => {
          const hasMarble = marbleDates.has(date);
          const isToday = date === today;
          const symbol = hasMarble ? "•" : isToday ? "?" : "○";
          const label = hasMarble
            ? `${date}: marble added`
            : isToday
              ? `${date}: not added yet`
              : `${date}: missed`;

          return (
            <span
              aria-label={label}
              className={`flex h-11 w-11 items-center justify-center rounded-full border text-xl font-semibold shadow-sm ${
                hasMarble
                  ? `${colorStyles.solid} border-transparent text-white`
                  : "border-line bg-white text-soft-ink"
              }`}
              key={date}
              role="img"
              title={date}
            >
              {symbol}
            </span>
          );
        })}
      </div>
    </section>
  );
}

export default function JarDetailPage() {
  const [jarId, setJarId] = useState("");
  const [jar, setJar] = useState<Jar | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [dropCue, setDropCue] = useState<DropCue | null>(null);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const celebrationTimerRef = useRef<number | null>(null);
  const dropCueTimerRef = useRef<number | null>(null);
  const today = getTodayDate();

  useEffect(() => {
    const currentJarId = readJarIdFromLocation();
    const storedJar = findJarById(currentJarId);

    setJarId(currentJarId);
    setJar(storedJar ?? null);
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) {
        window.clearTimeout(celebrationTimerRef.current);
      }

      if (dropCueTimerRef.current) {
        window.clearTimeout(dropCueTimerRef.current);
      }
    };
  }, []);

  const marbleDates = useMemo(
    () => getMarbleDateSet(jar?.marbles ?? []),
    [jar?.marbles],
  );
  const isDoneToday = marbleDates.has(today);
  const streakCount = computeStreak(jar?.marbles ?? []);
  const shouldShowStreakBadge =
    Number.isFinite(streakCount) &&
    Number.isInteger(streakCount) &&
    streakCount >= 3;

  const handleAddToday = () => {
    if (!jar || isDoneToday || jar.completedAt) {
      return;
    }

    const addedAt = new Date().toISOString();
    const newMarble: MarbleEntry = {
      date: today,
      at: addedAt,
    };
    const updatedMarbles = [
      ...jar.marbles,
      newMarble,
    ];
    const justCompleted = updatedMarbles.length === jar.target;
    const updatedJar: Jar = {
      ...jar,
      marbles: updatedMarbles,
    };
    const updatedJars = loadJarStorage().jars.map((candidateJar) =>
      candidateJar.id === jar.id ? updatedJar : candidateJar,
    );

    saveJarStorage({
      ...loadJarStorage(),
      jars: updatedJars,
    });
    setJar(updatedJar);
    setDropCue({
      marbleKey: getMarbleKey(newMarble, updatedMarbles.length - 1),
      message: getDropMessage(computeStreak(updatedMarbles)),
    });

    if (dropCueTimerRef.current) {
      window.clearTimeout(dropCueTimerRef.current);
    }

    dropCueTimerRef.current = window.setTimeout(() => {
      setDropCue(null);
      dropCueTimerRef.current = null;
    }, CELEBRATION_DELAY_MS);

    if (justCompleted) {
      celebrationTimerRef.current = window.setTimeout(() => {
        setIsCelebrating(true);
        celebrationTimerRef.current = null;
      }, CELEBRATION_DELAY_MS);
    }
  };

  const completeJar = (destination: "display" | "trophy") => {
    if (!jar) {
      return;
    }

    const completedJar: Jar = {
      ...jar,
      completedAt: jar.completedAt ?? new Date().toISOString(),
    };
    const storage = loadJarStorage();
    const activeJars =
      destination === "display"
        ? storage.jars.map((candidateJar) =>
            candidateJar.id === jar.id ? completedJar : candidateJar,
          )
        : storage.jars.filter((candidateJar) => candidateJar.id !== jar.id);
    const nextActiveJars =
      destination === "display" &&
      !activeJars.some((candidateJar) => candidateJar.id === jar.id)
        ? [...activeJars, completedJar]
        : activeJars;
    const completedJars =
      destination === "trophy"
        ? [
            completedJar,
            ...storage.completed.filter(
              (candidateJar) => candidateJar.id !== jar.id,
            ),
          ]
        : storage.completed.filter((candidateJar) => candidateJar.id !== jar.id);

    saveJarStorage({
      jars: nextActiveJars,
      completed: completedJars,
    });
    setJar(completedJar);
    setIsCelebrating(false);
  };

  if (!hasLoaded) {
    return null;
  }

  if (!jar || !jarId) {
    return <NotFoundState />;
  }

  const colorStyles = getJarColor(jar.color);
  const fillPercent = getFillPercent(jar);
  const isCompleted = Boolean(jar.completedAt);
  const isFull = jar.marbles.length >= jar.target;

  return (
    <section className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-6xl px-5 pb-16 pt-6">
      <Link
        className={buttonClasses({ variant: "secondary", size: "sm" })}
        href="/"
      >
        Back
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-center">
        <aside
          className={cardClasses(
            cn(colorStyles.border, colorStyles.tint, "px-5 py-8"),
          )}
        >
          <LargeJar dropCue={dropCue} jar={jar} />
        </aside>

        <div>
          <h1 className="font-heading text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            {jar.name}
          </h1>
          {isCompleted ? (
            <Badge tone="success" className="mt-4 px-3 text-sm">
              ✓ Complete
            </Badge>
          ) : null}
          {shouldShowStreakBadge ? (
            <Badge tone="streak" className="mt-4 px-3 text-sm">
              {streakCount} days in a row 🔥
            </Badge>
          ) : null}
          <p className="mt-5 text-xl font-semibold text-ink">
            {jar.marbles.length} / {jar.target} marbles
          </p>
          <p className="mt-2 text-sm font-medium text-soft-ink">
            {fillPercent}% full
          </p>
          {isCompleted ? (
            <Card className="mt-8 bg-white/75 p-5">
              <p className="font-heading text-2xl font-semibold text-ink">
                Complete
              </p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-soft-ink">
                This jar is finished and saved with its full stack of marbles.
              </p>
            </Card>
          ) : isFull ? (
            <Card className="mt-8 bg-white/75 p-5">
              <p className="font-heading text-2xl font-semibold text-ink">
                Jar full
              </p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-soft-ink">
                Choose where this completed jar should live.
              </p>
              <Button
                className="mt-5"
                onClick={() => setIsCelebrating(true)}
              >
                Finish this jar
              </Button>
            </Card>
          ) : (
            <Button
              className="mt-8 w-full sm:w-auto"
              disabled={isDoneToday}
              onClick={handleAddToday}
              size="lg"
            >
              {isDoneToday ? "Done for today ✓" : "Add today's marble"}
            </Button>
          )}
        </div>
      </div>

      <HistoryGrid marbleDates={marbleDates} today={today} color={jar.color} />
      <CelebrationModal
        jarName={jar.name}
        onClose={() => setIsCelebrating(false)}
        onKeepOnDisplay={() => completeJar("display")}
        onPourIntoTrophyShelf={() => completeJar("trophy")}
        open={isCelebrating}
        target={jar.target}
      />
    </section>
  );
}
