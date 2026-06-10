"use client";

import { useEffect, useRef } from "react";

type CelebrationModalProps = {
  open: boolean;
  jarName: string;
  target: number;
  onClose: () => void;
  onKeepOnDisplay: () => void;
  onPourIntoTrophyShelf: () => void;
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
  onKeepOnDisplay,
  onPourIntoTrophyShelf,
}: CelebrationModalProps) {
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    primaryButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "Tab") {
        const focusableButtons =
          modalRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [];

        if (focusableButtons.length === 0) {
          return;
        }

        const firstButton = focusableButtons[0];
        const lastButton = focusableButtons[focusableButtons.length - 1];

        if (event.shiftKey && document.activeElement === firstButton) {
          event.preventDefault();
          lastButton.focus();
          return;
        }

        if (!event.shiftKey && document.activeElement === lastButton) {
          event.preventDefault();
          firstButton.focus();
          return;
        }
      }

      if (
        event.key === "Tab" &&
        modalRef.current &&
        !modalRef.current.contains(document.activeElement)
      ) {
        event.preventDefault();
        primaryButtonRef.current?.focus();
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
      className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center overflow-hidden bg-cream px-5 py-8"
      role="dialog"
    >
      <div aria-hidden="true" className="celebration-pattern absolute inset-0" />
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

      <div
        className="relative w-full max-w-xl rounded-lg border border-line bg-white/85 px-6 py-8 text-center shadow-2xl backdrop-blur-sm sm:px-10 sm:py-10"
        ref={modalRef}
      >
        <button
          aria-label="Close celebration"
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-cream text-2xl leading-none text-soft-ink shadow-sm transition hover:border-soft-ink hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
        <p className="text-sm font-semibold uppercase tracking-wide text-soft-ink">
          Target reached
        </p>
        <h2
          className="mt-3 font-heading text-4xl font-semibold leading-tight text-ink sm:text-5xl"
          id="celebration-modal-title"
        >
          You finished your {jarName} jar! 🎉
        </h2>
        <p className="mt-5 text-base leading-7 text-soft-ink sm:text-lg">
          {target} marbles, all stacked. That&apos;s the whole jar.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            className="rounded-lg bg-ink px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-soft-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream"
            onClick={onPourIntoTrophyShelf}
            ref={primaryButtonRef}
            type="button"
          >
            Pour into trophy shelf
          </button>
          <button
            className="rounded-lg border border-line bg-white px-6 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-soft-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream"
            onClick={onKeepOnDisplay}
            type="button"
          >
            Keep on display
          </button>
        </div>
      </div>
    </div>
  );
}
