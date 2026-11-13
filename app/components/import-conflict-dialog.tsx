"use client";

import { useEffect, useRef, useState } from "react";

import { Badge, Button } from "./ui";
import { type ConflictChoice, type JarConflict } from "../../lib/backup";
import { type Jar } from "../../lib/storage";

type ImportConflictDialogProps = {
  conflicts: JarConflict[];
  onConfirm: (choices: Record<string, ConflictChoice>) => void;
  onCancel: () => void;
};

const choiceOptions: { value: ConflictChoice; label: string }[] = [
  { value: "local", label: "Keep mine" },
  { value: "incoming", label: "Use backup" },
  { value: "both", label: "Keep both" },
];

function JarSummary({
  heading,
  jar,
  showName,
}: {
  heading: string;
  jar: Jar;
  showName: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-soft-ink">
        {heading}
      </p>
      {showName ? (
        <p className="mt-1 truncate text-sm font-semibold text-ink">{jar.name}</p>
      ) : null}
      <p className="mt-1 text-sm text-ink">
        {jar.marbles.length} / {jar.target} marbles
      </p>
      {jar.completedAt ? (
        <Badge className="mt-2" tone="success">
          Complete
        </Badge>
      ) : null}
    </div>
  );
}

export function ImportConflictDialog({
  conflicts,
  onConfirm,
  onCancel,
}: ImportConflictDialogProps) {
  const [choices, setChoices] = useState<Record<string, ConflictChoice>>(() =>
    Object.fromEntries(conflicts.map((conflict) => [conflict.id, "local"])),
  );
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLInputElement>("input[type=radio]")?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled])",
        ),
      );

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!panelRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const chooseAll = (choice: ConflictChoice) =>
    setChoices(
      Object.fromEntries(conflicts.map((conflict) => [conflict.id, choice])),
    );

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-ink/40"
        onClick={onCancel}
      />
      <div
        aria-labelledby="import-conflict-title"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[96dvh] flex-col rounded-t-[20px] bg-cream px-5 pb-6 pt-5 shadow-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(560px,calc(100%-40px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-panel)]"
        ref={panelRef}
        role="dialog"
      >
        <h2
          className="font-heading text-[22px] font-semibold text-ink"
          id="import-conflict-title"
        >
          Some jars are already on this device
        </h2>
        <p className="mt-1 text-sm leading-6 text-soft-ink">
          Choose which version to keep for each jar.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => chooseAll("local")} size="sm" variant="secondary">
            Keep mine for all
          </Button>
          <Button
            onClick={() => chooseAll("incoming")}
            size="sm"
            variant="secondary"
          >
            Use backup for all
          </Button>
        </div>

        <div className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto">
          {conflicts.map((conflict) => {
            const namesDiffer = conflict.local.name !== conflict.incoming.name;

            return (
              <fieldset
                className="rounded-lg border border-line p-3"
                key={conflict.id}
              >
                <legend className="px-1 text-sm font-semibold text-ink">
                  {conflict.local.name}
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  <JarSummary
                    heading="This device"
                    jar={conflict.local}
                    showName={namesDiffer}
                  />
                  <JarSummary
                    heading="Backup file"
                    jar={conflict.incoming}
                    showName={namesDiffer}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {choiceOptions.map((option) => (
                    <label
                      className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink"
                      key={option.value}
                    >
                      <input
                        checked={choices[conflict.id] === option.value}
                        className="h-4 w-4 accent-ink"
                        name={`conflict-${conflict.id}`}
                        onChange={() =>
                          setChoices((current) => ({
                            ...current,
                            [conflict.id]: option.value,
                          }))
                        }
                        type="radio"
                        value={option.value}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button onClick={() => onConfirm(choices)}>Import</Button>
        </div>
      </div>
    </>
  );
}
