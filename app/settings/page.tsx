"use client";

import Link from "next/link";
import { type ChangeEvent, useRef, useState } from "react";

import { ImportConflictDialog } from "../components/import-conflict-dialog";
import { Button, buttonClasses, Card } from "../components/ui";
import {
  type ConflictChoice,
  createBackup,
  findConflicts,
  getBackupFileName,
  type JarConflict,
  MAX_BACKUP_BYTES,
  type MergeSummary,
  mergeBackup,
  parseBackup,
  serializeBackup,
} from "../../lib/backup";
import { downloadBlob } from "../../lib/badge-image";
import { createJarId } from "../../lib/jar-id";
import { getLocalDateKey } from "../../lib/local-date";
import {
  type JarStorage,
  loadJarStorage,
  saveJarStorage,
} from "../../lib/storage";

const MAX_SHOWN_ERRORS = 5;

type PendingImport = {
  storage: JarStorage;
  conflicts: JarConflict[];
};

function pluralJars(count: number) {
  return `${count} ${count === 1 ? "jar" : "jars"}`;
}

function formatSummary(summary: MergeSummary) {
  const parts = [`Imported ${pluralJars(summary.added)}`];

  if (summary.replaced > 0) {
    parts.push(`replaced ${summary.replaced}`);
  }

  if (summary.kept > 0) {
    parts.push(`kept ${summary.kept} of yours`);
  }

  if (summary.unchanged > 0) {
    parts.push(`${summary.unchanged} already up to date`);
  }

  return `${parts.join(", ")}.`;
}

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingImport | null>(null);

  const handleExport = () => {
    const now = new Date();
    const backup = createBackup(loadJarStorage(), now);

    downloadBlob(
      new Blob([serializeBackup(backup)], { type: "application/json" }),
      getBackupFileName(getLocalDateKey(now)),
    );
    setErrors([]);
    setStatus("Backup downloaded");
  };

  // Re-read storage at apply time so a change made in another tab between
  // choosing the file and confirming is merged instead of overwritten.
  const applyImport = (
    incoming: JarStorage,
    choices: Record<string, ConflictChoice>,
  ) => {
    const { storage, summary } = mergeBackup(
      loadJarStorage(),
      incoming,
      choices,
      createJarId,
    );

    saveJarStorage(storage);
    setStatus(formatSummary(summary));
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    // Reset so choosing the same file again fires another change event.
    input.value = "";

    if (!file) {
      return;
    }

    setStatus("");
    setErrors([]);

    if (file.size > MAX_BACKUP_BYTES) {
      setErrors(["This file is too large to be a Streak Jar backup."]);
      return;
    }

    let text: string;

    try {
      text = await file.text();
    } catch {
      setErrors(["We couldn't read this file."]);
      return;
    }

    const result = parseBackup(text);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    const conflicts = findConflicts(loadJarStorage(), result.storage);

    if (conflicts.length === 0) {
      applyImport(result.storage, {});
      return;
    }

    setPending({ storage: result.storage, conflicts });
  };

  const hiddenErrorCount = errors.length - MAX_SHOWN_ERRORS;

  return (
    <section className="mx-auto w-full max-w-3xl px-5 pb-16 pt-6">
      <h1 className="font-heading text-4xl font-semibold leading-tight text-ink">
        Settings
      </h1>

      <h2 className="mt-8 font-heading text-2xl font-semibold text-ink">
        Your data
      </h2>
      <p className="mt-1 text-sm leading-6 text-soft-ink">
        Your jars are saved only in this browser.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-base font-semibold text-ink">Export jars</h3>
          <p className="mt-1 text-sm leading-6 text-soft-ink">
            Download a backup file you can import on another device.
          </p>
          <Button className="mt-4" onClick={handleExport}>
            Export jars
          </Button>
        </Card>

        <Card className="p-5">
          <h3 className="text-base font-semibold text-ink">Import jars</h3>
          <p className="mt-1 text-sm leading-6 text-soft-ink">
            Add jars from a Streak Jar backup file. Your current jars stay.
          </p>
          <input
            accept="application/json,.json"
            aria-label="Backup file"
            className="sr-only"
            onChange={handleFileChange}
            ref={fileInputRef}
            tabIndex={-1}
            type="file"
          />
          <Button
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
            variant="secondary"
          >
            Choose file
          </Button>
        </Card>
      </div>

      {errors.length > 0 ? (
        <div
          className="mt-4 rounded-lg border border-coral/55 bg-coral/10 px-3.5 py-3 text-sm leading-6 text-ink"
          role="alert"
        >
          <strong>This file can&apos;t be imported.</strong> Nothing was changed.
          <ul className="mt-2 list-disc pl-5">
            {errors.slice(0, MAX_SHOWN_ERRORS).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          {hiddenErrorCount > 0 ? (
            <p className="mt-1">and {hiddenErrorCount} more</p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 min-h-6 text-sm font-medium text-ink" role="status">
        {status}
      </p>

      <Link
        className={buttonClasses({ variant: "secondary", className: "mt-6" })}
        href="/"
      >
        Back to jars
      </Link>

      {pending ? (
        <ImportConflictDialog
          conflicts={pending.conflicts}
          onCancel={() => {
            setPending(null);
            setStatus("Import cancelled. Nothing was changed.");
          }}
          onConfirm={(choices) => {
            applyImport(pending.storage, choices);
            setPending(null);
          }}
        />
      ) : null}
    </section>
  );
}
