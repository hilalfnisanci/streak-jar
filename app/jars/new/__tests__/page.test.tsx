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

  it.each(["", "   "])(
    "focuses the invalid name with its error description for %j",
    (value) => {
      render(<NewJarPage />);
      const name = screen.getByLabelText("Name");
      const submit = screen.getByRole("button", { name: "Create jar" });
      const descriptionsAtFocus: Array<string | null> = [];
      name.addEventListener("focus", () => {
        const errorId = name.getAttribute("aria-describedby");
        descriptionsAtFocus.push(
          errorId ? document.getElementById(errorId)?.textContent ?? null : null,
        );
      });

      fireEvent.change(name, { target: { value } });
      // A repeated invalid submission must move focus again, even if the error
      // text has not changed. fireEvent.click does not focus the button itself.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        submit.focus();
        fireEvent.click(submit);

        expect(name).toHaveFocus();
        expect(name).toHaveAttribute("aria-invalid", "true");
        expect(name).toHaveAccessibleDescription("Please name your jar");
      }
      expect(descriptionsAtFocus).toEqual([
        "Please name your jar",
        "Please name your jar",
      ]);
      expect(localStorage.getItem(JARS_STORAGE_KEY)).toBeNull();
      expect(push).not.toHaveBeenCalled();
    },
  );

  it("announces the name error and clears it when corrected", () => {
    render(<NewJarPage />);
    const name = screen.getByLabelText("Name");
    const submit = screen.getByRole("button", { name: "Create jar" });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(submit);
    expect(screen.getByRole("alert")).toHaveTextContent("Please name your jar");

    fireEvent.change(name, { target: { value: "Daily reading" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "false");
    expect(name).not.toHaveAttribute("aria-describedby");

    fireEvent.click(submit);
    expect(
      JSON.parse(localStorage.getItem(JARS_STORAGE_KEY)!).jars,
    ).toHaveLength(1);
    expect(push).toHaveBeenCalledTimes(1);
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

  it("focuses and announces the first invalid field on form submission", () => {
    render(<NewJarPage />);
    const name = screen.getByLabelText("Name");
    const target = screen.getByLabelText("Target");
    const submit = screen.getByRole("button", { name: "Create jar" });
    const form = submit.closest("form")!;

    fireEvent.change(target, { target: { value: "4" } });
    submit.focus();
    fireEvent.submit(form);
    expect(name).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent("Please name your jar");

    fireEvent.change(name, { target: { value: "Daily reading" } });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      submit.focus();
      fireEvent.submit(form);
      expect(target).toHaveFocus();
      expect(target).toHaveAttribute("aria-invalid", "true");
      expect(target).toHaveAccessibleDescription(
        "Target must be between 5 and 365",
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Target must be between 5 and 365",
      );
    }
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
