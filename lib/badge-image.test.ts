import {
  BADGE_HEIGHT,
  BADGE_WIDTH,
  getBadgeFileName,
  getBadgeModel,
  getShareText,
  renderBadgePng,
} from "./badge-image";
import { type Jar } from "./storage";
import { getWeek, type JarWeek } from "./week";

const lastWeek = getWeek("2026-11-10", "last");

const jar: Jar = {
  id: "a",
  name: "Morning pages",
  target: 60,
  color: "peach",
  marbles: [],
  createdAt: "2026-10-01T09:00:00.000Z",
};

const fullWeek: JarWeek = {
  jar,
  days: Array(7).fill("marble"),
  marbles: 7,
  daysInScope: 7,
  longestStreak: 7,
  isFirstWeek: false,
  isFull: true,
  previous: 5,
  delta: 2,
  filledOn: null,
};

describe("badge model and file names", () => {
  it.each([
    ["Morning pages", true, lastWeek, "streak-jar-morning-pages-nov-2-8.png"],
    ["Morning pages", false, lastWeek, "streak-jar-habit-nov-2-8.png"],
    ["Çay içmek", true, lastWeek, "streak-jar-habit-nov-2-8.png"],
    [
      "  Read 20 pages!  ",
      true,
      getWeek("2026-11-03", "last"),
      "streak-jar-read-20-pages-oct-26-nov-1.png",
    ],
  ])("names %s (shown: %s) as %s", (name, showName, week, expected) => {
    expect(getBadgeFileName(name, showName, week)).toBe(expected);
  });

  it("builds full and starter models from the jar week (AC14, AC15)", () => {
    expect(getBadgeModel(fullWeek, lastWeek, true)).toEqual({
      kind: "full",
      ribbon: "✓ Full week",
      name: "Morning pages",
      count: 7,
      slots: 7,
      caption: "of 7 days",
      sub: "Nov 2 – 8, 2026 · 🔥 7-day streak",
      color: "peach",
    });

    const starter = getBadgeModel(
      { ...fullWeek, marbles: 5, daysInScope: 5, longestStreak: 5, isFirstWeek: true },
      lastWeek,
      false,
    );

    expect(starter).toMatchObject({
      kind: "starter",
      ribbon: "✓ Starter week",
      name: "A habit, kept",
      slots: 5,
      caption: "of 5 days",
    });
    expect(getShareText("Morning pages", false)).toBe(
      "I kept a habit going all week with Streak Jar.",
    );
  });
});

describe("renderBadgePng", () => {
  const createElement = document.createElement.bind(document);

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // jsdom has no canvas, so a recording 2D context stands in for the browser.
  function stubCanvas(context: object | null) {
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback: BlobCallback) =>
        callback(new Blob(["png"], { type: "image/png" })),
      ),
    };

    vi.stubGlobal(
      "Path2D",
      class {
        constructor(public path: string) {}
      },
    );
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string, options?: ElementCreationOptions) =>
        tagName === "canvas"
          ? (canvas as unknown as HTMLCanvasElement)
          : createElement(tagName, options),
    );

    return canvas;
  }

  function recordingContext() {
    const fillText: string[] = [];
    const state: Record<string | symbol, unknown> = {
      measureText: (text: string) => ({ width: text.length * 20 }),
      createRadialGradient: () => ({ addColorStop: () => undefined }),
      fillText: (text: string) => fillText.push(text),
    };
    const context = new Proxy(state, {
      get: (target, property) =>
        property in target ? target[property] : () => undefined,
      set: (target, property, value) => {
        target[property] = value;
        return true;
      },
    });

    return { context, fillText };
  }

  it("draws a 1080×1350 PNG with the resolved name (AC15, AC16)", async () => {
    const { context, fillText } = recordingContext();
    const canvas = stubCanvas(context);

    const blob = await renderBadgePng(getBadgeModel(fullWeek, lastWeek, false));

    expect(blob.type).toBe("image/png");
    expect([canvas.width, canvas.height]).toEqual([BADGE_WIDTH, BADGE_HEIGHT]);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
    expect(fillText).toEqual(
      expect.arrayContaining([
        "✓ FULL WEEK",
        "7",
        "OF 7 DAYS",
        "A habit, kept",
        "Nov 2 – 8, 2026 · 🔥 7-day streak",
        "Streak Jar",
      ]),
    );
    expect(fillText).not.toContain("Morning pages");
  });

  it("rejects when the canvas has no 2D context (AC20)", async () => {
    stubCanvas(null);

    await expect(
      renderBadgePng(getBadgeModel(fullWeek, lastWeek, true)),
    ).rejects.toThrow();
  });
});
