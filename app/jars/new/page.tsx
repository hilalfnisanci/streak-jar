"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

import { type Jar, loadJars, saveJars } from "../../../lib/storage";

type MarbleColor = {
  name: string;
  value: string;
  swatchClass: string;
  jarFillClass: string;
  borderClass: string;
  previewClass: string;
};

const marbleColors: MarbleColor[] = [
  {
    name: "Coral",
    value: "coral",
    swatchClass: "bg-coral",
    jarFillClass: "bg-coral/30",
    borderClass: "border-coral/70",
    previewClass: "bg-coral/20",
  },
  {
    name: "Mint",
    value: "mint",
    swatchClass: "bg-mint",
    jarFillClass: "bg-mint/30",
    borderClass: "border-mint/70",
    previewClass: "bg-mint/20",
  },
  {
    name: "Lavender",
    value: "lavender",
    swatchClass: "bg-lavender",
    jarFillClass: "bg-lavender/30",
    borderClass: "border-lavender/70",
    previewClass: "bg-lavender/20",
  },
  {
    name: "Butter",
    value: "butter",
    swatchClass: "bg-butter",
    jarFillClass: "bg-butter/30",
    borderClass: "border-butter/70",
    previewClass: "bg-butter/20",
  },
  {
    name: "Sky",
    value: "sky",
    swatchClass: "bg-sky",
    jarFillClass: "bg-sky/30",
    borderClass: "border-sky/70",
    previewClass: "bg-sky/20",
  },
  {
    name: "Peach",
    value: "peach",
    swatchClass: "bg-peach",
    jarFillClass: "bg-peach/30",
    borderClass: "border-peach/70",
    previewClass: "bg-peach/20",
  },
  {
    name: "Lilac",
    value: "lilac",
    swatchClass: "bg-lilac",
    jarFillClass: "bg-lilac/30",
    borderClass: "border-lilac/70",
    previewClass: "bg-lilac/20",
  },
  {
    name: "Sage",
    value: "sage",
    swatchClass: "bg-sage",
    jarFillClass: "bg-sage/30",
    borderClass: "border-sage/70",
    previewClass: "bg-sage/20",
  },
];

function createJarId() {
  return globalThis.crypto?.randomUUID?.() ?? `jar-${Date.now()}`;
}

function JarPreview({ color }: { color: MarbleColor }) {
  return (
    <aside
      className={`flex min-h-[320px] flex-col items-center justify-center rounded-lg border-2 ${color.borderClass} ${color.previewClass} px-8 py-10 text-center shadow-sm`}
      aria-label={`${color.name} jar preview`}
    >
      <div className="relative h-52 w-40">
        <div className="absolute left-1/2 top-0 h-7 w-20 -translate-x-1/2 rounded-t-md border-2 border-ink/75 bg-glass" />
        <div className="absolute left-1/2 top-6 h-6 w-24 -translate-x-1/2 rounded-md border-2 border-ink/75 bg-glass" />
        <div
          className={`absolute bottom-0 left-1/2 h-40 w-32 -translate-x-1/2 rounded-b-[2rem] rounded-t-xl border-2 border-ink/75 ${color.jarFillClass} shadow-inner`}
        />
      </div>
      <p className="mt-5 text-sm font-medium text-soft-ink">Empty jar</p>
    </aside>
  );
}

export default function NewJarPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("30");
  const [color, setColor] = useState(marbleColors[0].value);
  const [nameError, setNameError] = useState("");
  const [targetError, setTargetError] = useState("");

  const selectedColor = useMemo(
    () =>
      marbleColors.find((marbleColor) => marbleColor.value === color) ??
      marbleColors[0],
    [color],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError("Please name your jar");
      return;
    }

    const targetValue = Number(target);

    if (
      !Number.isInteger(targetValue) ||
      targetValue < 5 ||
      targetValue > 365
    ) {
      setTargetError("Target must be between 5 and 365");
      return;
    }

    const newJar: Jar = {
      id: createJarId(),
      name: trimmedName,
      target: targetValue,
      color,
      marbles: [],
      createdAt: new Date().toISOString(),
    };

    saveJars([...loadJars(), newJar]);
    router.push("/");
  };

  return (
    <section className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-5xl gap-8 px-5 pb-16 pt-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div>
        <h1 className="font-heading text-4xl font-semibold leading-tight text-ink">
          Create a jar
        </h1>
        <form className="mt-8 space-y-7" noValidate onSubmit={handleSubmit}>
          <div>
            <label
              className="block text-sm font-semibold text-ink"
              htmlFor="jar-name"
            >
              Name
            </label>
            <input
              aria-describedby={nameError ? "jar-name-error" : undefined}
              aria-invalid={nameError ? "true" : "false"}
              className="mt-2 w-full rounded-lg border border-line bg-white px-4 py-3 text-base text-ink shadow-sm outline-none transition focus:border-ink focus:ring-2 focus:ring-mint/40"
              id="jar-name"
              maxLength={60}
              onChange={(event) => {
                setName(event.target.value);
                if (nameError) {
                  setNameError("");
                }
              }}
              placeholder="Daily reading"
              required
              type="text"
              value={name}
            />
            {nameError ? (
              <p
                className="mt-2 text-sm font-medium text-coral"
                id="jar-name-error"
              >
                {nameError}
              </p>
            ) : null}
          </div>

          <div>
            <label
              className="block text-sm font-semibold text-ink"
              htmlFor="jar-target"
            >
              Target
            </label>
            <input
              aria-describedby={targetError ? "jar-target-error" : undefined}
              aria-invalid={targetError ? "true" : "false"}
              className="mt-2 w-36 rounded-lg border border-line bg-white px-4 py-3 text-base text-ink shadow-sm outline-none transition focus:border-ink focus:ring-2 focus:ring-mint/40"
              id="jar-target"
              max={365}
              min={5}
              onChange={(event) => {
                setTarget(event.target.value);
                if (targetError) {
                  setTargetError("");
                }
              }}
              type="number"
              value={target}
            />
            {targetError ? (
              <p
                className="mt-2 text-sm font-medium text-coral"
                id="jar-target-error"
              >
                {targetError}
              </p>
            ) : null}
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Color</legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {marbleColors.map((marbleColor) => (
                <label
                  className="group cursor-pointer rounded-full"
                  key={marbleColor.value}
                  title={marbleColor.name}
                >
                  <input
                    checked={color === marbleColor.value}
                    className="peer sr-only"
                    name="color"
                    onChange={() => setColor(marbleColor.value)}
                    type="radio"
                    value={marbleColor.value}
                  />
                  <span
                    className={`block h-11 w-11 rounded-full border border-white/80 shadow-sm ring-offset-2 ring-offset-cream transition peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink ${marbleColor.swatchClass}`}
                    aria-hidden="true"
                  />
                  <span className="sr-only">{marbleColor.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-soft-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream"
              type="submit"
            >
              Create jar
            </button>
            <Link
              className="rounded-lg border border-line bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-soft-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream"
              href="/"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <JarPreview color={selectedColor} />
    </section>
  );
}
