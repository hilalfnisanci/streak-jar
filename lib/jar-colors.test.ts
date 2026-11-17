import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
        onSolid: expect.stringMatching(/^text-/),
        fill: expect.stringMatching(/^bg-/),
        border: expect.stringMatching(/^border-/),
        borderSoft: expect.stringMatching(/^border-/),
        tint: expect.stringMatching(/^bg-/),
        jarFill: expect.stringMatching(/^bg-/),
        preview: expect.stringMatching(/^bg-/),
      });
    }
  });

  it("keeps text on every solid jar color at WCAG AA contrast (4.5:1)", () => {
    const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8");
    const hexFor = (utility: string) => {
      const name = utility.replace(/^(bg|text)-/, "");
      const hex =
        name === "white"
          ? "#ffffff"
          : css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`, "i"))?.[1];
      if (!hex) throw new Error(`No hex value for ${utility}`);
      return hex;
    };
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };

    for (const key of jarColorOrder) {
      const { solid, onSolid } = jarColors[key];
      expect
        .soft(contrast(hexFor(onSolid), hexFor(solid)), key)
        .toBeGreaterThanOrEqual(4.5);
    }
  });

  it("falls back to coral for legacy or unknown colors", () => {
    expect(getJarColor("unknown")).toBe(jarColors.coral);
  });
});
