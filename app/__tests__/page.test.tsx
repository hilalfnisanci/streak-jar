import { render, screen, within } from "@testing-library/react";

import { getLocalDateKey } from "../../lib/local-date";
import { JARS_STORAGE_KEY } from "../../lib/storage";
import Home from "../page";

function getDateKey(offsetDays: number) {
  const date = new Date();

  date.setDate(date.getDate() + offsetDays);

  return getLocalDateKey(date);
}

describe("Home", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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
    expect(screen.queryByText(/Weekly recap/)).not.toBeInTheDocument();
  });

  describe("weekly recap card", () => {
    function seedJars(jars: object[], completed: object[] = []) {
      localStorage.setItem(JARS_STORAGE_KEY, JSON.stringify({ jars, completed }));
    }

    function getRecapCard() {
      return screen.getByRole("link", { name: /^Weekly recap, / });
    }

    beforeEach(() => {
      // Tue Nov 10, 2026: last week is Nov 2 – 8, this week is Nov 9 – 15.
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 10, 10, 12));
    });

    it("summarises last week under Your jars and opens the recap (AC1)", () => {
      seedJars(
        [
          {
            id: "jar-1",
            name: "Morning pages",
            target: 60,
            color: "coral",
            marbles: [
              "2026-11-02",
              "2026-11-03",
              "2026-11-04",
              { date: "2026-11-05", at: "2026-11-05T06:00:00.000Z" },
              "2026-11-06",
              "2026-11-07",
              "2026-11-08",
            ],
            createdAt: "2026-10-01T09:00:00.000Z",
          },
        ],
        [
          {
            id: "jar-2",
            name: "Drink water",
            target: 4,
            color: "sky",
            marbles: ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"],
            createdAt: "2026-10-01T09:00:00.000Z",
            completedAt: "2026-11-05T15:00:00.000Z",
          },
        ],
      );

      render(<Home />);

      const card = getRecapCard();

      expect(card).toHaveAttribute("href", "/recap");
      expect(within(card).getByText("Weekly recap · Nov 2 – 8")).toBeInTheDocument();
      expect(within(card).getByText("11 marbles last week")).toBeInTheDocument();
      expect(
        within(card).getByText("1 jar filled every day · badge ready"),
      ).toBeInTheDocument();
      expect(
        screen
          .getByRole("heading", { name: "Your jars" })
          .compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("calls out a quiet week kindly (AC8)", () => {
      seedJars([
        {
          id: "jar-1",
          name: "Morning pages",
          target: 60,
          color: "coral",
          marbles: ["2026-10-27", "2026-10-28"],
          createdAt: "2026-10-01T09:00:00.000Z",
        },
      ]);

      render(<Home />);

      const card = getRecapCard();

      expect(within(card).getByText("Last week was quiet")).toBeInTheDocument();
      expect(
        within(card).getByText(
          "No marbles Nov 2 – 8. A fresh week started Monday.",
        ),
      ).toBeInTheDocument();
    });

    it("opens this week when no week has finished yet (AC10)", () => {
      seedJars([
        {
          id: "jar-1",
          name: "Guitar practice",
          target: 30,
          color: "butter",
          marbles: ["2026-11-09", "2026-11-10"],
          createdAt: "2026-11-09T09:00:00.000Z",
        },
      ]);

      render(<Home />);

      const card = getRecapCard();

      expect(card).toHaveAttribute("href", "/recap?week=this");
      expect(within(card).getByText("Weekly recap · Nov 9 – 15")).toBeInTheDocument();
      expect(
        within(card).getByText("Your first recap arrives Monday"),
      ).toBeInTheDocument();
      expect(within(card).getByText("See this week so far")).toBeInTheDocument();
    });
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
    expect(screen.getByRole("link", { name: "+ New jar" })).toHaveAttribute(
      "href",
      "/jars/new",
    );
  });

  it("renders kept jars with a complete ribbon and poured jars on the trophy shelf", async () => {
    localStorage.setItem(
      JARS_STORAGE_KEY,
      JSON.stringify({
        jars: [
          {
            id: "jar-1",
            name: "Daily reading",
            target: 3,
            color: "mint",
            marbles: Array.from({ length: 3 }, (_, index) => `m-${index}`),
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
            marbles: Array.from({ length: 2 }, (_, index) => `w-${index}`),
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
  });
});
