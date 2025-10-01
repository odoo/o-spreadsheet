import { Color } from "@odoo/o-spreadsheet-engine";
import { HSLA, RGBA } from "@odoo/o-spreadsheet-engine/types";
const testColors: { input: Color; hex: Color; rgba: RGBA; hsla: HSLA }[] = [
  {
    input: "#000000",
    hex: "#000000",
    rgba: { a: 1, r: 0, g: 0, b: 0 },
    hsla: { a: 1, h: 0, s: 0, l: 0 },
  },
  {
    input: "#FFFFFF",
    hex: "#FFFFFF",
    rgba: { a: 1, r: 255, g: 255, b: 255 },
    hsla: { a: 1, h: 0, s: 0, l: 100 },
  },
  {
    input: "#000",
    hex: "#000000",
    rgba: { a: 1, r: 0, g: 0, b: 0 },
    hsla: { a: 1, h: 0, s: 0, l: 0 },
  },
  {
    input: "#FFF",
    hex: "#FFFFFF",
    rgba: { a: 1, r: 255, g: 255, b: 255 },
    hsla: { a: 1, h: 0, s: 0, l: 100 },
  },
  {
    input: "#FF000033",
    hex: "#FF000033",
    rgba: { a: 0.2, r: 255, g: 0, b: 0 },
    hsla: { a: 0.2, h: 0, s: 100, l: 50 },
  },
  {
    input: "#1d51a333",
    hex: "#1D51A333",
    rgba: { a: 0.2, r: 29, g: 81, b: 163 },
    hsla: { a: 0.2, h: 216.7, s: 69.8, l: 37.6 },
  },
  {
    input: "rgb(30, 80, 16)",
    hex: "#1E5010",
    rgba: { a: 1, r: 30, g: 80, b: 16 },
    hsla: { a: 1, h: 107, s: 66.67, l: 18.8 },
  },
  {
    input: "rgb(30, 80, 16, 0.5)",
    hex: "#1E501080",
    rgba: { a: 0.502, r: 30, g: 80, b: 16 },
    hsla: { a: 0.502, h: 107, s: 66.67, l: 18.8 },
  },
  {
    input: "rgba(30, 80, 16, 0.5)",
    hex: "#1E501080",
    rgba: { a: 0.502, r: 30, g: 80, b: 16 },
    hsla: { a: 0.502, h: 107, s: 66.67, l: 18.8 },
  },
  {
    input: "rgba(0, 0, 0, 0)",
    hex: "#00000000",
    rgba: { a: 0, r: 0, g: 0, b: 0 },
    hsla: { a: 0, h: 0, s: 0, l: 0 },
  },
];

describe("toHex", () => {
  test.each(testColors)("toHex() %s", ({ input, hex }) => {
    expect(toHex(input)).toBeSameColorAs(hex);
  });
});

describe("colorToRGBA", () => {
  test.each(testColors)("basic functionality %s", ({ input, rgba }) => {
    expect(colorToRGBA(input)).toEqual(rgba);
  });
});

describe("rgbaToHex", () => {
  test.each(testColors)("basic functionality", ({ rgba, hex }) => {
    expect(rgbaToHex(rgba)).toBeSameColorAs(hex);
  });
});

describe("rgbaToHSLA", () => {
  test.each(testColors)("basic functionality", ({ rgba, hsla: expectedHSLA }) => {
    const hsla = rgbaToHSLA(rgba);
    expect(hsla.h).toBeCloseTo(expectedHSLA.h, 0);
    expect(hsla.s).toBeCloseTo(expectedHSLA.s, 0);
    expect(hsla.l).toBeCloseTo(expectedHSLA.l, 0);
    expect(hsla.a).toBeCloseTo(expectedHSLA.a, 0);
  });
});

describe("hslaToRGBA", () => {
  test.each(testColors)("basic functionality %s", ({ rgba: expectedRGBA, hsla }) => {
    const rgba = hslaToRGBA(hsla);
    expect(rgba.r).toBeCloseTo(expectedRGBA.r, 0);
    expect(rgba.g).toBeCloseTo(expectedRGBA.g, 0);
    expect(rgba.b).toBeCloseTo(expectedRGBA.b, 0);
    expect(rgba.a).toBeCloseTo(expectedRGBA.a, 0);
  });
});

describe("isColorValid", () => {
  test("valid colors", () => {
    expect(isColorValid("rgb(255, 255, 255)")).toBe(true);
    expect(isColorValid("rgba(255, 255, 255, 1)")).toBe(true);
    expect(isColorValid("#000")).toBe(true);
    expect(isColorValid("#000000")).toBe(true);
  });

  test("invalid colors", () => {
    expect(isColorValid("")).toBe(false);
    expect(isColorValid("#")).toBe(false);
    expect(isColorValid("rgb(256, 255, 255)")).toBe(false);
    expect(isColorValid("rgb(255, 280, 255)")).toBe(false);
    expect(isColorValid("rgb(256, 255, -1)")).toBe(false);
    expect(isColorValid("rgba(256, 255, 255, 6)")).toBe(false);
    expect(isColorValid("rgba(256, 255, 255, -0.1)")).toBe(false);
    expect(isColorValid("#azazaz")).toBe(false);
  });
});

describe("rgba", () => {
  test("invalid values", () => {
    expect(() => rgba(256, 12, 12)).toThrow("Invalid RGBA values 256,12,12,1");
    expect(() => rgba(12, 256, 12)).toThrow("Invalid RGBA values 12,256,12,1");
    expect(() => rgba(12, 12, 256)).toThrow("Invalid RGBA values 12,12,256,1");
    expect(() => rgba(12, 12, 12, 1.1)).toThrow("Invalid RGBA values 12,12,12,1.1");
    expect(() => rgba(-1, 12, 12)).toThrow("Invalid RGBA values -1,12,12,1");
    expect(() => rgba(12, -1, 12)).toThrow("Invalid RGBA values 12,-1,12,1");
    expect(() => rgba(12, 12, -1)).toThrow("Invalid RGBA values 12,12,-1,1");
    expect(() => rgba(12, 12, 12, -0.1)).toThrow("Invalid RGBA values 12,12,12,-0.1");
  });

  test("extreme values", () => {
    expect(rgba(0, 0, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(rgba(255, 255, 255, 1)).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  test("default alpha value", () => {
    expect(rgba(1, 2, 3)).toEqual({ r: 1, g: 2, b: 3, a: 1 });
  });
});

describe("getColorScale", () => {
  test("Supports rbga strings ", () => {
    const colorScale = getColorScale([
      {
        value: 0,
        color: "rgba(0, 0, 0)",
      },
      {
        value: 100,
        color: "rgba(0, 0, 255)",
      },
    ]);
    expect(colorScale(50)).toBeSameColorAs("rgba(0, 0, 127)");
  });

  test("supports hex colors", () => {
    const colorScale = getColorScale([
      {
        value: 0,
        color: "#000000",
      },
      {
        value: 2,
        color: "#000080",
      },
      {
        value: 4,
        color: "#0000FF",
      },
    ]);
    expect(colorScale(-1)).toBeSameColorAs("#000000");
    expect(colorScale(0)).toBeSameColorAs("#000000");
    expect(colorScale(1)).toBeSameColorAs("#000040");
    expect(colorScale(2)).toBeSameColorAs("#000080");
    expect(colorScale(3)).toBeSameColorAs("#0000C0");
    expect(colorScale(4)).toBeSameColorAs("#0000FF");
    expect(colorScale(5)).toBeSameColorAs("#0000FF");
  });

  test("supports number colors", () => {
    const colorScale = getColorScale([
      {
        value: 0,
        color: 0x000000,
      },
      {
        value: 2,
        color: 0x000080,
      },
      {
        value: 4,
        color: 0x0000ff,
      },
    ]);
    expect(colorScale(-1)).toBeSameColorAs("#000000");
    expect(colorScale(0)).toBeSameColorAs("#000000");
    expect(colorScale(1)).toBeSameColorAs("#000040");
    expect(colorScale(2)).toBeSameColorAs("#000080");
    expect(colorScale(3)).toBeSameColorAs("#0000C0");
    expect(colorScale(4)).toBeSameColorAs("#0000FF");
    expect(colorScale(5)).toBeSameColorAs("#0000FF");
  });

  test("supports colors with alpha", () => {
    const colorScale = getColorScale([
      {
        value: 0,
        color: "#00000000",
      },
      {
        value: 2,
        color: "#00008080",
      },
      {
        value: 4,
        color: "#0000FFFF",
      },
    ]);
    expect(colorScale(-1)).toBeSameColorAs("#00000000");
    expect(colorScale(0)).toBeSameColorAs("#00000080");
    expect(colorScale(1)).toBeSameColorAs("#00004080");
    expect(colorScale(2)).toBeSameColorAs("#00008080");
    // the alpha always matches the one of the upper threshold
    expect(colorScale(2 + 1e-9)).toBeSameColorAs("#000080FF");
    expect(colorScale(3)).toBeSameColorAs("#0000C0FF");
    expect(colorScale(4)).toBeSameColorAs("#0000FFFF");
    expect(colorScale(5)).toBeSameColorAs("#0000FFFF");
  });

  test("Alpha channel is dropped when converting a color to a number", () => {
    expect(colorToNumber("#00000000")).toBe(0x000000);
    expect(colorToNumber("#12345678")).toBe(0x123456);
    expect(colorToNumber(0x123456)).toBe(0x123456);
  });
});
