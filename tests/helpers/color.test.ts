import { colorToRGBA, hslaToRGBA, rgbaToHex, rgbaToHSLA, toHex } from "../../src/helpers/color";
import { Color, HSLA, RGBA } from "../../src/types";

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
];

describe("toHex", () => {
  test.each(testColors)("toHex() %s", ({ input, hex }) => {
    expect(toHex(input)).toBe(hex);
  });

  test("toHex with rgba string representation", () => {
    expect(() => toHex("rgba(30, 80, 16, 0.2)")).toThrow();
  });
});

describe("colorToRGBA", () => {
  test.each(testColors)("basic functionality %s", ({ input, rgba }) => {
    expect(colorToRGBA(input)).toEqual(rgba);
  });
});

describe("rgbaToHex", () => {
  test.each(testColors)("basic functionality", ({ rgba, hex }) => {
    expect(rgbaToHex(rgba).toLowerCase()).toEqual(hex.toLowerCase());
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
