import type { ComponentProps } from "react";

import { cn } from "../../../lib/cn";

export type BadgeTone = "success" | "streak" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  success: "border-mint/70 bg-mint/20 text-ink",
  streak: "border-butter/70 bg-butter/20 text-ink",
  neutral: "border-line bg-cream text-ink",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
