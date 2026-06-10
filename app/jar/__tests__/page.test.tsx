import { act, fireEvent, render, screen } from "@testing-library/react";

import {
  type Jar,
  type JarStorage,
  JARS_STORAGE_KEY,
} from "../../../lib/storage";
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
  window.history.replaceState({}, "", `http://localhost/jar?id=${id}`);
}

describe("JarDetailPage", () => {
  beforeEach(() => {
    localStorage.clear();
    setJarQuery("jar-1");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00.000Z"));
  });

  afterEach(() => {
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
    expect(screen.getByText("Keep going")).toBeInTheDocument();
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

  it("shows a short drop message for a new streak", () => {
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

    expect(screen.queryByText("Nice!")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Add today's marble" }),
    );

    expect(screen.getByText("Nice!")).toBeInTheDocument();
  });

  it("shows the streak milestone in the drop message", () => {
    seedStorage([
      {
        id: "jar-1",
        name: "Daily reading",
        target: 14,
        color: "mint",
        marbles: [
          { date: "2026-05-31", at: "2026-05-31T12:00:00.000Z" },
          { date: "2026-06-01", at: "2026-06-01T12:00:00.000Z" },
          { date: "2026-06-02", at: "2026-06-02T12:00:00.000Z" },
          { date: "2026-06-03", at: "2026-06-03T12:00:00.000Z" },
          { date: "2026-06-04", at: "2026-06-04T12:00:00.000Z" },
          { date: "2026-06-05", at: "2026-06-05T12:00:00.000Z" },
          { date: "2026-06-06", at: "2026-06-06T12:00:00.000Z" },
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

    expect(screen.getByText("10 in a row!")).toBeInTheDocument();
  });

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
        target: 3,
        color: "mint",
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
      screen.getByRole("button", { name: "Add today's marble" }),
    ).toBeEnabled();
    expect(screen.queryByText("✓ Complete")).not.toBeInTheDocument();
  });
});
