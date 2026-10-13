import { render, screen } from "@testing-library/react";

import { getDemoBookingUrl } from "../../../lib/site";
import LandingPage, { metadata } from "../page";

describe("LandingPage", () => {
  it("renders the marketing story instead of the jar dashboard", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Progress your team can see filling.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("For teams")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Three steps, and then nothing to learn.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Momentum you can share without ranking anyone.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Full jars stay on the shelf." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "See a jar fill before you commit to anything.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Your jars will appear here. First marble's just a tap away."),
    ).not.toBeInTheDocument();
  });

  it("points each demo CTA at the scheduler with slot attribution", () => {
    render(<LandingPage />);

    const demoLinks = screen.getAllByRole("link", {
      name: "Book a demo (opens in a new tab)",
    });

    expect(demoLinks).toHaveLength(3);
    expect(demoLinks[0]).toHaveAttribute("href", getDemoBookingUrl("nav"));
    expect(demoLinks[1]).toHaveAttribute("href", getDemoBookingUrl("hero"));
    expect(demoLinks[2]).toHaveAttribute("href", getDemoBookingUrl("closing"));
    demoLinks.forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  it("keeps in-page and app navigation reachable", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("link", { name: "See how it works" }),
    ).toHaveAttribute("href", "#method");
    expect(screen.getByRole("link", { name: "Open the app →" })).toHaveAttribute(
      "href",
      "/jars",
    );
  });

  it("sets landing-specific metadata", () => {
    expect(metadata).toMatchObject({
      title: "Streak Jar — Book a demo",
      description:
        "A calm marble-jar habit tracker for teams that want visible progress without streak anxiety.",
    });
  });
});
