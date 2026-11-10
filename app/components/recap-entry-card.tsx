import Link from "next/link";

import { cardClasses } from "./ui";
import { cn } from "../../lib/cn";
import { getJarColor } from "../../lib/jar-colors";
import { type JarStorage } from "../../lib/storage";
import {
  computeWeekRecap,
  formatWeekRange,
  hasFinishedWeek,
  pluralize,
  type WeekRecap,
} from "../../lib/week";

const PREVIEW_MARBLES = 10;

type EntryContent = {
  href: string;
  recap: WeekRecap;
  head: string;
  sub: string;
  cta: string;
  quiet: boolean;
};

function getEntryContent(storage: JarStorage, today: string): EntryContent {
  if (!hasFinishedWeek(storage, today)) {
    return {
      href: "/recap?week=this",
      recap: computeWeekRecap(storage, today, "this"),
      head: "Your first recap arrives Monday",
      sub: "See this week so far",
      cta: "See this week →",
      quiet: false,
    };
  }

  const recap = computeWeekRecap(storage, today, "last");
  const range = formatWeekRange(recap.week);
  const badgeReady = recap.fullCount > 0;
  const base = { href: "/recap", recap, cta: "See your week →", quiet: false };

  if (recap.total === 0) {
    return {
      ...base,
      head: "Last week was quiet",
      sub: `No marbles ${range}. A fresh week started Monday.`,
      quiet: true,
    };
  }

  if (recap.allFirstWeek) {
    return {
      ...base,
      head: "Your first week is in",
      sub: `${pluralize(recap.total, "marble", "marbles")} since you started · ${badgeReady ? "badge ready" : "see how it went"}`,
    };
  }

  return {
    ...base,
    head: `${pluralize(recap.total, "marble", "marbles")} last week`,
    sub: badgeReady
      ? `${pluralize(recap.fullCount, "jar", "jars")} filled every day · badge ready`
      : "See how each jar did",
  };
}

export function RecapEntryCard({
  storage,
  today,
}: {
  storage: JarStorage;
  today: string;
}) {
  const { href, recap, head, sub, cta, quiet } = getEntryContent(
    storage,
    today,
  );
  const range = formatWeekRange(recap.week);
  const previewColors = quiet
    ? []
    : recap.jars
        .flatMap((jarWeek) =>
          jarWeek.days
            .filter((state) => state === "marble")
            .map(() => getJarColor(jarWeek.jar.color).solid),
        )
        .slice(0, PREVIEW_MARBLES);

  return (
    <Link
      aria-label={`Weekly recap, ${range}. ${head}. ${sub}. Open recap`}
      className={cardClasses(
        "mt-6 block min-h-11 w-full p-4 transition motion-safe:hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream sm:grid sm:grid-cols-[1fr_auto] sm:items-center sm:gap-x-6 sm:px-6 sm:py-5",
      )}
      href={href}
    >
      <span className="block">
        <span className="block text-xs font-semibold uppercase tracking-wide text-soft-ink">
          Weekly recap · {range}
        </span>
        <span className="mt-1 block font-heading text-[22px] font-semibold text-ink">
          {head}
        </span>
        <span className="mt-1 block text-sm text-soft-ink">{sub}</span>
      </span>
      <span
        aria-hidden="true"
        className="mt-3 flex items-center justify-between gap-3 sm:mt-0 sm:gap-6"
      >
        <span className="flex gap-1">
          {previewColors.length > 0
            ? previewColors.map((colorClass, index) => (
                <span
                  className={cn("jar__marble h-3.5 w-3.5", colorClass)}
                  key={index}
                />
              ))
            : Array.from({ length: 7 }, (_, index) => (
                <span
                  className="day-slot day-slot--missed h-3.5 w-3.5"
                  key={index}
                />
              ))}
        </span>
        <span className="whitespace-nowrap text-sm font-semibold text-ink">
          {cta}
        </span>
      </span>
    </Link>
  );
}
