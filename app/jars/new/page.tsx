"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

import {
  Button,
  buttonClasses,
  cardClasses,
  Field,
  Input,
} from "../../components/ui";
import { cn } from "../../../lib/cn";
import { type JarColorStyle, jarColorList } from "../../../lib/jar-colors";
import { type Jar, loadJars, saveJars } from "../../../lib/storage";

function createJarId() {
  return globalThis.crypto?.randomUUID?.() ?? `jar-${Date.now()}`;
}

function JarPreview({ color }: { color: JarColorStyle }) {
  return (
    <aside
      className={cardClasses(
        cn(
          "flex min-h-[320px] flex-col items-center justify-center border-2 px-8 py-10 text-center",
          color.border,
          color.preview,
        ),
      )}
      aria-label={`${color.label} jar preview`}
    >
      <div className="relative h-52 w-40">
        <div className="absolute left-1/2 top-0 h-7 w-20 -translate-x-1/2 rounded-t-md border-2 border-ink/75 bg-glass" />
        <div className="absolute left-1/2 top-6 h-6 w-24 -translate-x-1/2 rounded-md border-2 border-ink/75 bg-glass" />
        <div
          className={`absolute bottom-0 left-1/2 h-40 w-32 -translate-x-1/2 rounded-b-[2rem] rounded-t-xl border-2 border-ink/75 ${color.jarFill} shadow-inner`}
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
  const [color, setColor] = useState(jarColorList[0].key);
  const [nameError, setNameError] = useState("");
  const [targetError, setTargetError] = useState("");

  const selectedColor = useMemo(
    () =>
      jarColorList.find((marbleColor) => marbleColor.key === color) ??
      jarColorList[0],
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
          <Field error={nameError} htmlFor="jar-name" label="Name">
            <Input
              aria-describedby={nameError ? "jar-name-error" : undefined}
              aria-invalid={nameError ? "true" : "false"}
              className="w-full"
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
          </Field>

          <Field error={targetError} htmlFor="jar-target" label="Target">
            <Input
              aria-describedby={targetError ? "jar-target-error" : undefined}
              aria-invalid={targetError ? "true" : "false"}
              className="w-36"
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
          </Field>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Color</legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {jarColorList.map((marbleColor) => (
                <label
                  className="group cursor-pointer rounded-full"
                  key={marbleColor.key}
                  title={marbleColor.label}
                >
                  <input
                    checked={color === marbleColor.key}
                    className="peer sr-only"
                    name="color"
                    onChange={() => setColor(marbleColor.key)}
                    type="radio"
                    value={marbleColor.key}
                  />
                  <span
                    className={`block h-11 w-11 rounded-full border border-white/80 shadow-sm ring-offset-2 ring-offset-cream transition peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink ${marbleColor.solid}`}
                    aria-hidden="true"
                  />
                  <span className="sr-only">{marbleColor.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="submit"
            >
              Create jar
            </Button>
            <Link
              className={buttonClasses({ variant: "secondary" })}
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
