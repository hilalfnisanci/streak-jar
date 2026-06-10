"use client";

import { useEffect, useRef } from "react";

type CelebrationModalProps = {
  open: boolean;
  jarName: string;
  target: number;
  onClose: () => void;
};

const confettiColors = [
  "bg-coral",
  "bg-mint",
  "bg-lavender",
  "bg-butter",
  "bg-sky",
  "bg-peach",
  "bg-lilac",
  "bg-sage",
] as const;

export function CelebrationModal({
  open,
  jarName,
  target,
  onClose,
}: CelebrationModalProps) {
  const doneButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    doneButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "Tab") {
        event.preventDefault();
        doneButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby="celebration-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center overflow-hidden bg-ink/55 px-5 py-8"
      role="dialog"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {Array.from({ length: 40 }, (_, index) => {
          const colorClass = confettiColors[index % confettiColors.length];
          const size = 10 + (index % 4) * 3;

          return (
            <span
              className={`confetti-piece absolute top-0 rounded-sm ${colorClass}`}
              key={index}
              style={{
                animationDelay: `${(index % 10) * 0.18}s`,
                animationDuration: `${3.4 + (index % 6) * 0.25}s`,
                height: `${size}px`,
                left: `${(index * 37) % 100}%`,
                width: `${size}px`,
              }}
            />
          );
        })}
      </div>

      <div className="relative w-full max-w-lg rounded-lg border border-line bg-cream px-6 py-8 text-center shadow-2xl sm:px-10 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-soft-ink">
          Target reached
        </p>
        <h2
          className="mt-3 font-heading text-4xl font-semibold leading-tight text-ink sm:text-5xl"
          id="celebration-modal-title"
        >
          Jar full!
        </h2>
        <p className="mt-5 text-base leading-7 text-soft-ink sm:text-lg">
          {jarName} reached {target} marbles. Take a moment to celebrate this
          round.
        </p>
        <button
          className="mt-8 rounded-lg bg-ink px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-soft-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream"
          onClick={onClose}
          ref={doneButtonRef}
          type="button"
        >
          Done
        </button>
      </div>
    </div>
  );
}
