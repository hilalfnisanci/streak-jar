import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { JarGlyph } from "../components/header";
import { Jar as JarVisual } from "../components/jar";
import { Badge, buttonClasses, Card, cardClasses } from "../components/ui";
import { cn } from "../../lib/cn";
import { getJarColor } from "../../lib/jar-colors";
import { getDemoBookingUrl, type DemoBookingSlot } from "../../lib/site";
import type { MarbleEntry } from "../../lib/storage";

export const metadata: Metadata = {
  title: "Streak Jar — Book a demo",
  description:
    "A calm marble-jar habit tracker for teams that want visible progress without streak anxiety.",
};

const heroMarbles = Array.from({ length: 18 }, (_, index) =>
  `hero-marble-${index}`,
);

const methodSteps = [
  {
    title: "Choose one habit",
    copy:
      "Pick a single thing worth doing daily. One jar, one promise — and a target you can actually finish.",
  },
  {
    title: "Drop a marble",
    copy:
      "One tap when it’s done. It takes a second, and it is the only interaction there is.",
  },
  {
    title: "Watch it fill",
    copy:
      "The jar fills in colour. When it’s full, the team gets its moment — and the jar keeps its place on the shelf.",
  },
] as const;

const teamValues = [
  {
    title: "Shared, not surveilled",
    copy:
      "A jar shows the team’s momentum, not an individual’s shortfall. No leaderboards, nobody ranked against anyone.",
    color: "sky",
  },
  {
    title: "Calm by design",
    copy:
      "No notifications, no guilt mechanics, no red streak counter. Momentum you can glance at and put down.",
    color: "lavender",
  },
  {
    title: "A moment worth finishing",
    copy:
      "A full jar earns a celebration and a place on the Trophy Shelf. Finishing is the point, not an endless streak.",
    color: "butter",
  },
] as const;

const shelfJars = [
  { name: "Daily stand-up notes", color: "coral", target: 30 },
  { name: "Ten minutes of reading", color: "sky", target: 21 },
  { name: "Inbox to zero", color: "butter", target: 14 },
  { name: "Walk at lunch", color: "sage", target: 30 },
] as const;

const faqs = [
  {
    question: "How long is the demo?",
    answer:
      "Twenty minutes. We set up a jar for a habit your team is already trying to keep, and you see the whole thing end to end.",
  },
  {
    question: "Where does our data live?",
    answer:
      "In your own browser today. Nothing is uploaded and there is no account to create. Shared team jars are exactly what the call is for — we’ll walk you through how we’d set that up for you.",
  },
  {
    question: "Do we need to install anything?",
    answer: "No. It runs in the browser.",
  },
] as const;

function getFilledMarbles(count: number): MarbleEntry[] {
  return Array.from({ length: count }, (_, index) => `filled-marble-${index}`);
}

function ExternalLinkIcon() {
  return (
    <>
      <span aria-hidden="true">↗</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </>
  );
}

function DemoLink({
  slot,
  variant = "primary",
  size = "lg",
  className,
}: {
  slot: DemoBookingSlot;
  variant?: "primary" | "secondary";
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <a
      aria-label="Book a demo (opens in a new tab)"
      className={buttonClasses({
        variant,
        size,
        className: cn("gap-2", className),
      })}
      href={getDemoBookingUrl(slot)}
      rel="noopener noreferrer"
      target="_blank"
    >
      Book a demo
      <ExternalLinkIcon />
    </a>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-transparent bg-cream/90 backdrop-blur">
      <nav
        aria-label="Landing page"
        className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8"
      >
        <Link
          aria-label="Streak Jar landing page"
          className="inline-flex items-center gap-3 text-ink no-underline"
          href="/"
        >
          <JarGlyph />
          <span className="font-heading text-2xl font-semibold">Streak Jar</span>
        </Link>
        <DemoLink slot="nav" variant="secondary" size="sm" />
      </nav>
    </header>
  );
}

function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-soft-ink">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-heading text-3xl font-semibold leading-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {children ? (
        <div className="mt-4 text-base leading-7 text-soft-ink sm:text-lg">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function HeroSection() {
  return (
    <section className="px-5 py-16 sm:px-8 lg:py-22">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <Badge>For teams</Badge>
          <h1 className="mt-4 max-w-2xl font-heading text-5xl font-semibold leading-[1.06] text-ink sm:text-6xl">
            Progress your team can see filling.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-soft-ink">
            Streak Jar turns one shared habit into one marble a day. No
            dashboards to interpret, no streak anxiety — just a jar that fills
            as your team shows up.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-5">
            <DemoLink slot="hero" />
            <a
              className={buttonClasses({
                variant: "ghost",
                size: "md",
                className: "shadow-none",
              })}
              href="#method"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-sm text-soft-ink">
            Twenty minutes, no slides. Nothing to install.
          </p>
        </div>
        <div className="grid place-items-center">
          <div className="relative grid w-full place-items-center">
            <div
              aria-hidden="true"
              className="absolute inset-x-4 bottom-10 top-10 rounded-full bg-glass/70 blur-2xl"
            />
            <JarVisual
              className="relative"
              color="mint"
              marbles={heroMarbles}
              name="Daily stand-up notes"
              target={24}
              variant="large"
            />
          </div>
          <p className="mt-4 text-center text-sm text-soft-ink">
            “Daily stand-up notes” · 18 of 24 marbles
          </p>
        </div>
      </div>
    </section>
  );
}

function MethodSection() {
  return (
    <section
      className="border-y border-line bg-glass/30 px-5 py-16 sm:px-8 lg:py-22"
      id="method"
    >
      <div className="mx-auto w-full max-w-6xl">
        <SectionHeading eyebrow="The method" title="Three steps, and then nothing to learn.">
          <p>
            The whole product is one promise, one tap and one jar. That is
            deliberate — a habit tool your team has to study is a habit tool
            your team abandons.
          </p>
        </SectionHeading>
        <ol className="mt-12 grid list-none gap-5 p-0 md:grid-cols-3">
          {methodSteps.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full p-6">
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 place-items-center rounded-full border border-line bg-cream font-heading text-lg font-semibold text-ink"
                >
                  {index + 1}
                </span>
                <h3 className="mt-5 font-heading text-xl font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-soft-ink">
                  {step.copy}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function TeamValuesSection() {
  return (
    <section className="px-5 py-16 sm:px-8 lg:py-22">
      <div className="mx-auto w-full max-w-6xl">
        <SectionHeading
          eyebrow="Why teams"
          title="Momentum you can share without ranking anyone."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {teamValues.map((value) => {
            const color = getJarColor(value.color);

            return (
              <article className={cardClasses("p-6")} key={value.title}>
                <span
                  aria-hidden="true"
                  className={cn(
                    "block h-7 w-7 rounded-full shadow-[inset_-3px_-4px_5px_rgb(49_38_31_/_24%),inset_2px_2px_3px_rgb(255_255_255_/_38%)]",
                    color.solid,
                  )}
                />
                <h3 className="mt-4 font-heading text-xl font-semibold text-ink">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-soft-ink">
                  {value.copy}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TrophyShelfSection() {
  return (
    <section className="border-y border-line bg-glass/30 px-5 py-16 sm:px-8 lg:py-22">
      <div className="mx-auto w-full max-w-6xl">
        <SectionHeading eyebrow="Trophy shelf" title="Full jars stay on the shelf.">
          <p>
            Every finished jar keeps its colour and its count. Over a quarter
            the shelf becomes the quiet record of what your team actually kept —
            not a number that resets the first day someone is ill.
          </p>
        </SectionHeading>
        <div className="mt-11">
          <div className="flex items-end gap-5 overflow-x-auto pb-5 lg:justify-center lg:overflow-visible">
            {shelfJars.map((jar) => (
              <div className="shrink-0 text-center" key={jar.name}>
                <JarVisual
                  color={jar.color}
                  marbles={getFilledMarbles(jar.target)}
                  name={jar.name}
                  target={jar.target}
                  variant="mini"
                />
                <p className="mt-3 text-sm leading-5 text-soft-ink">
                  {jar.name}
                  <br />
                  {jar.target} / {jar.target}
                </p>
              </div>
            ))}
          </div>
          <div
            aria-hidden="true"
            className="h-2.5 rounded-full border border-line bg-white/70 shadow-sm"
          />
        </div>
      </div>
    </section>
  );
}

function FaqAndClosingSection() {
  return (
    <section className="px-5 py-16 text-center sm:px-8 lg:py-22" id="book">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid gap-4 text-left lg:grid-cols-3">
          {faqs.map((faq) => (
            <Card className="p-6" key={faq.question}>
              <h3 className="font-heading text-lg font-semibold text-ink">
                {faq.question}
              </h3>
              <p className="mt-2 text-sm leading-6 text-soft-ink">
                {faq.answer}
              </p>
            </Card>
          ))}
        </div>
        <div className="mx-auto mt-16 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-soft-ink">
            Book a demo
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl font-heading text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            See a jar fill before you commit to anything.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-soft-ink">
            We’ll bring the jar. You bring the one habit your team keeps meaning
            to keep.
          </p>
          <div className="mt-8">
            <DemoLink slot="closing" />
          </div>
          <p className="mt-4 text-sm text-soft-ink">Twenty minutes, no slides.</p>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-line px-5 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
        <span className="font-heading text-lg font-semibold text-ink">
          Streak Jar
        </span>
        <Link
          className="border-b border-line pb-0.5 text-sm text-soft-ink hover:border-soft-ink hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream"
          href="/jars"
        >
          Open the app →
        </Link>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <>
      <SiteNav />
      <main id="top">
        <HeroSection />
        <MethodSection />
        <TeamValuesSection />
        <TrophyShelfSection />
        <FaqAndClosingSection />
      </main>
      <SiteFooter />
    </>
  );
}
