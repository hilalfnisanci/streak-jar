import { render, screen, within } from "@testing-library/react";

import { getLocalDateKey } from "../../lib/local-date";
import { type Jar, type MarbleEntry, JARS_STORAGE_KEY } from "../../lib/storage";
import Home from "../page";

function getDateKey(offsetDays: number) {
  const date = new Date();

  date.setDate(date.getDate() + offsetDays);

  return getLocalDateKey(date);
}

function makeJar(overrides: Partial<Jar> = {}): Jar {
  return {
    id: "jar-1",
    name: "Daily reading",
    target: 5,
    color: "mint",
    marbles: [],
    createdAt: "2026-06-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("Home", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each([
    [30, 25, "Hedefe 5 gün"],
    [5, 0, "Hedefe 5 gün"],
    [5, 4, "Hedefe 1 gün"],
    [5, 5, "Hedefe ulaşıldı"],
    [5, 6, "Hedefe ulaşıldı"],
  ])("shows goal status for target %i with %i marbles", (target, count, status) => {
    const stored = JSON.stringify([
      makeJar({
        target,
        marbles: Array.from({ length: count }, () => "2026-06-01"),
      }),
    ]);
    localStorage.setItem(JARS_STORAGE_KEY, stored);
    const writeSpy = vi.spyOn(Storage.prototype, "setItem");

    render(<Home />);

    const card = screen.getByRole("link", { name: "Open Daily reading" });
    expect(within(card).getByText(`${count} / ${target}`)).toBeInTheDocument();
    expect(within(card).getByText(status)).toHaveAttribute("lang", "tr");
    expect(card).toHaveAccessibleDescription(status);
    expect(card).toHaveAttribute("href", "/jar?id=jar-1");
    card.focus();
    expect(card).toHaveFocus();
    expect(within(card).queryByText(/^Hedefe (0|-\d+) gün$/)).not.toBeInTheDocument();
    if (count >= target) {
      expect(within(card).queryByText(/^Hedefe \d+ gün$/)).not.toBeInTheDocument();
    }
    expect(screen.queryByText("Trophy Shelf")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("✓ Complete")).not.toBeInTheDocument();
    expect(writeSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem(JARS_STORAGE_KEY)).toBe(stored);
  });

  it.each(["legacy", "current"])(
    "counts string, object and mixed marbles without rewriting %s storage",
    (format) => {
      const dates = ["2026-06-01", "2026-06-01", "2026-06-05"];
      const objects = dates.map((date) => ({ date, at: `${date}T12:00:00.000Z` }));
      const entries: MarbleEntry[][] = [
        dates,
        objects,
        [dates[0], objects[1], dates[2]],
      ];
      const jars = entries.map((marbles, index) =>
        makeJar({ id: `jar-${index}`, name: `Habit ${index}`, marbles }),
      );
      const stored = JSON.stringify(
        format === "legacy" ? jars : { jars, completed: [] },
      );
      localStorage.setItem(JARS_STORAGE_KEY, stored);
      const writeSpy = vi.spyOn(Storage.prototype, "setItem");

      render(<Home />);

      for (const jar of jars) {
        const card = screen.getByRole("link", { name: `Open ${jar.name}` });
        expect(within(card).getByText("3 / 5")).toBeInTheDocument();
        expect(within(card).getByText("Hedefe 2 gün")).toBeInTheDocument();
        expect(card).toHaveAccessibleDescription("Hedefe 2 gün");
      }
      expect(writeSpy).not.toHaveBeenCalled();
      expect(localStorage.getItem(JARS_STORAGE_KEY)).toBe(stored);
    },
  );

  it("does not count elapsed days or the streak as remaining progress", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 10, 12));
    localStorage.setItem(
      JARS_STORAGE_KEY,
      JSON.stringify([
        makeJar({
          target: 30,
          marbles: Array.from({ length: 25 }, (_, index) =>
            getDateKey(-index * 2),
          ),
        }),
      ]),
    );
    const view = render(<Home />);

    expect(screen.getByRole("link", { name: "Open Daily reading" }))
      .toHaveAccessibleDescription("Hedefe 5 gün");
    expect(screen.queryByLabelText(/day streak/)).not.toBeInTheDocument();
    view.unmount();
    vi.setSystemTime(new Date(2026, 5, 11, 12));
    render(<Home />);
    expect(screen.getByRole("link", { name: "Open Daily reading" }))
      .toHaveAccessibleDescription("Hedefe 5 gün");
  });

  it.each([null, "", "[]", "{}", "{invalid json"])(
    "keeps the empty state without goal text for storage %s",
    (stored) => {
      if (stored !== null) {
        localStorage.setItem(JARS_STORAGE_KEY, stored);
      }

      render(<Home />);

      expect(screen.getByRole("link", { name: "Create your first jar" }))
        .toHaveAttribute("href", "/jars/new");
      expect(screen.queryByText(/Hedefe/)).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /^Open / })).not.toBeInTheDocument();
    },
  );

  it("shows the streak through today at local 01:00", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 10, 1));
    localStorage.setItem(
      JARS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "jar-1",
          name: "Daily reading",
          target: 30,
          color: "mint",
          marbles: ["2026-06-08", "2026-06-09", "2026-06-10"],
          createdAt: "2026-06-01T12:00:00.000Z",
        },
      ]),
    );

    render(<Home />);

    expect(screen.getByLabelText("3 day streak")).toHaveTextContent("🔥3");
  });

  it("renders the empty state when there are no jars", () => {
    render(<Home />);

    expect(
      screen.getByText(
        "Your jars will appear here. First marble's just a tap away.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create your first jar" }),
    ).toHaveAttribute("href", "/jars/new");
  });

  it("renders stored jars as cards", async () => {
    localStorage.setItem(
      JARS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "jar-1",
          name: "Daily reading",
          target: 30,
          color: "mint",
          marbles: [
            getDateKey(-2),
            getDateKey(-1),
            getDateKey(0),
            ...Array.from({ length: 9 }, (_, index) => `m-${index}`),
          ],
          createdAt: "2026-06-09T12:00:00.000Z",
        },
        {
          id: "jar-2",
          name: "Morning walk",
          target: 20,
          color: "coral",
          marbles: Array.from({ length: 5 }, (_, index) => `w-${index}`),
          createdAt: "2026-06-09T12:00:00.000Z",
        },
        {
          id: "jar-3",
          name: "Water plants",
          target: 10,
          color: "sage",
          marbles: Array.from({ length: 10 }, (_, index) => `p-${index}`),
          createdAt: "2026-06-09T12:00:00.000Z",
        },
      ]),
    );

    render(<Home />);

    expect(
      await screen.findByRole("heading", { name: "Your jars" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Open / })).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Open Daily reading" }))
      .toHaveAttribute("href", "/jar?id=jar-1");
    expect(screen.getByText("12 / 30")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Daily reading jar is 40% full" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("3 day streak")).toHaveTextContent("🔥3");
    for (const [name, status] of [
      ["Daily reading", "Hedefe 18 gün"],
      ["Morning walk", "Hedefe 15 gün"],
      ["Water plants", "Hedefe ulaşıldı"],
    ]) {
      const card = screen.getByRole("link", { name: `Open ${name}` });
      expect(within(card).getByText(status)).toBeInTheDocument();
      expect(card).toHaveAccessibleDescription(status);
    }
    expect(screen.getByRole("link", { name: "+ New jar" })).toHaveAttribute(
      "href",
      "/jars/new",
    );
  });

  it.each([
    { keptCount: 0, trophyCount: 0 },
    { keptCount: 3, trophyCount: 2 },
  ])("prioritizes completion in both lists with $keptCount/$trophyCount marbles", async ({ keptCount, trophyCount }) => {
    localStorage.setItem(
      JARS_STORAGE_KEY,
      JSON.stringify({
        jars: [
          {
            id: "jar-1",
            name: "Daily reading",
            target: 3,
            color: "mint",
            marbles: Array.from({ length: keptCount }, (_, index) => `m-${index}`),
            createdAt: "2026-06-01T12:00:00.000Z",
            completedAt: "2026-06-09T12:00:00.000Z",
          },
        ],
        completed: [
          {
            id: "jar-2",
            name: "Morning walk",
            target: 2,
            color: "coral",
            marbles: Array.from({ length: trophyCount }, (_, index) => `w-${index}`),
            createdAt: "2026-06-01T12:00:00.000Z",
            completedAt: "2026-06-09T12:00:00.000Z",
          },
        ],
      }),
    );

    render(<Home />);

    expect(
      await screen.findByRole("heading", { name: "Your jars" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Trophy Shelf" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Daily reading" }))
      .toHaveAttribute("href", "/jar?id=jar-1");
    expect(screen.getByRole("link", { name: "Open Morning walk" }))
      .toHaveAttribute("href", "/jar?id=jar-2");
    expect(screen.getAllByText("✓ Complete")).toHaveLength(2);
    for (const name of ["Daily reading", "Morning walk"]) {
      const card = screen.getByRole("link", { name: `Open ${name}` });
      expect(within(card).getByText("Hedefe ulaşıldı")).toBeInTheDocument();
      expect(within(card).getByText("✓ Complete")).toBeInTheDocument();
      expect(card).toHaveAccessibleDescription("Hedefe ulaşıldı");
      expect(within(card).queryByText(/^Hedefe \d+ gün$/)).not.toBeInTheDocument();
    }
  });
});
