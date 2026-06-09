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

export function Header() {
  return (
    <header className="w-full px-5 py-5 sm:px-8">
      <a
        className="inline-flex items-center gap-3 text-ink"
        href="/"
        aria-label="Streak Jar home"
      >
        <JarGlyph />
        <span className="font-heading text-2xl font-semibold">Streak Jar</span>
      </a>
    </header>
  );
}
