import { cn } from "../../lib/cn";
import { getJarColor } from "../../lib/jar-colors";
import { type MarbleEntry } from "../../lib/storage";

type FilledJarProps = {
  color: string;
  marbles: MarbleEntry[];
  name: string;
  target: number;
  variant: "mini" | "large";
};

type PreviewJarProps = {
  color: string;
  variant: "preview";
};

type JarProps = (FilledJarProps | PreviewJarProps) & {
  className?: string;
};

export function getJarFillPercent(marbleCount: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((marbleCount / target) * 100));
}

function getMarbleKey(marble: MarbleEntry, index: number) {
  if (typeof marble === "string") {
    return `${marble}-${index}`;
  }

  return `${marble.date}-${marble.at}`;
}

export function Jar(props: JarProps) {
  const color = getJarColor(props.color);
  const isPreview = props.variant === "preview";
  const marbles = isPreview ? [] : props.marbles;
  const fillPercent = isPreview
    ? 0
    : getJarFillPercent(marbles.length, props.target);
  const visibleMarbles = isPreview
    ? []
    : props.variant === "mini"
      ? marbles.slice(0, 12)
      : marbles.slice(-24);
  const ariaLabel = isPreview
    ? `${color.label} jar preview`
    : `${props.name} jar is ${fillPercent}% full`;

  return (
    <div
      aria-label={ariaLabel}
      className={cn("jar", `jar--${props.variant}`, props.className)}
      role="img"
    >
      <div aria-hidden="true" className="jar__neck" />
      <div aria-hidden="true" className="jar__rim" />
      <div aria-hidden="true" className="jar__body">
        {isPreview ? (
          <span className={cn("jar__preview-tint", color.jarFill)} />
        ) : (
          <span
            className={cn("jar__fill", color.fill)}
            style={{ height: `${fillPercent}%` }}
          />
        )}
        <span className="jar__base" />
        {visibleMarbles.length > 0 ? (
          <span className="jar__marbles">
            {visibleMarbles.map((marble, index) => (
              <span
                className={cn(
                  "jar__marble",
                  props.variant === "large" && "jar__marble--drop",
                  color.solid,
                )}
                key={getMarbleKey(marble, index)}
              />
            ))}
          </span>
        ) : null}
        <span className="jar__reflection" />
      </div>
    </div>
  );
}
