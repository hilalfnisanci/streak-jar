import { fireEvent, render, screen } from "@testing-library/react";

import { type Jar, JARS_STORAGE_KEY } from "../../../lib/storage";
import ShelfPage from "../page";

function seedJars(jars: Jar[]) {
  localStorage.setItem(JARS_STORAGE_KEY, JSON.stringify(jars));
}

describe("ShelfPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the empty state when there are no completed jars", () => {
    seedJars([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 30,
        color: "mint",
        marbles: [{ date: "2026-06-08", at: "2026-06-08T12:00:00.000Z" }],
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    ]);

    render(<ShelfPage />);

    expect(
      screen.getByRole("heading", {
        name: "No trophies yet. Finish a jar first.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to jars" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders completed jars with name and completion date", () => {
    seedJars([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 3,
        color: "mint",
        marbles: [
          { date: "2026-03-01", at: "2026-03-01T12:00:00.000Z" },
          { date: "2026-03-02", at: "2026-03-02T12:00:00.000Z" },
          { date: "2026-04-05", at: "2026-04-05T12:00:00.000Z" },
        ],
        createdAt: "2026-03-01T12:00:00.000Z",
        completedAt: "2026-04-05T12:00:00.000Z",
      },
      {
        id: "jar-2",
        name: "In progress",
        target: 30,
        color: "coral",
        marbles: [{ date: "2026-06-08", at: "2026-06-08T12:00:00.000Z" }],
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    ]);

    render(<ShelfPage />);

    expect(
      screen.getByRole("heading", { name: "Trophy shelf" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Daily reading story" }),
    ).toBeInTheDocument();
    expect(screen.getByText("April 5, 2026")).toBeInTheDocument();
    // In-progress jars must not appear on the shelf.
    expect(
      screen.queryByRole("button", { name: "Open In progress story" }),
    ).not.toBeInTheDocument();
  });

  it("opens a modal with duration and longest streak when a jar is clicked", () => {
    seedJars([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 5,
        color: "mint",
        marbles: [
          { date: "2026-03-01", at: "2026-03-01T12:00:00.000Z" },
          { date: "2026-03-02", at: "2026-03-02T12:00:00.000Z" },
          { date: "2026-03-03", at: "2026-03-03T12:00:00.000Z" },
          { date: "2026-03-10", at: "2026-03-10T12:00:00.000Z" },
          { date: "2026-04-05", at: "2026-04-05T12:00:00.000Z" },
        ],
        createdAt: "2026-03-01T12:00:00.000Z",
        completedAt: "2026-04-05T12:00:00.000Z",
      },
    ]);

    render(<ShelfPage />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Open Daily reading story" }),
    );

    const dialog = screen.getByRole("dialog");

    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Daily reading" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Started March 1, finished April 5 (35 days)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Longest streak: 3 days")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
