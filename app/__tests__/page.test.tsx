import { render, screen } from "@testing-library/react";

import Home from "../page";

describe("Home", () => {
  it("renders the empty state", () => {
    render(<Home />);

    expect(
      screen.getByText(
        "Your jars will appear here. First marble's just a tap away.",
      ),
    ).toBeInTheDocument();
  });
});
