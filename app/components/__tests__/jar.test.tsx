import { render, screen } from "@testing-library/react";

import { getJarFillPercent, Jar } from "../jar";

describe("Jar", () => {
  it("preserves the mini preview limit and fill percentage semantics", () => {
    render(
      <Jar
        color="mint"
        marbles={Array.from({ length: 13 }, (_, index) => `m-${index}`)}
        name="Daily reading"
        target={30}
        variant="mini"
      />,
    );

    const jar = screen.getByRole("img", {
      name: "Daily reading jar is 43% full",
    });

    expect(jar.querySelectorAll(".jar__marble")).toHaveLength(12);
  });

  it("shows the latest 24 marbles in the large variant and keeps its animation hook", () => {
    render(
      <Jar
        color="coral"
        marbles={Array.from({ length: 25 }, (_, index) => `m-${index}`)}
        name="Morning walk"
        target={30}
        variant="large"
      />,
    );

    const jar = screen.getByRole("img", {
      name: "Morning walk jar is 83% full",
    });

    expect(jar.querySelectorAll(".jar__marble")).toHaveLength(24);
    expect(jar.querySelector(".jar__marble--drop")).toBeInTheDocument();
  });

  it("renders the color-labelled empty preview", () => {
    render(<Jar color="sage" variant="preview" />);

    const jar = screen.getByRole("img", { name: "Sage jar preview" });

    expect(jar).toBeInTheDocument();
    expect(jar.querySelectorAll(".jar__marble")).toHaveLength(0);
  });

  it("clamps invalid targets to an empty fill level", () => {
    expect(getJarFillPercent(4, 0)).toBe(0);
    expect(getJarFillPercent(8, 4)).toBe(100);
  });
});
