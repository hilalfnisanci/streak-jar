import type { ComponentProps } from "react";

import { cn } from "../../../lib/cn";

export function cardClasses(className?: string): string {
  return cn("rounded-lg border border-line bg-white shadow-sm", className);
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cardClasses(className)} {...props} />;
}
