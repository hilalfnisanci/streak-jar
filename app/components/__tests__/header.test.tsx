import { render, screen } from "@testing-library/react";

import { Header } from "../header";

describe("Header", () => {
  it("links the app logo back to the jar dashboard", () => {
    render(<Header />);

    expect(
      screen.getByRole("link", { name: "Open Streak Jar app" }),
    ).toHaveAttribute("href", "/jars");
  });
});
