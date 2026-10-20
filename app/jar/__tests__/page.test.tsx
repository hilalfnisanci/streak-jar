import { act, fireEvent, render, screen, within } from "@testing-library/react";

import {
  type Jar,
  type JarStorage,
  JARS_STORAGE_KEY,
} from "../../../lib/storage";
import * as streak from "../../../lib/streak";
import JarDetailPage from "../page";

function seedStorage(jars: Jar[], completed: Jar[] = []) {
  localStorage.setItem(
    JARS_STORAGE_KEY,
    JSON.stringify({
      jars,
      completed,
    }),
  );
}

function seedLegacyJars(jars: Jar[]) {
  localStorage.setItem(JARS_STORAGE_KEY, JSON.stringify(jars));
}

function getStoredStorage() {
  return JSON.parse(
    localStorage.getItem(JARS_STORAGE_KEY) ?? '{"jars":[],"completed":[]}',
  ) as JarStorage;
}

function advanceToCelebration() {
  act(() => {
    vi.advanceTimersByTime(650);
  });
}

function setJarQuery(id: string) {
  window.history.replaceState({}, "", `/jar?id=${id}`);
}

describe("JarDetailPage", () => {
  beforeEach(() => {
    localStorage.clear();
    setJarQuery("jar-1");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("adds today's marble to localStorage and updates the page", () => {
    seedStorage([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 5,
        color: "mint",
        marbles: [
          { date: "2026-06-07", at: "2026-06-07T12:00:00.000Z" },
          { date: "2026-06-08", at: "2026-06-08T12:00:00.000Z" },
        ],
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    ]);

    render(<JarDetailPage />);

    expect(screen.getByText("2 / 5 marbles")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Add today's marble" }),
    );

    expect(
      screen.getByRole("button", { name: "Done for today ✓" }),
    ).toBeDisabled();
    expect(screen.getByText("3 / 5 marbles")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Daily reading jar is 60% full" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Keep going")).not.toBeInTheDocument();
    expect(getStoredStorage()).toEqual({
      jars: [
        {
          id: "jar-1",
          name: "Daily reading",
          target: 5,
          color: "mint",
          marbles: [
            { date: "2026-06-07", at: "2026-06-07T12:00:00.000Z" },
            { date: "2026-06-08", at: "2026-06-08T12:00:00.000Z" },
            { date: "2026-06-09", at: "2026-06-09T12:00:00.000Z" },
          ],
          createdAt: "2026-06-01T12:00:00.000Z",
        },
      ],
      completed: [],
    });
  });

  it("disables the add button when today's marble already exists", () => {
    seedStorage([
      {
        id: "jar-1",
        name: "Morning walk",
        target: 10,
        color: "coral",
        marbles: [
          { date: "2026-06-07", at: "2026-06-07T12:00:00.000Z" },
          { date: "2026-06-08", at: "2026-06-08T12:00:00.000Z" },
          { date: "2026-06-09", at: "2026-06-09T12:00:00.000Z" },
        ],
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    ]);

    render(<JarDetailPage />);

    const button = screen.getByRole("button", {
      name: "Done for today ✓",
    });

    expect(button).toBeDisabled();
    expect(screen.getByText("3 days in a row 🔥")).toBeInTheDocument();
    expect(screen.queryByText("Keep going")).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(getStoredStorage().jars[0].marbles).toHaveLength(3);
  });

  it.each([
    [1, 9, 0],
    [23, 23, 30],
  ])(
    "stores one marble per local day starting at %s:00",
    (hour, laterHour, laterMinute) => {
      const addedAt = new Date(2026, 5, 9, hour);
      vi.setSystemTime(addedAt);
      seedStorage([
        {
          id: "jar-1",
          name: "Daily reading",
          target: 5,
          color: "mint",
          marbles: [],
          createdAt: "2026-06-01T12:00:00.000Z",
        },
      ]);

      const view = render(<JarDetailPage />);
      expect(
        screen.getByRole("img", { name: "2026-06-09: not added yet" }),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Add today's marble" }));

      expect(getStoredStorage().jars[0].marbles).toEqual([
        { date: "2026-06-09", at: addedAt.toISOString() },
      ]);
      expect(
        screen.getByRole("img", { name: "2026-06-09: marble added" }),
      ).toBeInTheDocument();

      view.unmount();
      vi.setSystemTime(new Date(2026, 5, 9, laterHour, laterMinute));
      const laterView = render(<JarDetailPage />);
      const doneButton = screen.getByRole("button", { name: "Done for today ✓" });
      expect(doneButton).toBeDisabled();
      fireEvent.click(doneButton);
      expect(getStoredStorage().jars[0].marbles).toHaveLength(1);

      laterView.unmount();
      vi.setSystemTime(new Date(2026, 5, 10, 0, 1));
      render(<JarDetailPage />);
      fireEvent.click(screen.getByRole("button", { name: "Add today's marble" }));
      expect(getStoredStorage().jars[0].marbles).toEqual([
        { date: "2026-06-09", at: addedAt.toISOString() },
        { date: "2026-06-10", at: new Date().toISOString() },
      ]);
    },
  );

  it("adds at local 01:00 even if yesterday is done and displays the local streak", () => {
    vi.setSystemTime(new Date(2026, 5, 9, 1));
    seedStorage([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 5,
        color: "mint",
        marbles: [
          "2026-06-07",
          { date: "2026-06-08", at: "2026-06-08T12:00:00.000Z" },
        ],
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    ]);
    render(<JarDetailPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add today's marble" }));

    expect(screen.getByText("3 days in a row 🔥")).toBeInTheDocument();
    expect(getStoredStorage().jars[0].marbles).toHaveLength(3);
  });

  it("uses the local day at click time when the page was opened before midnight", () => {
    vi.setSystemTime(new Date(2026, 5, 9, 23, 59));
    seedStorage([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 5,
        color: "mint",
        marbles: ["2026-06-08"],
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    ]);
    render(<JarDetailPage />);

    vi.setSystemTime(new Date(2026, 5, 10, 0, 1));
    fireEvent.click(screen.getByRole("button", { name: "Add today's marble" }));

    expect(getStoredStorage().jars[0].marbles).toEqual([
      "2026-06-08",
      { date: "2026-06-10", at: new Date().toISOString() },
    ]);
    expect(
      screen.getByRole("button", { name: "Done for today ✓" }),
    ).toBeDisabled();
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["non-integer", 3.5],
  ])(
    "hides the streak badge when the computed streak is %s",
    (_, streakCount) => {
      vi.spyOn(streak, "computeStreak").mockReturnValue(streakCount);
      seedStorage([
        {
          id: "jar-1",
          name: "Morning walk",
          target: 10,
          color: "coral",
          marbles: [
            { date: "2026-06-07", at: "2026-06-07T12:00:00.000Z" },
            { date: "2026-06-08", at: "2026-06-08T12:00:00.000Z" },
            { date: "2026-06-09", at: "2026-06-09T12:00:00.000Z" },
          ],
          createdAt: "2026-06-01T12:00:00.000Z",
        },
      ]);

      render(<JarDetailPage />);

      expect(
        screen.queryByText(`${streakCount} days in a row 🔥`),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/days in a row/)).not.toBeInTheDocument();
    },
  );

  it("renders the last 14 days with filled, missed, and today-pending states", () => {
    seedStorage([
      {
        id: "jar-1",
        name: "Water plants",
        target: 14,
        color: "sage",
        marbles: [
          { date: "2026-05-27", at: "2026-05-27T12:00:00.000Z" },
          { date: "2026-06-02", at: "2026-06-02T12:00:00.000Z" },
          { date: "2026-06-08", at: "2026-06-08T12:00:00.000Z" },
        ],
        createdAt: "2026-05-01T12:00:00.000Z",
      },
    ]);

    render(<JarDetailPage />);

    expect(
      screen.getByRole("heading", { name: "Last 14 days" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("•")).toHaveLength(3);
    expect(screen.getAllByText("○")).toHaveLength(10);
    expect(screen.getByText("?")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "2026-05-27: marble added" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "2026-06-01: missed" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "2026-06-09: not added yet" }),
    ).toBeInTheDocument();
  });

  it("renders a 404 state when the jar id is not stored", () => {
    setJarQuery("missing-jar");
    seedStorage([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 5,
        color: "mint",
        marbles: [],
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    ]);

    render(<JarDetailPage />);

    expect(
      screen.getByRole("heading", { name: "Jar not found" }),
    ).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to jars" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("opens the celebration when the exact target-crossing marble lands", () => {
    seedStorage([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 3,
        color: "mint",
        marbles: [
          { date: "2026-06-07", at: "2026-06-07T12:00:00.000Z" },
          { date: "2026-06-08", at: "2026-06-08T12:00:00.000Z" },
        ],
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    ]);

    render(<JarDetailPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Add today's marble" }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    advanceToCelebration();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "You finished your Daily reading jar! 🎉",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("3 marbles, all stacked. That's the whole jar."),
    ).toBeInTheDocument();

    const [storedJar] = getStoredStorage().jars;

    expect(storedJar.marbles).toHaveLength(3);
    expect(storedJar).not.toHaveProperty("completedAt");
  });

  it("dismisses the celebration without completing the jar", () => {
    seedStorage([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 1,
        color: "mint",
        marbles: [],
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    ]);

    render(<JarDetailPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Add today's marble" }),
    );
    advanceToCelebration();
    fireEvent.click(screen.getByRole("button", { name: "Close celebration" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Jar full")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Finish this jar" }),
    ).toBeInTheDocument();
    expect(getStoredStorage().jars[0]).not.toHaveProperty("completedAt");
    expect(getStoredStorage().completed).toEqual([]);
  });

  it("pours a completed jar into the trophy shelf", () => {
    seedStorage([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 1,
        color: "mint",
        marbles: [],
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    ]);

    render(<JarDetailPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Add today's marble" }),
    );
    advanceToCelebration();
    fireEvent.click(
      screen.getByRole("button", { name: "Pour into trophy shelf" }),
    );

    const storage = getStoredStorage();

    expect(storage.jars).toEqual([]);
    expect(storage.completed).toEqual([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 1,
        color: "mint",
        marbles: [
          { date: "2026-06-09", at: "2026-06-09T12:00:00.000Z" },
        ],
        createdAt: "2026-06-01T12:00:00.000Z",
        completedAt: "2026-06-09T12:00:00.650Z",
      },
    ]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("✓ Complete")).toBeInTheDocument();
  });

  it("keeps a completed jar on the dashboard", () => {
    seedStorage([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 1,
        color: "mint",
        marbles: [],
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    ]);

    render(<JarDetailPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Add today's marble" }),
    );
    advanceToCelebration();
    fireEvent.click(screen.getByRole("button", { name: "Keep on display" }));

    const storage = getStoredStorage();

    expect(storage.completed).toEqual([]);
    expect(storage.jars).toEqual([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 1,
        color: "mint",
        marbles: [
          { date: "2026-06-09", at: "2026-06-09T12:00:00.000Z" },
        ],
        createdAt: "2026-06-01T12:00:00.000Z",
        completedAt: "2026-06-09T12:00:00.650Z",
      },
    ]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("✓ Complete")).toBeInTheDocument();
  });

  it("shows completed jars without auto-opening the celebration on mount", () => {
    seedStorage([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 3,
        color: "mint",
        marbles: [
          { date: "2026-06-07", at: "2026-06-07T12:00:00.000Z" },
          { date: "2026-06-08", at: "2026-06-08T12:00:00.000Z" },
          { date: "2026-06-09", at: "2026-06-09T12:00:00.000Z" },
        ],
        createdAt: "2026-06-01T12:00:00.000Z",
        completedAt: "2026-06-09T12:00:00.000Z",
      },
    ]);

    render(<JarDetailPage />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("✓ Complete")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add today's marble" }),
    ).not.toBeInTheDocument();
  });

  it("loads poured completed jars from the trophy shelf", () => {
    seedStorage(
      [],
      [
        {
          id: "jar-1",
          name: "Daily reading",
          target: 3,
          color: "mint",
          marbles: [
            { date: "2026-06-07", at: "2026-06-07T12:00:00.000Z" },
            { date: "2026-06-08", at: "2026-06-08T12:00:00.000Z" },
            { date: "2026-06-09", at: "2026-06-09T12:00:00.000Z" },
          ],
          createdAt: "2026-06-01T12:00:00.000Z",
          completedAt: "2026-06-09T12:00:00.000Z",
        },
      ],
    );

    render(<JarDetailPage />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Daily reading" }),
    ).toBeInTheDocument();
    expect(screen.getByText("✓ Complete")).toBeInTheDocument();
  });

  it("keeps legacy jars without completedAt in the in-progress flow", () => {
    seedLegacyJars([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 4,
        color: "mint",
        marbles: [
          { date: "2026-06-06", at: "2026-06-06T12:00:00.000Z" },
          { date: "2026-06-07", at: "2026-06-07T12:00:00.000Z" },
          { date: "2026-06-08", at: "2026-06-08T12:00:00.000Z" },
        ],
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    ]);

    render(<JarDetailPage />);

    expect(
      screen.getByRole("button", { name: "Add today's marble" }),
    ).toBeEnabled();
    expect(screen.queryByText("✓ Complete")).not.toBeInTheDocument();
  });
});

describe("JarDetailPage longest streak", () => {
  function makeJar(marbles: Jar["marbles"]): Jar {
    return {
      id: "jar-1",
      name: "Daily reading",
      target: 30,
      color: "mint",
      marbles,
      createdAt: "2026-01-01T12:00:00.000Z",
    };
  }

  beforeEach(() => {
    localStorage.clear();
    setJarQuery("jar-1");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    { dates: [], expected: 0 },
    { dates: ["2026-06-10"], expected: 1 },
    { dates: ["2026-06-09", "2026-06-10"], expected: 2 },
  ])(
    "always shows $expected days without a short current-streak badge",
    ({ dates, expected }) => {
      seedStorage([makeJar(dates)]);
      render(<JarDetailPage />);

      expect(screen.getByText(`En uzun: ${expected} gün`)).toHaveAttribute(
        "lang",
        "tr",
      );
      expect(screen.queryByText(/days in a row/)).not.toBeInTheDocument();
    },
  );

  it("groups the historical record with the unchanged current streak", () => {
    seedStorage([
      makeJar([
        "2026-06-01",
        "2026-06-02",
        "2026-06-03",
        "2026-06-04",
        "2026-06-05",
        "2026-06-08",
        "2026-06-09",
        "2026-06-10",
      ]),
    ]);
    render(<JarDetailPage />);

    const record = screen.getByText("En uzun: 5 gün");
    const group = record.parentElement!;
    expect(within(group).getByText("3 days in a row 🔥")).toBeInTheDocument();
    expect(group).toHaveClass("flex-wrap");
    expect(record).not.toHaveAttribute("tabindex");
  });

  it("shows a broken record older than the 14-day history without writing storage", () => {
    const jar = makeJar(
      Array.from(
        { length: 12 },
        (_, index) => `2026-01-${String(index + 1).padStart(2, "0")}`,
      ),
    );
    seedLegacyJars([jar]);
    const stored = localStorage.getItem(JARS_STORAGE_KEY);
    render(<JarDetailPage />);

    expect(screen.getByText("En uzun: 12 gün")).toBeInTheDocument();
    expect(screen.queryByText(/days in a row/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "2026-01-01: marble added" }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(JARS_STORAGE_KEY)).toBe(stored);
  });

  it.each([
    { older: [], before: 3, after: 4 },
    {
      older: [
        "2026-06-01",
        "2026-06-02",
        "2026-06-03",
        "2026-06-04",
        "2026-06-05",
      ],
      before: 5,
      after: 5,
    },
  ])(
    "updates $before to $after on add and restores it on reopen",
    ({ older, before, after }) => {
      seedStorage([
        makeJar([...older, "2026-06-07", "2026-06-08", "2026-06-09"]),
      ]);
      const view = render(<JarDetailPage />);
      expect(screen.getByText(`En uzun: ${before} gün`)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Add today's marble" }));

      expect(screen.getByText(`En uzun: ${after} gün`)).toBeInTheDocument();
      expect(screen.getByText("4 days in a row 🔥")).toBeInTheDocument();
      const doneButton = screen.getByRole("button", { name: "Done for today ✓" });
      expect(doneButton).toBeDisabled();
      fireEvent.click(doneButton);
      expect(getStoredStorage().jars[0].marbles).toHaveLength(older.length + 4);

      view.unmount();
      render(<JarDetailPage />);
      expect(screen.getByText(`En uzun: ${after} gün`)).toBeInTheDocument();
    },
  );

  it.each(["active", "display", "trophy"])(
    "isolates the selected jar in %s storage",
    (location) => {
      const jar = makeJar(["2026-06-01", "2026-06-02"]);
      const other = {
        ...makeJar(["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04"]),
        id: "jar-2",
      };
      if (location !== "active") {
        jar.completedAt = "2026-06-02T12:00:00.000Z";
      }
      seedStorage(
        location === "trophy" ? [other] : [other, jar],
        location === "trophy" ? [jar] : [],
      );
      const stored = localStorage.getItem(JARS_STORAGE_KEY);
      render(<JarDetailPage />);

      expect(screen.getByText("En uzun: 2 gün")).toBeInTheDocument();
      if (location !== "active") {
        expect(
          screen.queryByRole("button", { name: "Add today's marble" }),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      }
      expect(localStorage.getItem(JARS_STORAGE_KEY)).toBe(stored);
    },
  );

  it.each(["/jar", "/jar?id=missing"])("does not show a record for %s", (url) => {
    seedStorage([makeJar([])]);
    window.history.replaceState({}, "", url);
    render(<JarDetailPage />);

    expect(
      screen.getByRole("heading", { name: "Jar not found" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/En uzun:/)).not.toBeInTheDocument();
  });
});
