import { readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";

import { JARS_STORAGE_KEY } from "../../../../lib/storage";
import NewJarPage from "../page";

const push = vi.fn();

const theme = readFileSync("app/globals.css", "utf8");

function themeColor(token: string) {
  const hex = theme.match(new RegExp(`--${token}:\\s*#([\\da-f]{6});`, "i"))?.[1];
  if (!hex) throw new Error(`Missing hex color for ${token}`);
  return hex;
}

function luminance(hex: string) {
  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function expectReadableError(error: HTMLElement) {
  // JSDOM does not compile Tailwind. Resolve the rendered text utility through
  // the real theme so changing either the utility or its palette is covered.
  const tokens = Array.from(error.classList).flatMap((className) => {
    if (!className.startsWith("text-")) return [];
    const color = className.slice("text-".length);
    const token = theme.match(
      new RegExp(`--color-${color}:\\s*var\\(--([\\w-]+)\\);`),
    )?.[1];
    return token ? [token] : [];
  });
  expect(tokens).toHaveLength(1);
  const foreground = luminance(themeColor(tokens[0]));
  const background = luminance(themeColor("cream"));
  const contrast =
    (Math.max(foreground, background) + 0.05) /
    (Math.min(foreground, background) + 0.05);
  expect(contrast).toBeGreaterThanOrEqual(4.5);
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

describe("NewJarPage", () => {
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00.000Z"));
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "jar-1"),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("creates a jar in localStorage and redirects home", () => {
    render(<NewJarPage />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Daily reading" },
    });
    fireEvent.change(screen.getByLabelText("Target"), {
      target: { value: "45" },
    });
    fireEvent.click(screen.getByLabelText("Mint"));
    fireEvent.click(screen.getByRole("button", { name: "Create jar" }));

    expect(
      JSON.parse(
        localStorage.getItem(JARS_STORAGE_KEY) ?? '{"jars":[],"completed":[]}',
      ),
    ).toEqual({
      jars: [
        {
          id: "jar-1",
          name: "Daily reading",
          target: 45,
          color: "mint",
          marbles: [],
          createdAt: "2026-06-09T12:00:00.000Z",
        },
      ],
      completed: [],
    });
    expect(push).toHaveBeenCalledWith("/");
  });

  it("shows a validation message when the name is empty", () => {
    render(<NewJarPage />);

    fireEvent.click(screen.getByRole("button", { name: "Create jar" }));

    expect(screen.getByText("Please name your jar")).toBeInTheDocument();
    expectReadableError(screen.getByText("Please name your jar"));
    expect(localStorage.getItem(JARS_STORAGE_KEY)).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("does not save when the target is outside the allowed range", () => {
    render(<NewJarPage />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Daily reading" },
    });
    fireEvent.change(screen.getByLabelText("Target"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create jar" }));

    expect(
      screen.getByText("Target must be between 5 and 365"),
    ).toBeInTheDocument();
    expectReadableError(screen.getByText("Target must be between 5 and 365"));
    expect(localStorage.getItem(JARS_STORAGE_KEY)).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("updates the live preview when a color is selected", () => {
    render(<NewJarPage />);

    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByLabelText("Coral jar preview")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Sage"));

    expect(screen.getByLabelText("Sage jar preview")).toBeInTheDocument();
  });

  it("keeps the target input narrow while the name input fills the field", () => {
    render(<NewJarPage />);

    expect(screen.getByLabelText("Name")).toHaveClass("w-full");
    expect(screen.getByLabelText("Target")).toHaveClass("w-36");
    expect(screen.getByLabelText("Target")).not.toHaveClass("w-full");
  });
});
