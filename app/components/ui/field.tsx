import { cloneElement, type ReactElement, type ReactNode } from "react";

type FieldChildProps = {
  "aria-describedby"?: string;
};

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactElement<FieldChildProps>;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label className="block text-sm font-semibold text-ink" htmlFor={htmlFor}>
        {label}
      </label>
      {hint ? (
        <p className="mt-1 text-sm text-soft-ink" id={hintId}>
          {hint}
        </p>
      ) : null}
      <div className="mt-2">
        {cloneElement(children, { "aria-describedby": describedBy })}
      </div>
      {error ? (
        <p
          aria-live="polite"
          className="mt-2 text-sm font-medium text-coral"
          id={errorId}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
