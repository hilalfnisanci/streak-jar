import {
  getJarColor,
  jarColorList,
  jarColorOrder,
  jarColorSolids,
  jarColors,
} from "./jar-colors";

describe("jar colors", () => {
  it("provides every shared presentation token for each supported color", () => {
    expect(jarColorList.map(({ key }) => key)).toEqual(jarColorOrder);
    expect(jarColorSolids).toEqual(
      jarColorOrder.map((key) => jarColors[key].solid),
    );

    for (const key of jarColorOrder) {
      expect(jarColors[key]).toMatchObject({
        label: expect.any(String),
        solid: expect.stringMatching(/^bg-/),
        fill: expect.stringMatching(/^bg-/),
        border: expect.stringMatching(/^border-/),
        borderSoft: expect.stringMatching(/^border-/),
        tint: expect.stringMatching(/^bg-/),
        jarFill: expect.stringMatching(/^bg-/),
        preview: expect.stringMatching(/^bg-/),
      });
    }
  });

  it("falls back to coral for legacy or unknown colors", () => {
    expect(getJarColor("unknown")).toBe(jarColors.coral);
  });
});
