import { render, screen } from "@testing-library/react";

import { JARS_STORAGE_KEY } from "../../lib/storage";
import Home from "../page";

function getDateKey(offsetDays: number) {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() + offsetDays);

  return date.toISOString().slice(0, 10);
}

describe("Home", () => {
  beforeEach(() => {
    localStorage.clear();
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
      .toHaveAttribute("href", "/jars/jar-1");
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
      .toHaveAttribute("href", "/jars/jar-1");
    expect(screen.getByRole("link", { name: "Open Morning walk" }))
      .toHaveAttribute("href", "/jars/jar-2");
    expect(screen.getAllByText("✓ Complete")).toHaveLength(2);
  });
});
