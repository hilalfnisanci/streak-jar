import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import { downloadBlob, renderBadgePng } from "../../../lib/badge-image";
import { JARS_STORAGE_KEY } from "../../../lib/storage";
import RecapPage from "../page";

// jsdom cannot rasterise a canvas or download files, so only these two
// browser boundaries are replaced. The real renderer is covered by
// lib/badge-image.test.ts; share, file names and models stay real here.
vi.mock("../../../lib/badge-image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/badge-image")>()),
  renderBadgePng: vi.fn(),
  downloadBlob: vi.fn(),
}));

const renderBadgePngMock = vi.mocked(renderBadgePng);
const downloadBlobMock = vi.mocked(downloadBlob);
const png = new Blob(["png"], { type: "image/png" });

const normalWeek = {
  jars: [
    {
      id: "a",
      name: "Morning pages",
      target: 60,
      color: "coral",
      createdAt: "2026-09-21T08:00:00.000Z",
      marbles: [
        "2026-10-26",
        "2026-10-27",
        { date: "2026-10-29", at: "2026-10-29T07:30:00.000Z" },
        "2026-10-30",
        "2026-11-01",
        "2026-11-02",
        "2026-11-03",
        { date: "2026-11-04", at: "2026-11-04T07:30:00.000Z" },
        "2026-11-05",
        "2026-11-06",
        "2026-11-07",
        "2026-11-08",
        "2026-11-09",
        "2026-11-10",
        "not-a-date",
        { date: "2026/11/04" },
      ],
    },
    {
      id: "b",
      name: "Read 20 pages",
      target: 40,
      color: "lavender",
      createdAt: "2026-10-01T08:00:00.000Z",
      marbles: [
        "2026-10-27",
        "2026-10-29",
        "2026-10-31",
        "2026-11-01",
        "2026-11-02",
        "2026-11-03",
        "2026-11-05",
        "2026-11-08",
      ],
    },
  ],
  completed: [
    {
      id: "d",
      name: "Drink water",
      target: 16,
      color: "sky",
      createdAt: "2026-10-15T08:00:00.000Z",
      completedAt: "2026-11-05T15:00:00.000Z",
      marbles: ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"],
    },
  ],
};

function seed(value: object) {
  localStorage.setItem(JARS_STORAGE_KEY, JSON.stringify(value));
}

function getJarCard(name: string) {
  return within(screen.getByRole("article", { name }));
}

function setLocation(search: string) {
  window.history.replaceState(null, "", `/recap${search}`);
}

function stubFileSharing(share: () => Promise<void>) {
  Object.defineProperty(navigator, "canShare", {
    configurable: true,
    value: vi.fn(() => true),
  });
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: vi.fn(share),
  });

  return navigator.share as unknown as ReturnType<typeof vi.fn>;
}

describe("RecapPage", () => {
  beforeEach(() => {
    localStorage.clear();
    setLocation("");
    renderBadgePngMock.mockReset().mockResolvedValue(png);
    downloadBlobMock.mockReset();
    // Only the clock is faked: Tue Nov 10, 2026 at local noon.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 10, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, "canShare");
    Reflect.deleteProperty(navigator, "share");
  });

  it("shows last week per jar and switches to this week by keyboard (AC3–AC5, AC9, AC11, AC23)", () => {
    seed(normalWeek);

    render(<RecapPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Nov 2 – 8" })).toHaveFocus();

    const morning = getJarCard("Morning pages");
    expect(morning.getByText("7 / 7")).toBeInTheDocument();
    expect(morning.getByText("7 days")).toBeInTheDocument();
    expect(morning.getByText("✓ Full week")).toBeInTheDocument();
    expect(morning.getByText("▲ +2")).toHaveAttribute("aria-hidden", "true");
    expect(morning.getByText("2 more than last week")).toBeInTheDocument();
    expect(morning.getByText("vs 5 last week")).toBeInTheDocument();
    expect(morning.getByRole("button", { name: "Get your badge" })).toBeInTheDocument();

    const reading = getJarCard("Read 20 pages");
    expect(reading.getByText("4 / 7")).toBeInTheDocument();
    expect(reading.getByText("2 days")).toBeInTheDocument();
    expect(reading.getByText("＝ Same")).toBeInTheDocument();
    expect(reading.getByText("3 days short of a full week badge.")).toBeInTheDocument();
    expect(reading.queryByRole("button")).not.toBeInTheDocument();

    const water = getJarCard("Drink water");
    expect(water.getByText(/Jar filled on Thursday/)).toBeInTheDocument();
    expect(water.queryByText(/short of a full week/)).not.toBeInTheDocument();
    expect(water.queryByRole("button")).not.toBeInTheDocument();

    const lastTab = screen.getByRole("tab", { name: "Last week" });
    expect(lastTab).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(lastTab, { key: "ArrowRight" });

    const thisTab = screen.getByRole("tab", { name: "This week" });
    expect(thisTab).toHaveAttribute("aria-selected", "true");
    expect(thisTab).toHaveFocus();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Nov 9 – 15");
    expect(screen.getByText("2/7")).toBeInTheDocument();
    expect(screen.getByText("Days so far")).toBeInTheDocument();
    expect(screen.getByText(/This week is still going/)).toBeInTheDocument();
    expect(screen.getAllByText("Compare on Sun")).toHaveLength(2);
    expect(screen.queryByRole("article", { name: "Drink water" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Get your badge" })).not.toBeInTheDocument();
    expect(
      getJarCard("Morning pages").getByRole("listitem", { name: "Wednesday: not yet" }),
    ).toBeInTheDocument();
  });

  it("counts a starter week from the creation day (AC6, AC7)", () => {
    seed({
      jars: [
        {
          id: "a",
          name: "Morning pages",
          target: 30,
          color: "peach",
          createdAt: "2026-11-04T08:00:00.000Z",
          marbles: ["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"],
        },
        {
          id: "b",
          name: "Stretch",
          target: 30,
          color: "sage",
          createdAt: "2026-11-04T08:00:00.000Z",
          marbles: ["2026-11-04", "2026-11-05", "2026-11-07", "2026-11-08"],
        },
      ],
      completed: [],
    });

    render(<RecapPage />);

    const starter = getJarCard("Morning pages");
    expect(
      starter.getByRole("listitem", { name: "Monday: before jar was created" }),
    ).toBeInTheDocument();
    expect(
      starter.getByRole("listitem", { name: "Tuesday: before jar was created" }),
    ).toBeInTheDocument();
    expect(starter.getByText("5 / 5")).toBeInTheDocument();
    expect(starter.getByText("Days since start")).toBeInTheDocument();
    expect(starter.getByText("✓ Starter week")).toBeInTheDocument();
    expect(starter.getByText("No last week yet")).toBeInTheDocument();
    expect(getJarCard("Stretch").getByText("1 day short of a full week badge.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Get your badge" })).toHaveLength(1);
    expect(screen.getByText("Your first week!")).toBeInTheDocument();
  });

  it("treats a quiet week kindly and offers no badge (AC8)", () => {
    seed({
      jars: [
        {
          id: "a",
          name: "Morning pages",
          target: 50,
          color: "coral",
          createdAt: "2026-09-21T08:00:00.000Z",
          marbles: ["2026-10-26", "2026-10-27", "2026-10-28"],
        },
      ],
      completed: [],
    });

    render(<RecapPage />);

    expect(screen.getByRole("heading", { name: "A quiet week" })).toBeInTheDocument();
    expect(
      screen.getByText(/No marbles went in between Nov 2 and Nov 8\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Drop today's marble" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("heading", { name: "Your jars" })).toBeInTheDocument();
    expect(getJarCard("Morning pages").getByText("▼ −3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Get your badge" })).not.toBeInTheDocument();
  });

  it("opens this week from the link before any week has finished (AC10)", () => {
    setLocation("?week=this");
    seed({
      jars: [
        {
          id: "a",
          name: "Guitar practice",
          target: 30,
          color: "butter",
          createdAt: "2026-11-09T08:00:00.000Z",
          marbles: ["2026-11-09"],
        },
      ],
      completed: [],
    });

    render(<RecapPage />);

    expect(screen.getByRole("tab", { name: "This week" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Last week" }));

    expect(
      screen.getByRole("heading", { name: "Your first recap arrives Monday" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/closes on Sunday, Nov 15\./)).toBeInTheDocument();
  });

  it("previews, toggles, saves and closes the badge without touching storage (AC14–AC16, AC18, AC21)", async () => {
    seed(normalWeek);
    const storedBefore = localStorage.getItem(JARS_STORAGE_KEY);
    const keyCountBefore = localStorage.length;

    render(<RecapPage />);

    const trigger = screen.getByRole("button", { name: "Get your badge" });
    fireEvent.click(trigger);

    const dialog = within(screen.getByRole("dialog", { name: "Your badge" }));
    expect(dialog.getByRole("button", { name: "Close" })).toHaveFocus();
    expect(
      dialog.getByRole("img", {
        name: "Badge preview: Full week, Morning pages, 7 of 7 days, Nov 2 – 8, 2026 · 7-day streak",
      }),
    ).toBeInTheDocument();
    // The ring must stay absolutely positioned even though `.jar__marble`
    // (unlayered CSS) sets position: relative, so it matches the PNG ring.
    const ring = dialog
      .getByRole("img", { name: /^Badge preview:/ })
      .querySelectorAll<HTMLElement>(".jar__marble");
    expect(ring).toHaveLength(7);
    for (const marble of ring) {
      expect(marble.style.position).toBe("absolute");
    }
    expect(ring[0].style.left).toBe("50%");
    expect(ring[0].style.top).toBe("4%");
    // Without file sharing, Save image is the only action (AC18).
    expect(dialog.queryByRole("button", { name: "Share" })).not.toBeInTheDocument();

    fireEvent.click(dialog.getByRole("button", { name: "Save image" }));

    await waitFor(() =>
      expect(downloadBlobMock).toHaveBeenCalledWith(
        png,
        "streak-jar-morning-pages-nov-2-8.png",
      ),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Image saved");

    const nameSwitch = dialog.getByRole("switch", { name: "Show jar name on badge" });
    fireEvent.click(nameSwitch);

    expect(nameSwitch).toHaveAttribute("aria-checked", "false");
    expect(dialog.getByText("A habit, kept")).toBeInTheDocument();

    fireEvent.click(dialog.getByRole("button", { name: "Save image" }));

    await waitFor(() =>
      expect(downloadBlobMock).toHaveBeenLastCalledWith(
        png,
        "streak-jar-habit-nov-2-8.png",
      ),
    );
    expect(renderBadgePngMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "A habit, kept" }),
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByTestId("badge-sheet-scrim"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "This week" }));

    expect(localStorage.getItem(JARS_STORAGE_KEY)).toBe(storedBefore);
    expect(localStorage.length).toBe(keyCountBefore);
  });

  it("shares the PNG where supported and ignores a dismissed share sheet (AC17)", async () => {
    const share = stubFileSharing(() =>
      Promise.reject(new DOMException("Share canceled", "AbortError")),
    );
    seed(normalWeek);

    render(<RecapPage />);
    fireEvent.click(screen.getByRole("button", { name: "Get your badge" }));
    fireEvent.click(await screen.findByRole("button", { name: "Share" }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));

    const [{ files, text }] = share.mock.calls[0] as [ShareData];
    expect(files?.[0].name).toBe("streak-jar-morning-pages-nov-2-8.png");
    expect(files?.[0].type).toBe("image/png");
    expect(text).toBe("I kept Morning pages going all week with Streak Jar.");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Share" })).toBeEnabled(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(downloadBlobMock).not.toHaveBeenCalled();
  });

  it("drops a finished image once the sheet was closed while it rendered", async () => {
    const share = stubFileSharing(() => Promise.resolve());
    let resolveRender: (blob: Blob) => void = () => undefined;
    renderBadgePngMock.mockReturnValue(
      new Promise<Blob>((resolve) => {
        resolveRender = resolve;
      }),
    );
    seed(normalWeek);

    render(<RecapPage />);
    fireEvent.click(screen.getByRole("button", { name: "Get your badge" }));
    fireEvent.click(await screen.findByRole("button", { name: "Save image" }));
    expect(screen.getByRole("button", { name: "Creating image…" })).toBeDisabled();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => resolveRender(png));

    expect(downloadBlobMock).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("shows loading, then an error with a retry of the same action (AC19, AC20)", async () => {
    stubFileSharing(() => Promise.resolve());
    let rejectRender: (error: Error) => void = () => undefined;
    renderBadgePngMock.mockReturnValueOnce(
      new Promise<Blob>((_, reject) => {
        rejectRender = reject;
      }),
    );
    seed(normalWeek);

    render(<RecapPage />);
    fireEvent.click(screen.getByRole("button", { name: "Get your badge" }));
    await screen.findByRole("button", { name: "Share" });
    fireEvent.click(screen.getByRole("button", { name: "Save image" }));

    expect(screen.getByRole("button", { name: "Creating image…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Share" })).toBeDisabled();

    await act(async () => rejectRender(new Error("canvas failed")));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "We couldn't create the image. Your marbles are safe — this only affects the badge picture.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));

    await waitFor(() =>
      expect(downloadBlobMock).toHaveBeenCalledWith(
        png,
        "streak-jar-morning-pages-nov-2-8.png",
      ),
    );
    expect(renderBadgePngMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
