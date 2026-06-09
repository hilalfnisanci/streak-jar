const marbleColors = [
  "bg-coral",
  "bg-mint",
  "bg-lavender",
  "bg-butter",
  "bg-sky",
  "bg-peach",
  "bg-lilac",
  "bg-sage",
];

export default function Home() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-4xl flex-col items-center justify-center px-5 pb-16 text-center">
      <div className="mb-8 grid grid-cols-4 gap-2" aria-hidden="true">
        {marbleColors.map((color) => (
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
    </section>
  );
}
