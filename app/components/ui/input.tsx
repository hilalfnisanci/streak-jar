import type { ComponentProps } from "react";

import { cn } from "../../../lib/cn";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-line bg-white px-4 py-3 text-base text-ink",
        "shadow-sm outline-none transition focus:border-ink focus:ring-2 focus:ring-mint/40",
        className,
      )}
      {...props}
    />
  );
}
