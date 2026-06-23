import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-ink" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p className="mt-2 text-sm font-medium text-coral" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
