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

    fireEvent.change(screen.getByLabelText("Jar name"), {
      target: { value: "Daily reading" },
    });
    fireEvent.change(screen.getByLabelText("Marbles to fill the jar"), {
      target: { value: "45" },
    });
    fireEvent.click(screen.getByLabelText("Mint jar"));
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

  it("shows validation messages for invalid fields and focuses the first error", () => {
    render(<NewJarPage />);

    fireEvent.change(screen.getByLabelText("Marbles to fill the jar"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create jar" }));

    const nameInput = screen.getByLabelText("Jar name");
    const targetInput = screen.getByLabelText("Marbles to fill the jar");

    expect(screen.getByText("Enter a name for your jar.")).toBeInTheDocument();
    expect(
      screen.getByText("Pick a number between 5 and 365 marbles."),
    ).toBeInTheDocument();
    expect(nameInput).toHaveFocus();
    expect(nameInput).toHaveAttribute(
      "aria-describedby",
      "jar-name-hint jar-name-error",
    );
    expect(targetInput).toHaveAttribute(
      "aria-describedby",
      "jar-target-hint jar-target-error",
    );
    expect(screen.getByText("Enter a name for your jar.")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(localStorage.getItem(JARS_STORAGE_KEY)).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("focuses the target when the marble count is invalid", () => {
    render(<NewJarPage />);

    fireEvent.change(screen.getByLabelText("Jar name"), {
      target: { value: "Daily reading" },
    });
    fireEvent.change(screen.getByLabelText("Marbles to fill the jar"), {
      target: { value: "12.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create jar" }));

    expect(
      screen.getByText("Enter how many marbles fill the jar."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Marbles to fill the jar")).toHaveFocus();
    expect(localStorage.getItem(JARS_STORAGE_KEY)).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the field hints before submit", () => {
    render(<NewJarPage />);

    expect(screen.getByText("The habit you want to track.")).toBeInTheDocument();
    expect(screen.getByText("One marble per day — 5 to 365.")).toBeInTheDocument();
    expect(screen.getByLabelText("Jar name")).toHaveAttribute(
      "aria-describedby",
      "jar-name-hint",
    );
    expect(screen.getByLabelText("Marbles to fill the jar")).toHaveAttribute(
      "aria-describedby",
      "jar-target-hint",
    );
  });

  it("updates the live preview when a color is selected", () => {
    render(<NewJarPage />);

    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByText("Your new jar")).toBeInTheDocument();
    expect(screen.getByText("Preview · empty jar")).toBeInTheDocument();
    expect(screen.getByLabelText("Coral jar preview")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Jar name"), {
      target: { value: "Daily reading" },
    });
    fireEvent.click(screen.getByLabelText("Sage jar"));

    expect(screen.getByText("Daily reading")).toBeInTheDocument();
    expect(screen.getByLabelText("Sage jar preview")).toBeInTheDocument();
  });

  it("keeps the target input narrow while the name input fills the field", () => {
    render(<NewJarPage />);

    expect(screen.getByLabelText("Jar name")).toHaveClass("w-full");
    expect(screen.getByLabelText("Marbles to fill the jar")).toHaveClass("w-36");
    expect(screen.getByLabelText("Marbles to fill the jar")).not.toHaveClass(
      "w-full",
    );
  });
});
