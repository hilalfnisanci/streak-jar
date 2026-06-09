import { fireEvent, render, screen } from "@testing-library/react";

import { JARS_STORAGE_KEY } from "../../../../lib/storage";
import JarDetailPage from "../page";

const routeParams = vi.hoisted(() => ({ id: "jar-1" }));

vi.mock("next/navigation", () => ({
  useParams: () => routeParams,
}));

describe("JarDetailPage", () => {
  beforeEach(() => {
    localStorage.clear();
    routeParams.id = "jar-1";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds today's marble to localStorage and updates the page", () => {
    localStorage.setItem(
      JARS_STORAGE_KEY,
      JSON.stringify([
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
      ]),
    );

    render(<JarDetailPage />);

    expect(screen.getByText("2 / 5 marbles")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Add today's marble" }),
    );

    expect(
      screen.getByRole("button", { name: "Done for today ✓" }),
    ).toBeDisabled();
    expect(screen.getByText("3 / 5 marbles")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Daily reading jar is 60% full" }),
    ).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(JARS_STORAGE_KEY) ?? "[]")).toEqual([
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
    ]);
  });

  it("disables the add button when today's marble already exists", () => {
    localStorage.setItem(
      JARS_STORAGE_KEY,
      JSON.stringify([
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
      ]),
    );

    render(<JarDetailPage />);

    const button = screen.getByRole("button", {
      name: "Done for today ✓",
    });

    expect(button).toBeDisabled();
    expect(screen.getByText("3 days in a row 🔥")).toBeInTheDocument();

    fireEvent.click(button);

    const storedJars = JSON.parse(
      localStorage.getItem(JARS_STORAGE_KEY) ?? "[]",
    );

    expect(storedJars[0].marbles).toHaveLength(3);
  });

  it("renders the last 14 days with filled, missed, and today-pending states", () => {
    localStorage.setItem(
      JARS_STORAGE_KEY,
      JSON.stringify([
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
      ]),
    );

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
    routeParams.id = "missing-jar";
    localStorage.setItem(
      JARS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "jar-1",
          name: "Daily reading",
          target: 5,
          color: "mint",
          marbles: [],
          createdAt: "2026-06-01T12:00:00.000Z",
        },
      ]),
    );

    render(<JarDetailPage />);

    expect(
      screen.getByRole("heading", { name: "Jar not found" }),
    ).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to jars" }))
      .toHaveAttribute("href", "/");
  });
});
