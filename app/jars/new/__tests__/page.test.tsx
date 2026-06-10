import { fireEvent, render, screen } from "@testing-library/react";

import { JARS_STORAGE_KEY } from "../../../../lib/storage";
import NewJarPage from "../page";

const push = vi.fn();

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
});
