"use client";

import Link from "next/link";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { BadgeSheet } from "../components/badge-sheet";
import { Jar as JarVisual } from "../components/jar";
import { Badge, Button, buttonClasses, Card } from "../components/ui";
import { cn } from "../../lib/cn";
import { getJarColor } from "../../lib/jar-colors";
import { getLocalDateKey } from "../../lib/local-date";
import { type JarStorage, loadJarStorage } from "../../lib/storage";
import {
  computeWeekRecap,
  type DayState,
  formatDelta,
  formatShortDate,
  formatWeekRange,
  getWeek,
  getWeekdayName,
  hasFinishedWeek,
  type JarWeek,
  pluralDays,
  WEEKDAY_NAMES,
  type WeekKind,
  type WeekRecap,
} from "../../lib/week";

const TOAST_DURATION_MS = 2600;

const tabs: { kind: WeekKind; label: string }[] = [
  { kind: "last", label: "Last week" },
  { kind: "this", label: "This week" },
];

const daySlotLabels: Record<DayState, string> = {
  marble: "marble",
  missed: "no marble",
  before: "before jar was created",
  future: "not yet",
};

const noteClasses =
  "mt-3 rounded-lg border border-sky/45 bg-sky/15 px-3.5 py-3 text-sm leading-6 text-ink";

function readInitialWeekFromLocation(): WeekKind {
  return new URLSearchParams(window.location.search).get("week") === "this"
    ? "this"
    : "last";
}

type StatContent = { value: string; label: string; srLabel?: string };

// Comparison values show arrow + text, and screen readers get a sentence
// instead of the symbols, so the meaning never depends on colour or glyphs.
function StatValue({ value, srLabel }: StatContent) {
  if (!srLabel) {
    return <>{value}</>;
  }

  return (
    <>
      <span aria-hidden="true">{value}</span>
      <span className="sr-only">{srLabel}</span>
    </>
  );
}

function Stat(content: StatContent) {
  return (
    <div>
      <div className="text-base font-bold text-ink">
        <StatValue {...content} />
      </div>
      <div className="mt-0.5 text-xs text-soft-ink">{content.label}</div>
    </div>
  );
}

function SummaryRow({ recap }: { recap: WeekRecap }) {
  let third: StatContent;

  if (recap.kind === "this") {
    third = { value: `${recap.daysSoFar}/7`, label: "Days so far" };
  } else if (recap.comparison === null) {
    third = { value: "—", label: "No last week yet" };
  } else {
    const delta = formatDelta(recap.comparison.delta);

    // The summary reads "＝ 0" where per-jar cards read "＝ Same".
    third = {
      value: `${delta.symbol} ${recap.comparison.delta === 0 ? "0" : delta.text}`,
      label: "vs last week",
      srLabel: delta.srLabel,
    };
  }

  const cells: StatContent[] = [
    { value: String(recap.total), label: "Marbles" },
    { value: pluralDays(recap.bestStreak), label: "Best streak" },
    third,
  ];

  return (
    <Card className="mt-4 grid grid-cols-3 px-1 py-3.5 text-center">
      {cells.map((cell, index) => (
        <div className={cn(index > 0 && "border-l border-line")} key={cell.label}>
          <div className="font-heading text-[26px] font-semibold leading-tight text-ink">
            <StatValue {...cell} />
          </div>
          <div className="mt-0.5 text-xs text-soft-ink">{cell.label}</div>
        </div>
      ))}
    </Card>
  );
}

function DaySlots({ jarWeek }: { jarWeek: JarWeek }) {
  const colorStyles = getJarColor(jarWeek.jar.color);

  return (
    <div
      aria-label="Days this week"
      className="mt-3.5 grid grid-cols-7 gap-1.5"
      role="list"
    >
      {jarWeek.days.map((state, index) => (
        <div
          aria-label={`${WEEKDAY_NAMES[index]}: ${daySlotLabels[state]}`}
          className="flex flex-col items-center gap-1.5 text-[11px] font-semibold text-soft-ink"
          key={WEEKDAY_NAMES[index]}
          role="listitem"
        >
          <span
            className={cn(
              "day-slot h-7 w-7",
              state === "marble"
                ? cn("jar__marble", colorStyles.solid)
                : `day-slot--${state}`,
            )}
            data-state={state}
          />
          <span aria-hidden="true">{WEEKDAY_NAMES[index][0]}</span>
        </div>
      ))}
    </div>
  );
}

function JarWeekCard({
  jarWeek,
  kind,
  onGetBadge,
}: {
  jarWeek: JarWeek;
  kind: WeekKind;
  onGetBadge: (button: HTMLButtonElement) => void;
}) {
  const colorStyles = getJarColor(jarWeek.jar.color);
  const isLastWeek = kind === "last";
  const showStarterLabel = isLastWeek && jarWeek.isFirstWeek;
  let comparison: StatContent;

  if (!isLastWeek) {
    comparison = { value: "—", label: "Compare on Sun" };
  } else if (jarWeek.previous === null || jarWeek.delta === null) {
    comparison = { value: "—", label: "No last week yet" };
  } else {
    const delta = formatDelta(jarWeek.delta);

    comparison = {
      value: `${delta.symbol} ${delta.text}`,
      label: `vs ${jarWeek.previous} last week`,
      srLabel: delta.srLabel,
    };
  }

  let footer = null;

  if (isLastWeek && jarWeek.isFull) {
    footer = (
      <Button
        className="mt-3.5 min-h-11 w-full"
        onClick={(event) => onGetBadge(event.currentTarget)}
      >
        Get your badge
      </Button>
    );
  } else if (isLastWeek && jarWeek.filledOn) {
    footer = (
      <p className="mt-3 text-[13px] text-soft-ink">
        Jar filled on {getWeekdayName(jarWeek.filledOn)}{" "}
        <span aria-hidden="true">🎉</span>
      </p>
    );
  } else if (isLastWeek && jarWeek.marbles > 0) {
    footer = (
      <p className="mt-3 text-[13px] text-soft-ink">
        {pluralDays(jarWeek.daysInScope - jarWeek.marbles)} short of a full
        week badge.
      </p>
    );
  }

  return (
    <article
      aria-label={jarWeek.jar.name}
      className={cn(
        "rounded-[var(--radius-card)] border bg-white p-4 shadow-sm",
        colorStyles.borderSoft,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-xl font-semibold text-ink">
          <span
            aria-hidden="true"
            className={cn("h-3 w-3 flex-none rounded-full", colorStyles.solid)}
          />
          <span className="truncate">{jarWeek.jar.name}</span>
        </h3>
        {isLastWeek && jarWeek.isFull ? (
          <Badge className="whitespace-nowrap" tone="success">
            {jarWeek.isFirstWeek ? "✓ Starter week" : "✓ Full week"}
          </Badge>
        ) : null}
      </div>
      <DaySlots jarWeek={jarWeek} />
      <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-line pt-3">
        <Stat
          label={showStarterLabel ? "Days since start" : "Marbles"}
          value={`${jarWeek.marbles} / ${jarWeek.daysInScope}`}
        />
        <Stat label="Longest streak" value={pluralDays(jarWeek.longestStreak)} />
        <Stat {...comparison} />
      </div>
      {footer}
    </article>
  );
}

function GhostJar() {
  return (
    <div aria-hidden="true" className="mb-4 flex justify-center opacity-60">
      <JarVisual color="sky" variant="preview" />
    </div>
  );
}

function WeekPanel({
  recap,
  finishedWeek,
  today,
  onSelectThisWeek,
  onGetBadge,
}: {
  recap: WeekRecap;
  finishedWeek: boolean;
  today: string;
  onSelectThisWeek: () => void;
  onGetBadge: (index: number, button: HTMLButtonElement) => void;
}) {
  const isLastWeek = recap.kind === "last";

  if (isLastWeek && !finishedWeek) {
    const thisWeek = getWeek(today, "this");

    return (
      <div className="px-4 pb-2 pt-7 text-center">
        <GhostJar />
        <h2 className="text-[26px] font-semibold text-ink">
          Your first recap arrives Monday
        </h2>
        <p className="mt-2 text-[15px] leading-6 text-soft-ink">
          Last week ended before you started. Your first full week closes on
          Sunday, {formatShortDate(thisWeek.end)}.
        </p>
        <Button className="mt-5 min-h-11" onClick={onSelectThisWeek}>
          See this week so far
        </Button>
      </div>
    );
  }

  const quiet = isLastWeek && recap.total === 0;

  return (
    <>
      <SummaryRow recap={recap} />
      {!isLastWeek ? (
        <p className={noteClasses}>
          This week is still going. Badges unlock Monday for every jar that
          gets a marble each day.
        </p>
      ) : null}
      {isLastWeek && recap.allFirstWeek ? (
        <p className={noteClasses}>
          <strong>Your first week!</strong> We count from the day you created
          each jar, so a late start can still be a full week. Comparisons start
          next week.
        </p>
      ) : null}
      {quiet ? (
        <div className="px-4 pb-2 pt-7 text-center">
          <GhostJar />
          <h2 className="text-[26px] font-semibold text-ink">A quiet week</h2>
          <p className="mt-2 text-[15px] leading-6 text-soft-ink">
            No marbles went in between {formatShortDate(recap.week.start)} and{" "}
            {formatShortDate(recap.week.end)}. That happens — your jars kept
            every marble from before, and Monday was a fresh start.
          </p>
          <Link className={buttonClasses({ className: "mt-5 min-h-11" })} href="/">
            Drop today&apos;s marble
          </Link>
        </div>
      ) : null}
      {recap.jars.length > 0 ? (
        <>
          <h2 className="mb-3 mt-6 text-[22px] font-semibold text-ink">
            {quiet ? "Your jars" : "By jar"}
          </h2>
          <div className="flex flex-col gap-3">
            {recap.jars.map((jarWeek, index) => (
              <JarWeekCard
                jarWeek={jarWeek}
                key={jarWeek.jar.id}
                kind={recap.kind}
                onGetBadge={(button) => onGetBadge(index, button)}
              />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

export default function RecapPage() {
  const [data, setData] = useState<{
    storage: JarStorage;
    today: string;
  } | null>(null);
  const [kind, setKind] = useState<WeekKind>("last");
  const [badgeIndex, setBadgeIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(
    null,
  );
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tabRefs = useRef<Record<WeekKind, HTMLButtonElement | null>>({
    last: null,
    this: null,
  });
  const badgeTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Read-only: the recap never writes storage or the URL.
    setData({
      storage: loadJarStorage(),
      today: getLocalDateKey(new Date()),
    });
    setKind(readInitialWeekFromLocation());
  }, []);

  useEffect(() => {
    if (data) {
      titleRef.current?.focus();
    }
  }, [data]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    // Runs after the page is no longer inert, so focus can land on the trigger.
    if (badgeIndex === null && badgeTriggerRef.current) {
      badgeTriggerRef.current.focus();
      badgeTriggerRef.current = null;
    }
  }, [badgeIndex]);

  const closeBadge = useCallback(() => setBadgeIndex(null), []);
  const showSavedToast = useCallback(
    () => setToast((current) => ({ id: (current?.id ?? 0) + 1, text: "Image saved" })),
    [],
  );

  if (!data) {
    return null;
  }

  const recap = computeWeekRecap(data.storage, data.today, kind);
  const finishedWeek = hasFinishedWeek(data.storage, data.today);
  const badgeJarWeek =
    kind === "last" && badgeIndex !== null ? recap.jars[badgeIndex] : null;

  function selectTab(nextKind: WeekKind, focus = false) {
    setKind(nextKind);

    if (focus) {
      tabRefs.current[nextKind]?.focus();
    }
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const nextKind: Partial<Record<string, WeekKind>> = {
      ArrowLeft: kind === "last" ? "this" : "last",
      ArrowRight: kind === "last" ? "this" : "last",
      Home: "last",
      End: "this",
    };
    const target = nextKind[event.key];

    if (target) {
      event.preventDefault();
      selectTab(target, true);
    }
  }

  return (
    <>
      <section
        className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-2xl px-5 pb-16 pt-2"
        inert={badgeJarWeek !== null}
      >
        <Link
          className={buttonClasses({
            variant: "ghost",
            size: "sm",
            className: "-ml-4 min-h-11 text-soft-ink shadow-none",
          })}
          href="/"
        >
          ← Your jars
        </Link>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-soft-ink">
          Weekly recap
        </p>
        <h1
          className="mt-1 font-heading text-4xl font-semibold leading-tight text-ink focus:outline-none"
          ref={titleRef}
          tabIndex={-1}
        >
          {formatWeekRange(recap.week)}
        </h1>
        <div
          aria-label="Choose week"
          className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-line/60 p-1"
          onKeyDown={handleTabKeyDown}
          role="tablist"
        >
          {tabs.map((tab) => {
            const selected = tab.kind === kind;

            return (
              <button
                aria-controls={`recap-panel-${tab.kind}`}
                aria-selected={selected}
                className={cn(
                  "min-h-11 rounded-md px-2 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink",
                  selected
                    ? "bg-white text-ink shadow-sm"
                    : "text-soft-ink hover:text-ink",
                )}
                id={`recap-tab-${tab.kind}`}
                key={tab.kind}
                onClick={() => selectTab(tab.kind)}
                ref={(element) => {
                  tabRefs.current[tab.kind] = element;
                }}
                role="tab"
                tabIndex={selected ? 0 : -1}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {tabs.map((tab) => (
          <div
            aria-labelledby={`recap-tab-${tab.kind}`}
            hidden={tab.kind !== kind}
            id={`recap-panel-${tab.kind}`}
            key={tab.kind}
            role="tabpanel"
          >
            {tab.kind === kind ? (
              <WeekPanel
                finishedWeek={finishedWeek}
                onGetBadge={(index, button) => {
                  badgeTriggerRef.current = button;
                  setBadgeIndex(index);
                }}
                onSelectThisWeek={() => selectTab("this", true)}
                recap={recap}
                today={data.today}
              />
            ) : null}
          </div>
        ))}
      </section>

      {badgeJarWeek ? (
        <BadgeSheet
          jarWeek={badgeJarWeek}
          onClose={closeBadge}
          onSaved={showSavedToast}
          week={recap.week}
        />
      ) : null}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-5 top-4 z-[60] flex justify-center"
        role="status"
      >
        {toast ? (
          <span
            className="toast w-full max-w-[360px] rounded-lg bg-ink px-3.5 py-3 text-sm font-semibold text-cream shadow-md"
            key={toast.id}
          >
            {toast.text}
          </span>
        ) : null}
      </div>
    </>
  );
}
