import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { REMINDERS_STORAGE_KEY } from "../../../lib/reminders";
import { type Jar, JARS_STORAGE_KEY, type JarStorage } from "../../../lib/storage";
import SettingsPage from "../page";

function makeJar(overrides: Partial<Jar> = {}): Jar {
  return {
    id: "jar-a",
    name: "Reading",
    target: 30,
    color: "mint",
    marbles: ["2026-11-02"],
    createdAt: "2026-11-01T08:00:00.000Z",
    ...overrides,
  };
}

function seed(storage: JarStorage) {
  localStorage.setItem(JARS_STORAGE_KEY, JSON.stringify(storage));
}

function readStorage(): JarStorage {
  return JSON.parse(localStorage.getItem(JARS_STORAGE_KEY) ?? "null");
}

// jsdom's Blob implements neither text() nor arrayBuffer(); browsers do.
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function chooseBackup(content: string) {
  const file = new File([content], "backup.json", { type: "application/json" });
  file.text = () => readBlob(file);

  fireEvent.change(screen.getByLabelText("Backup file"), {
    target: { files: [file] },
  });
}

function backupOf(data: JarStorage) {
  return JSON.stringify({
    app: "streak-jar",
    version: 1,
    exportedAt: "2026-11-13T09:30:00.000Z",
    data,
  });
}

const local: JarStorage = {
  jars: [makeJar(), makeJar({ id: "jar-b", name: "Walking" })],
  completed: [],
};

const reminderPreferences = {
  time: "19:15",
  enabledJarIds: ["jar-a"],
  lastClaimByJar: { "jar-a": "2026-11-03" },
};

describe("SettingsPage", () => {
  const createObjectURL = vi.fn((_blob: Blob) => "blob:backup");

  beforeEach(() => {
    localStorage.clear();
    createObjectURL.mockClear();
    // jsdom has no object URLs; downloadBlob needs both.
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    seed(local);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("downloads the stored jars as a dated backup file", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminderPreferences));

    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Export jars" }));

    const blob = createObjectURL.mock.calls[0][0];
    const link = click.mock.contexts[0] as HTMLAnchorElement;

    expect(link.download).toMatch(/^streak-jar-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(await readBlob(blob))).toEqual({
      app: "streak-jar",
      version: 1,
      exportedAt: expect.any(String),
      data: local,
    });
    expect(screen.getByRole("status", { name: "Data actions" })).toHaveTextContent(
      "Backup downloaded",
    );
    click.mockRestore();
  });

  it("downloads the streak history as a dated CSV without changing storage", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Export history (CSV)" }));

    const blob = createObjectURL.mock.calls[0][0];
    const link = click.mock.contexts[0] as HTMLAnchorElement;

    expect(link.download).toMatch(/^streak-jar-history-\d{4}-\d{2}-\d{2}\.csv$/);
    expect((await readBlob(blob)).split("\r\n")).toEqual([
      "jar_name,jar_status,date,time,streak_day,jar_id",
      "Reading,active,2026-11-02,,1,jar-a",
      "Walking,active,2026-11-02,,1,jar-b",
      "",
    ]);
    expect(screen.getByRole("status", { name: "Data actions" })).toHaveTextContent(
      "History downloaded",
    );
    expect(readStorage()).toEqual(local);
    click.mockRestore();
  });

  it("lists validation errors and leaves storage untouched", async () => {
    render(<SettingsPage />);
    chooseBackup(backupOf({ jars: [makeJar({ id: "jar-c", target: 3 })], completed: [] }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "data.jars[0].target: must be a whole number from 5 to 365",
    );
    expect(readStorage()).toEqual(local);
  });

  it("merges the chosen versions into the latest storage", async () => {
    render(<SettingsPage />);
    chooseBackup(
      backupOf({
        jars: [
          makeJar({ marbles: ["2026-11-02", "2026-11-03"] }),
          makeJar({ id: "jar-b", name: "Evening walk" }),
          makeJar({ id: "jar-new", name: "Stretching" }),
        ],
        completed: [],
      }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Some jars are already on this device",
    });

    // Another tab adds a jar after the file was chosen.
    const otherTabJar = makeJar({ id: "jar-other", name: "Water" });
    seed({ ...local, jars: [...local.jars, otherTabJar] });
    // Another tab just set a reminder on the jar about to be replaced.
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminderPreferences));

    const readingChoices = within(
      within(dialog).getByRole("group", { name: "Reading" }),
    );
    fireEvent.click(readingChoices.getByLabelText("Use backup"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Import" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(readStorage().jars.map((jar) => [jar.id, jar.name, jar.marbles.length])).toEqual([
      ["jar-a", "Reading", 2],
      ["jar-b", "Walking", 1],
      ["jar-other", "Water", 1],
      ["jar-new", "Stretching", 1],
    ]);
    expect(screen.getByRole("status", { name: "Data actions" })).toHaveTextContent(
      "Imported 1 jar, replaced 1, kept 1 of yours.",
    );
    expect(JSON.parse(localStorage.getItem(REMINDERS_STORAGE_KEY) ?? "null")).toEqual(
      reminderPreferences,
    );
  });

  it("changes nothing when the conflict dialog is cancelled", async () => {
    render(<SettingsPage />);
    chooseBackup(backupOf({ jars: [makeJar({ name: "Changed" })], completed: [] }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(readStorage()).toEqual(local);
    expect(screen.getByRole("status", { name: "Data actions" })).toHaveTextContent(
      "Import cancelled. Nothing was changed.",
    );
  });

  it("keeps the scheduled time when the field is cleared and persists a correction", async () => {
    vi.stubGlobal("Notification", class {
      static permission = "granted";
      static requestPermission = vi.fn();
    });
    vi.stubGlobal("navigator", Object.create(window.navigator, {
      locks: {
        value: { request: (_name: string, work: () => unknown) => Promise.resolve().then(work) },
      },
      serviceWorker: { value: { register: vi.fn() } },
    }));

    const view = render(<SettingsPage />);
    const region = within(screen.getByRole("region", { name: "Reminders" }));
    const input = region.getByLabelText("Reminder time");
    expect(input).toHaveValue("20:00");

    fireEvent.change(input, { target: { value: "" } });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/Enter a time like 20:00/);
    expect(localStorage.getItem(REMINDERS_STORAGE_KEY)).toBeNull();

    // A preference written in another tab must survive saving the new time.
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminderPreferences));
    fireEvent.change(input, { target: { value: "18:45" } });
    await waitFor(() => expect(region.getByRole("status")).toHaveTextContent(
      "Reminder time saved · 18:45",
    ));
    expect(input).toBeValid();
    expect(JSON.parse(localStorage.getItem(REMINDERS_STORAGE_KEY) ?? "null")).toEqual({
      ...reminderPreferences,
      time: "18:45",
    });

    view.unmount();
    render(<SettingsPage />);
    expect(screen.getByLabelText("Reminder time")).toHaveValue("18:45");
  });
});
