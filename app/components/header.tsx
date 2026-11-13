import Link from "next/link";

import { buttonClasses } from "./ui";

function JarGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-8 w-8"
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11.5 4.5h9M12.75 7.5h6.5v3.25l3.25 3.75v9.25a3.75 3.75 0 0 1-3.75 3.75h-5.5a3.75 3.75 0 0 1-3.75-3.75V14.5l3.25-3.75V7.5Z"
        className="fill-glass stroke-ink"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle className="fill-coral" cx="13" cy="22" r="2" />
      <circle className="fill-mint" cx="18.5" cy="21" r="2" />
      <circle className="fill-butter" cx="16" cy="17" r="2" />
    </svg>
  );
}

function GearGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.3 3.4a1.75 1.75 0 0 1 3.4 0l.2.8a1.75 1.75 0 0 0 2.5 1.04l.72-.4a1.75 1.75 0 0 1 2.4 2.4l-.4.72a1.75 1.75 0 0 0 1.04 2.5l.8.2a1.75 1.75 0 0 1 0 3.4l-.8.2a1.75 1.75 0 0 0-1.04 2.5l.4.72a1.75 1.75 0 0 1-2.4 2.4l-.72-.4a1.75 1.75 0 0 0-2.5 1.04l-.2.8a1.75 1.75 0 0 1-3.4 0l-.2-.8a1.75 1.75 0 0 0-2.5-1.04l-.72.4a1.75 1.75 0 0 1-2.4-2.4l.4-.72a1.75 1.75 0 0 0-1.04-2.5l-.8-.2a1.75 1.75 0 0 1 0-3.4l.8-.2a1.75 1.75 0 0 0 1.04-2.5l-.4-.72a1.75 1.75 0 0 1 2.4-2.4l.72.4a1.75 1.75 0 0 0 2.5-1.04l.2-.8Z"
        className="stroke-ink"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle className="stroke-ink" cx="12" cy="12" r="3" strokeWidth="1.5" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="w-full px-5 py-5 sm:px-8">
      <div className="flex items-center gap-2">
        <a
          className="inline-flex items-center gap-3 text-ink"
          href="/"
          aria-label="Streak Jar home"
        >
          <JarGlyph />
          <span className="font-heading text-2xl font-semibold">Streak Jar</span>
        </a>
        <Link
          aria-label="Settings"
          className={buttonClasses({
            variant: "ghost",
            size: "sm",
            className: "h-11 w-11 p-0 shadow-none",
          })}
          href="/settings"
        >
          <GearGlyph />
        </Link>
      </div>
    </header>
  );
}
