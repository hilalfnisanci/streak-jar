import { act, fireEvent, render, screen } from "@testing-library/react";

import { REMINDERS_STORAGE_KEY } from "../../../../lib/reminders";
import { JARS_STORAGE_KEY, loadJarStorage, saveJarStorage } from "../../../../lib/storage";
import Home from "../../../page";
import NewJarPage from "../page";

const push = vi.fn();
const randomUUID = vi.fn();

function stubNotifications(outcome: NotificationPermission) {
  const notification = {
    permission: "default",
    requestPermission: vi.fn(async () => {
      notification.permission = outcome;
      return outcome;
    }),
  };
  vi.stubGlobal("Notification", notification);
  vi.stubGlobal("navigator", {
    serviceWorker: { register: vi.fn() },
    locks: { request: async (_name: string, task: () => unknown) => task() },
  });
  return notification.requestPermission;
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

describe("NewJarPage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    push.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00.000Z"));
    randomUUID.mockReset().mockReturnValue("jar-1");
    vi.stubGlobal("crypto", { randomUUID });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("saves the first jar before asking, then enables it and confirms on Home", async () => {
    const askPermission = stubNotifications("granted");
    const { unmount } = render(<NewJarPage />);

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
    expect(askPermission).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Daily reading is ready" })).toHaveFocus();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Turn on reminders" }));
    });

    expect(askPermission).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/");
    expect(JSON.parse(localStorage.getItem(REMINDERS_STORAGE_KEY) ?? "{}").enabledJarIds)
      .toEqual(["jar-1"]);
    unmount();
    render(<Home />);
    expect(screen.getByRole("status")).toHaveTextContent("Reminder on for Daily reading · 20:00");
    expect(screen.getByRole("link", { name: "Open Daily reading" }))
      .toHaveAccessibleDescription("Reminder at 20:00");
  });

  it("honors Not now and does not offer consent when the first jar is on the trophy shelf", () => {
    const askPermission = stubNotifications("granted");
    const { unmount } = render(<NewJarPage />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Daily reading" } });
    fireEvent.click(screen.getByRole("button", { name: "Create jar" }));
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(push).toHaveBeenCalledWith("/");

    unmount();
    const { jars } = loadJarStorage();
    saveJarStorage({
      jars: [],
      completed: [{ ...jars[0], completedAt: new Date().toISOString() }],
    });
    push.mockClear();
    randomUUID.mockReturnValue("jar-2");
    render(<NewJarPage />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Morning walk" } });
    fireEvent.click(screen.getByRole("button", { name: "Create jar" }));

    expect(screen.queryByRole("button", { name: "Turn on reminders" })).not.toBeInTheDocument();
    expect(push).toHaveBeenCalledWith("/");
    expect(askPermission).not.toHaveBeenCalled();
    expect(localStorage.getItem(REMINDERS_STORAGE_KEY)).toBeNull();
  });

  it("keeps the saved jar usable after browser permission is denied", async () => {
    stubNotifications("denied");
    render(<NewJarPage />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Daily reading" } });
    fireEvent.click(screen.getByRole("button", { name: "Create jar" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Turn on reminders" }));
    });

    expect(screen.getByRole("status")).toHaveTextContent("Your jar is saved");
    const continueButton = screen.getByRole("button", { name: "Go to my jars" });
    expect(continueButton).toHaveFocus();
    expect(localStorage.getItem(REMINDERS_STORAGE_KEY)).toBeNull();
    fireEvent.click(continueButton);
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

  it("keeps the target input narrow while the name input fills the field", () => {
    render(<NewJarPage />);

    expect(screen.getByLabelText("Name")).toHaveClass("w-full");
    expect(screen.getByLabelText("Target")).toHaveClass("w-36");
    expect(screen.getByLabelText("Target")).not.toHaveClass("w-full");
  });
});
