import { fireEvent, render, screen } from "@testing-library/react";

import { type Jar, JARS_STORAGE_KEY } from "../../../../lib/storage";
import JarDetailPage from "../page";

const routeParams = vi.hoisted(() => ({ id: "jar-1" }));

vi.mock("next/navigation", () => ({
  useParams: () => routeParams,
}));

function seedJars(jars: Jar[]) {
  localStorage.setItem(JARS_STORAGE_KEY, JSON.stringify(jars));
}

function getStoredJars() {
  return JSON.parse(localStorage.getItem(JARS_STORAGE_KEY) ?? "[]") as Jar[];
}

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
    seedJars([
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
    expect(
      screen.getByRole("img", { name: "Daily reading jar is 60% full" }),
    ).toBeInTheDocument();
    expect(getStoredJars()).toEqual([
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
    seedJars([
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

    fireEvent.click(button);

    expect(getStoredJars()[0].marbles).toHaveLength(3);
  });

  it("renders the last 14 days with filled, missed, and today-pending states", () => {
    seedJars([
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
    routeParams.id = "missing-jar";
    seedJars([
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
    expect(screen.getByRole("link", { name: "Back to jars" }))
      .toHaveAttribute("href", "/");
  });

  it("opens the celebration and stamps completion when the target is reached", () => {
    seedJars([
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

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Jar full!" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Completed 🎉")).toBeInTheDocument();

    const [storedJar] = getStoredJars();

    expect(storedJar.marbles).toHaveLength(3);
    expect(storedJar.completedAt).toBe("2026-06-09T12:00:00.000Z");
  });

  it("shows completed controls without auto-opening celebration on mount", () => {
    seedJars([
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
    expect(screen.getByText("Completed 🎉")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Replay celebration" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start a new round" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add today's marble" }),
    ).not.toBeInTheDocument();
  });

  it("replays and closes the celebration for a completed jar", () => {
    seedJars([
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

    fireEvent.click(
      screen.getByRole("button", { name: "Replay celebration" }),
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("gates starting a new round behind confirmation", () => {
    seedJars([
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

    fireEvent.click(screen.getByRole("button", { name: "Start a new round" }));

    expect(
      screen.getByText("Start a new round? This empties the jar."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, reset" }))
      .toBeInTheDocument();
    expect(getStoredJars()[0].marbles).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByText("Start a new round? This empties the jar."),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Completed 🎉")).toBeInTheDocument();
    expect(getStoredJars()[0].marbles).toHaveLength(3);
  });

  it("clears marbles and completion when a new round is confirmed", () => {
    seedJars([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 1,
        color: "mint",
        marbles: [
          { date: "2026-06-09", at: "2026-06-09T12:00:00.000Z" },
        ],
        createdAt: "2026-06-01T12:00:00.000Z",
        completedAt: "2026-06-09T12:00:00.000Z",
      },
    ]);

    render(<JarDetailPage />);

    fireEvent.click(screen.getByRole("button", { name: "Start a new round" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, reset" }));

    const [storedJar] = getStoredJars();

    expect(storedJar.marbles).toEqual([]);
    expect(storedJar).not.toHaveProperty("completedAt");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add today's marble" }),
    ).toBeEnabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Add today's marble" }),
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(getStoredJars()[0].completedAt).toBe(
      "2026-06-09T12:00:00.000Z",
    );
  });

  it("keeps jars without completedAt in the in-progress flow", () => {
    seedJars([
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

    expect(
      screen.getByRole("button", { name: "Add today's marble" }),
    ).toBeEnabled();
    expect(screen.queryByText("Completed 🎉")).not.toBeInTheDocument();
  });
});
