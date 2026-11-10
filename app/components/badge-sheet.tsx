"use client";

import { useEffect, useRef, useState } from "react";

import { BadgeCard } from "./badge-card";
import { Button } from "./ui";
import { cn } from "../../lib/cn";
import {
  canShareFiles,
  downloadBlob,
  getBadgeFileName,
  getBadgeModel,
  getShareText,
  renderBadgePng,
  shareBadge,
} from "../../lib/badge-image";
import { type JarWeek, type Week } from "../../lib/week";

type ImageAction = "save" | "share";

type ImageStatus =
  | { state: "idle" }
  | { state: "working"; action: ImageAction }
  | { state: "error"; action: ImageAction };

type BadgeSheetProps = {
  jarWeek: JarWeek;
  week: Week;
  onClose: () => void;
  onSaved: () => void;
};

export function BadgeSheet({ jarWeek, week, onClose, onSaved }: BadgeSheetProps) {
  // Not persisted: the sheet is unmounted on close, so the name shows again on
  // every open.
  const [showName, setShowName] = useState(true);
  const [canShare, setCanShare] = useState(false);
  const [status, setStatus] = useState<ImageStatus>({ state: "idle" });
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(true);
  // Reusing the last PNG lets a retry call navigator.share() straight from the
  // click, before Safari's user activation can expire during rendering.
  const pngCacheRef = useRef<{ showName: boolean; blob: Blob } | null>(null);
  const model = getBadgeModel(jarWeek, week, showName);
  const working = status.state === "working";

  useEffect(() => {
    mountedRef.current = true;
    setCanShare(canShareFiles());
    closeButtonRef.current?.focus();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLButtonElement>(
          "button:not([disabled])",
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
  }, [onClose]);

  async function getPng() {
    const cached = pngCacheRef.current;

    if (cached && cached.showName === showName) {
      return cached.blob;
    }

    const blob = await renderBadgePng(model);
    pngCacheRef.current = { showName, blob };

    return blob;
  }

  async function runImageAction(action: ImageAction) {
    const fileName = getBadgeFileName(jarWeek.jar.name, showName, week);

    setStatus({ state: "working", action });

    try {
      const blob = await getPng();

      // The sheet can be closed (Esc or scrim) while the image renders; a
      // download or share sheet appearing after that would be a surprise.
      if (!mountedRef.current) {
        return;
      }

      if (action === "save") {
        downloadBlob(blob, fileName);
        onSaved();
      } else {
        // A dismissed share sheet is not an error and shows no toast.
        await shareBadge(blob, fileName, getShareText(jarWeek.jar.name, showName));
      }

      if (mountedRef.current) {
        setStatus({ state: "idle" });
      }
    } catch {
      if (mountedRef.current) {
        setStatus({ state: "error", action });
      }
    }
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="badge-sheet-scrim fixed inset-0 z-40 bg-ink/40"
        data-testid="badge-sheet-scrim"
        onClick={onClose}
      />
      <div
        aria-labelledby="badge-sheet-title"
        aria-modal="true"
        className="badge-sheet fixed inset-x-0 bottom-0 z-50 max-h-[96dvh] overflow-y-auto rounded-t-[20px] bg-cream px-5 pb-6 pt-2.5 shadow-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(480px,calc(100%-40px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-panel)] sm:pt-5"
        ref={panelRef}
        role="dialog"
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden"
        />
        <div className="flex items-center justify-between">
          <h2
            className="font-heading text-[22px] font-semibold text-ink"
            id="badge-sheet-title"
          >
            Your badge
          </h2>
          <button
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-ink transition hover:bg-line/50 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            ✕
          </button>
        </div>

        <BadgeCard model={model} />

        <div className="mt-4 flex min-h-14 items-center justify-between gap-3 rounded-lg border border-line bg-white py-1.5 pl-3.5 pr-2 shadow-sm">
          <span className="text-sm font-semibold text-ink" id="badge-name-label">
            Show jar name on badge
          </span>
          <button
            aria-checked={showName}
            aria-labelledby="badge-name-label"
            className="group relative h-11 w-[52px] flex-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:cursor-not-allowed"
            disabled={working}
            onClick={() => setShowName((value) => !value)}
            role="switch"
            type="button"
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-1 top-[9px] h-[26px] w-11 rounded-full transition",
                showName ? "bg-ink" : "bg-line",
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-[7px] top-3 h-5 w-5 rounded-full bg-white shadow-sm transition",
                showName && "translate-x-[18px]",
              )}
            />
          </button>
        </div>

        {status.state === "error" ? (
          <div
            className="mt-3 rounded-lg border border-coral/55 bg-coral/10 px-3.5 py-3 text-sm leading-6 text-ink"
            role="alert"
          >
            <strong>We couldn&apos;t create the image.</strong> Your marbles are
            safe — this only affects the badge picture.
            <div className="mt-2">
              <Button
                className="min-h-11"
                onClick={() => runImageAction(status.action)}
                size="sm"
                variant="secondary"
              >
                Try again
              </Button>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "mt-4 grid gap-2.5",
            canShare ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          <Button
            className="min-h-11"
            disabled={working}
            onClick={() => runImageAction("save")}
            variant={canShare ? "secondary" : "primary"}
          >
            {status.state === "working" && status.action === "save" ? (
              "Creating image…"
            ) : (
              <>
                <span aria-hidden="true">↓&nbsp;</span>
                Save image
              </>
            )}
          </Button>
          {canShare ? (
            <Button
              className="min-h-11"
              disabled={working}
              onClick={() => runImageAction("share")}
            >
              {status.state === "working" && status.action === "share"
                ? "Creating image…"
                : "Share"}
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}
