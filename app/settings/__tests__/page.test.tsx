import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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

  it("downloads the stored jars as a dated backup file", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Export jars" }));

    const blob = createObjectURL.mock.calls[0][0];
    const link = click.mock.contexts[0] as HTMLAnchorElement;

    expect(link.download).toMatch(/^streak-jar-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(await readBlob(blob))).toMatchObject({
      app: "streak-jar",
      version: 1,
      data: local,
    });
    expect(screen.getByRole("status")).toHaveTextContent("Backup downloaded");
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
    expect(screen.getByRole("status")).toHaveTextContent(
      "Imported 1 jar, replaced 1, kept 1 of yours.",
    );
  });

  it("changes nothing when the conflict dialog is cancelled", async () => {
    render(<SettingsPage />);
    chooseBackup(backupOf({ jars: [makeJar({ name: "Changed" })], completed: [] }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(readStorage()).toEqual(local);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Import cancelled. Nothing was changed.",
    );
  });
});
