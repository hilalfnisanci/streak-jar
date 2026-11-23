"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  Button,
  buttonClasses,
  cardClasses,
  Field,
  Input,
} from "../../components/ui";
import { Jar as JarVisual } from "../../components/jar";
import { queueReminderToast } from "../../components/reminder-toast";
import { cn } from "../../../lib/cn";
import { jarColorList } from "../../../lib/jar-colors";
import { createJarId } from "../../../lib/jar-id";
import {
  getReminderPermission,
  requestReminderPermission,
  setJarReminder,
  useReminderSettings,
} from "../../../lib/reminders";
import { type Jar, loadJarStorage, saveJars } from "../../../lib/storage";

export default function NewJarPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("30");
  const [color, setColor] = useState(jarColorList[0].key);
  const [nameError, setNameError] = useState("");
  const [targetError, setTargetError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [firstJar, setFirstJar] = useState<Jar | null>(null);
  const [permissionPending, setPermissionPending] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");
  const readyHeading = useRef<HTMLHeadingElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const { time } = useReminderSettings();

  useEffect(() => {
    if (firstJar) readyHeading.current?.focus();
  }, [firstJar]);

  useEffect(() => {
    if (permissionMessage) continueButton.current?.focus();
  }, [permissionMessage]);

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

    let isFirstJar: boolean;
    try {
      const storage = loadJarStorage();
      isFirstJar = storage.jars.length === 0 && storage.completed.length === 0;
      saveJars([...storage.jars, newJar]);
    } catch {
      setSaveError("Could not save your jar on this device. Please try again.");
      return;
    }

    const permission = getReminderPermission();
    if (isFirstJar && permission !== "unsupported" && permission !== "denied") {
      setFirstJar(newJar);
    } else {
      router.push("/");
    }
  };

  const turnOnReminders = async (jar: Jar) => {
    setPermissionPending(true);
    const permission = await requestReminderPermission();
    if (permission === "granted") {
      if (await setJarReminder(jar.id, true)) {
        queueReminderToast(jar.id);
        router.push("/");
        return;
      }
      setPermissionMessage(
        "Could not turn on reminders. Your jar is saved; try again from its page.",
      );
    } else if (permission === "denied") {
      setPermissionMessage(
        "Notifications are blocked for this site. Your jar is saved. Allow notifications in your browser’s site settings to turn reminders on later.",
      );
    } else {
      setPermissionMessage(
        "Reminders stay off. Your jar is saved, and you can turn them on later from its page.",
      );
    }
    setPermissionPending(false);
  };

  const preview = (
    <aside
      className={cardClasses(
        cn(
          "flex min-h-[320px] flex-col items-center justify-center border-2 px-8 py-10 text-center",
          selectedColor.border,
          selectedColor.preview,
        ),
      )}
    >
      <JarVisual color={selectedColor.key} variant="preview" />
      <p className="mt-5 text-sm font-medium text-soft-ink">
        {firstJar ? `0 / ${firstJar.target} marbles` : "Empty jar"}
      </p>
    </aside>
  );

  if (firstJar) {
    return (
      <section
        className="mx-auto grid w-full max-w-5xl gap-8 px-5 pb-16 pt-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !permissionPending) router.push("/");
        }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-soft-ink">
            Jar created
          </p>
          <h1
            className="mt-1.5 font-heading text-4xl font-semibold leading-tight text-ink"
            ref={readyHeading}
            tabIndex={-1}
          >
            {firstJar.name} is ready
          </h1>
          <div className={cardClasses("mt-6 p-5")}>
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-line/50"
              >
                🔔
              </span>
              <div>
                <h2 className="font-heading text-[22px] font-semibold text-ink">
                  Want a nudge at {time}?
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-soft-ink">
                  If today’s marble isn’t in by {time}, we’ll send one browser
                  notification for this jar. Tap it to open the jar.
                </p>
              </div>
            </div>
            <p
              className={permissionMessage ? "mt-4 rounded-lg bg-line/40 p-3 text-sm text-ink" : "sr-only"}
              role="status"
            >
              {permissionMessage}
            </p>
            {!permissionMessage ? (
              <>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    disabled={permissionPending}
                    onClick={() => void turnOnReminders(firstJar)}
                  >
                    Turn on reminders
                  </Button>
                  <Button
                    disabled={permissionPending}
                    onClick={() => router.push("/")}
                    variant="secondary"
                  >
                    Not now
                  </Button>
                </div>
                <p className="mt-3 text-xs leading-5 text-soft-ink">
                  Your browser may ask for permission. Reminders arrive while Streak
                  Jar is open in a tab. Change the time in Settings.
                </p>
              </>
            ) : null}
          </div>
          {permissionMessage ? (
            <Button
              className="mt-5"
              onClick={() => router.push("/")}
              ref={continueButton}
            >
              Go to my jars
            </Button>
          ) : null}
        </div>
        {preview}
      </section>
    );
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-5xl gap-8 px-5 pb-16 pt-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div>
        <h1 className="font-heading text-4xl font-semibold leading-tight text-ink">
          Create a jar
        </h1>
        <form className="mt-8 space-y-7" noValidate onSubmit={handleSubmit}>
          {saveError ? <p role="alert">{saveError}</p> : null}
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

      {preview}
    </section>
  );
}
