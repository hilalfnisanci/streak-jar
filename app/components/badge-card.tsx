import { getBadgeLabel, type BadgeModel } from "../../lib/badge-image";
import { cn } from "../../lib/cn";
import { getJarColor } from "../../lib/jar-colors";

function JarGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11.5 4.5h9M12.75 7.5h6.5v3.25l3.25 3.75v9.25a3.75 3.75 0 0 1-3.75 3.75h-5.5a3.75 3.75 0 0 1-3.75-3.75V14.5l3.25-3.75V7.5Z"
        className="fill-glass stroke-ink"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle className="fill-coral" cx="13" cy="22" r="2" />
      <circle className="fill-mint" cx="18.5" cy="21" r="2" />
      <circle className="fill-butter" cx="16" cy="17" r="2" />
    </svg>
  );
}

// DOM preview of the badge. Layout mirrors renderBadgePng at 1/3.6 scale.
export function BadgeCard({ model }: { model: BadgeModel }) {
  const colorStyles = getJarColor(model.color);

  return (
    <div
      aria-label={getBadgeLabel(model)}
      className="relative mx-auto mt-3 flex aspect-[4/5] w-full max-w-[300px] flex-col items-center justify-between overflow-hidden rounded-[var(--radius-panel)] border border-line px-[18px] pb-4 pt-[22px] text-center shadow-md"
      role="img"
      style={{
        background: `color-mix(in srgb, var(--${model.color}) 14%, var(--cream))`,
      }}
    >
      <span aria-hidden="true" className="celebration-pattern absolute inset-0" />
      <span className="relative inline-flex items-center rounded-full bg-ink px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-cream">
        {model.ribbon}
      </span>
      <div
        className="relative grid h-[132px] w-[132px] place-items-center rounded-full shadow-[inset_0_0_0_6px_rgb(255_255_255/0.7),0_10px_22px_rgb(49_38_31/0.16)]"
        style={{
          background: `color-mix(in srgb, var(--${model.color}) 35%, white)`,
        }}
      >
        <div aria-hidden="true" className="absolute inset-0">
          {Array.from({ length: model.slots }, (_, index) => {
            const angle = (index / model.slots) * Math.PI * 2 - Math.PI / 2;

            return (
              <span
                className={cn(
                  "jar__marble -ml-2 -mt-2 h-4 w-4",
                  index < model.count ? colorStyles.solid : "bg-line",
                )}
                key={index}
                style={{
                  // Inline so the unlayered `.jar__marble { position: relative }` rule can't override Tailwind's `absolute`.
                  position: "absolute",
                  left: `${50 + 46 * Math.cos(angle)}%`,
                  top: `${50 + 46 * Math.sin(angle)}%`,
                }}
              />
            );
          })}
        </div>
        <div>
          <div className="font-heading text-[44px] font-semibold leading-none text-ink">
            {model.count}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-soft-ink">
            {model.caption}
          </div>
        </div>
      </div>
      <div className="relative w-full">
        <div className="mx-auto max-w-[260px] truncate font-heading text-[26px] font-semibold leading-tight text-ink">
          {model.name}
        </div>
        <div className="mt-1 text-[13px] text-soft-ink">{model.sub}</div>
      </div>
      <div className="relative flex items-center gap-1.5 font-heading text-sm font-semibold text-ink">
        <JarGlyph />
        Streak Jar
      </div>
    </div>
  );
}
